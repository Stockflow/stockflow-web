#!/usr/bin/env node

'use strict'

// Import libraries
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import AlphaVantage from 'alphavantage'
import jayson from 'jayson'
import cors from 'cors'
import bodyParser from 'body-parser'
import connect from 'connect'
import StockInfo from 'stock-info'

// Load environment
require('dotenv').config()

// Constants
const AUTOCACHE_PATH = join(__dirname, 'alphavantage.cache')

// Initialize AlphaVantage API Client
const alpha = AlphaVantage({ key: process.env.ALPHAVANTAGE })

// Cache to circumvent AlphaVantage API restrictions
class AutoCache {
  static tryInit () {
    if (
      Object.keys(AutoCache.cache).length === 0 &&
      existsSync(AUTOCACHE_PATH)
    ) {
      AutoCache.cache = JSON.parse(readFileSync(AUTOCACHE_PATH))
    }
  }

  static verifyArgs (args1, args2) {
    let valid = args1.length === args2.length
    if (!valid) console.log('[Cache] Parameter count mismatch')
    for (const i of args1.keys()) {
      if (!valid) break
      valid &= args1[i] === args2[i]
    }
    if (!valid) console.log('[Cache] Detected invalid args')
    return valid
  }

  static retrieve (key, args) {
    console.log(`[Cache::FetchDry] ${key}`)
    AutoCache.tryInit()
    return key in AutoCache.cache &&
      AutoCache.verifyArgs(args, AutoCache.cache[key].args)
      ? AutoCache.cache[key].data
      : null
  }

  static store (key, args, data) {
    console.log(`[Cache::Store] ${key}`)
    AutoCache.cache[key] = { args, data }
    writeFileSync(AUTOCACHE_PATH, JSON.stringify(AutoCache.cache))
    return data
  }

  static async _call (key, fn, ...args) {
    console.log(`[Cache::FetchWet] ${key}`)
    const rawData = await fn(...args)
    return alpha.util.polish(rawData)
  }

  static async call (key, fn, ...args) {
    const newKey = `${key}<${JSON.stringify(args)}>`
    return (
      AutoCache.retrieve(newKey, args) ||
      AutoCache.store(newKey, args, await AutoCache._call(newKey, fn, ...args))
    )
  }
}
AutoCache.cache = {}

class DividendProjector {
  static getTotalDividendAmount (data, timeframeInMonths) {
    return data
      .slice(1, timeframeInMonths + 1)
      .reduce((acc, { dividend }) => acc + dividend, 0.0)
  }

  static getYearlyAverageDividendYield (data) {
    const validPeriods = data.slice(1).slice(0, 12 * 5) // five year averages
    const indexOfFirstPaidPeriod = validPeriods.findIndex(
      p => p.dividend > 0
    )
    const indexOfLastPaidPeriod =
      validPeriods.length -
      1 -
      [...validPeriods].reverse().findIndex(p => p.dividend > 0)
    const validPeriodsAfterFirstPaid = validPeriods.slice(
      indexOfFirstPaidPeriod,
      indexOfLastPaidPeriod
    )
    const periodRate =
      validPeriodsAfterFirstPaid[0].dividend /
      validPeriodsAfterFirstPaid[validPeriodsAfterFirstPaid.length - 1]
        .dividend
    const averageDividendGrowthPerYear =
      periodRate ** (1.0 / (validPeriodsAfterFirstPaid.length / 12.0))
    return averageDividendGrowthPerYear
  }
}

async function getDividendStatistics (symbol) {
  const data = await getDividendPayments(symbol)
  const yearlyAverageDividendYield = DividendProjector.getYearlyAverageDividendYield(
    data.history
  )
  const yearlyAverageDividendYieldPercentage =
    100 * (yearlyAverageDividendYield - 1.0)
  const totalDividendAmount12m = DividendProjector.getTotalDividendAmount(
    data.history,
    12
  )
  const totalDividendAmount24m = DividendProjector.getTotalDividendAmount(
    data.history,
    24
  )
  return {
    symbol: data.symbol,
    updated: data.updated,
    zone: data.zone,
    yearlyAverageDividendYield,
    yearlyAverageDividendYieldPercentage,
    totalDividendAmount12m,
    totalDividendAmount24m
  }
}

async function getDividendPayments (symbol) {
  const res = await AutoCache.call(
    'monthly_adjusted',
    alpha.data.monthly_adjusted,
    symbol
  )
  return {
    ...res.meta,
    history: Object.entries(res.data).map(([time, { dividend }]) => ({
      time,
      dividend: parseFloat(dividend)
    }))
  }
}

// Easy chaining of complex async operations
class ComplexOperation {
  constructor (context) {
    this.chain = []
    this.context = context
  }

  static init (context = {}) {
    return new ComplexOperation(context)
  }

  next ({ fn, errorCode }) {
    this.chain.push({ fn, errorCode })
    return this
  }

  middleware (fn) {
    return this.next(fn())
  }

  assert ({ fn, errorCode }) {
    const condFn = context => {
      return new Promise((resolve, reject) => {
        if (fn(context)) {
          resolve({})
        } else {
          reject(new Error('Assertion failed.'))
        }
      })
    }
    return this.next({ fn: condFn, errorCode })
  }

  async evaluate ({ success, error }) {
    for (const { fn, errorCode } of this.chain) {
      try {
        this.context = {
          ...this.context,
          ...(await fn(this.context))
        }
      } catch (e) {
        console.log('ERROR')
        console.log({ code: errorCode, data: e })
        error({
          code: errorCode,
          message: 'Error',
          data: e
        })
        return
      }
    }
    console.log(this.context)
    success(this.context)
  }
}

class StockInfoClient {
  static async getStockInformation (symbol) {
    return new Promise((resolve, reject) => {
      AutoCache.call('stockinfo__getsinglestockinfo', StockInfo.getSingleStockInfo, symbol).then(resolve).catch(reject)
    })
  }
}

const ApiPaths = {
  Debug: {
    ping: 'ping'
  },
  Data: {
    Dividends: 'get_data_dividends',
    StockInfo: 'get_stock_info'
  }
}

// Define JSON-RPC Server
const server = jayson.Server({
  //
  // Debug
  //

  [ApiPaths.Debug.ping]: function ping (args, cb) {
    cb(null, 'pong')
  },

  [ApiPaths.Data.StockInfo]: function getStockInfo (args, cb) {
    const error = { code: 1, message: 'Unable to fetch stock information.' }
    StockInfoClient.getStockInformation(args.symbol).then(res => cb(null, res)).catch(() => cb(error))
  }
})

// Configure server
const app = connect()
app.use(cors({ methods: ['GET', 'POST'] }))
app.use(bodyParser.json())
app.use(server.middleware())

// Listen
app.listen(process.env.PORT, process.env.HOST, () => {
  console.log(`Listening on port ${process.env.PORT}.`)
})
