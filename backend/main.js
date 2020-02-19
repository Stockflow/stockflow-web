#!/usr/bin/env node

'use strict';

// Load environment
require('dotenv').config()

// Import libraries
import {existsSync, readFileSync, writeFileSync} from 'fs'
import {join} from 'path'
import AlphaVantage from 'alphavantage'
import jayson from 'jayson';
import cors from 'cors';
import bodyParser from 'body-parser';
import connect from 'connect';

// Constants
const AUTOCACHE_PATH = join(__dirname, 'alphavantage.cache')

// Initialize AlphaVantage API Client
const alpha = AlphaVantage({key: process.env.ALPHAVANTAGE})

// Cache to circumvent AlphaVantage API restrictions
class AutoCache {
  static cache = {}

  static tryInit() {
    if (Object.keys(AutoCache.cache).length === 0 && existsSync(AUTOCACHE_PATH)) {
      AutoCache.cache = JSON.parse(readFileSync(AUTOCACHE_PATH))
    }
  }

  static verifyArgs(args1, args2) {
    let valid = args1.length === args2.length
    for (const i of args1.keys()) {
      if (!valid) break
      valid &= args1[i] == args2[i]
    }
    if (!valid) console.log('[Cache] Detected invalid args')
    return valid
  }

  static retrieve(key, args) {
    console.log(`[Cache::FetchDry] ${key}`)
    AutoCache.tryInit()
    return key in AutoCache.cache && AutoCache.verifyArgs(args, AutoCache.cache[key].args) ? AutoCache.cache[key].data : null
  }

  static store(key, args, data) {
    console.log(`[Cache::Store] ${key}`)
    AutoCache.cache[key] = {args, data}
    writeFileSync(AUTOCACHE_PATH, JSON.stringify(AutoCache.cache))
    return data
  }

  static async _call(key, fn, ...args) {
    console.log(`[Cache::FetchWet] ${key}`)
    const raw_data = await fn(...args)
    return alpha.util.polish(raw_data)
  }

  static async call(key, fn, ...args) {
    return AutoCache.retrieve(key, args) || AutoCache.store(key, args, await AutoCache._call(key, fn, ...args))
  }
}

async function main() {
  console.log(await getDividendStatistics('O'))
}

class DividendProjector {
  static getTotalDividendAmount(data, timeframe_in_months) {
    return data.slice(1, timeframe_in_months + 1).reduce((acc, {dividend}) => acc + dividend, 0.00)
  }

  static getYearlyAverageDividendYield(data) {
    const valid_periods = data.slice(1).slice(0, 12 * 5) // five year averages
    const index_of_first_paid_period = valid_periods.findIndex(p => p.dividend > 0)
    const index_of_last_paid_period = valid_periods.length - 1 - [...valid_periods].reverse().findIndex(p => p.dividend > 0)
    const valid_periods_after_first_paid = valid_periods.slice(index_of_first_paid_period, index_of_last_paid_period)
    const period_rate = (valid_periods_after_first_paid[0].dividend / valid_periods_after_first_paid[valid_periods_after_first_paid.length - 1].dividend)
    const average_dividend_growth_per_year = period_rate ** (1.0 / (valid_periods_after_first_paid.length / 12.0))
    return average_dividend_growth_per_year
  }
}

async function getDividendStatistics(symbol) {
  const data = await getDividendPayments(symbol)
  const yearlyAverageDividendYield = DividendProjector.getYearlyAverageDividendYield(data.history)
  const yearlyAverageDividendYieldPercentage = 100 * (yearlyAverageDividendYield - 1.0)
  const totalDividendAmount12m = DividendProjector.getTotalDividendAmount(data.history, 12)
  const totalDividendAmount24m = DividendProjector.getTotalDividendAmount(data.history, 24)
  return {
    symbol: data.symbol,
    updated: data.updated,
    zone: data.zone,
    yearlyAverageDividendYield,
    yearlyAverageDividendYieldPercentage,
    totalDividendAmount12m,
    totalDividendAmount24m,
  }
}

async function getDividendPayments(symbol) {
  const res = await AutoCache.call('monthly_adjusted', alpha.data.monthly_adjusted, symbol)
  return {
    ...res.meta,
    history: Object.entries(res.data).map(([time, {dividend}]) => ({time, dividend: parseFloat(dividend)}))
  }
}

const ApiPaths = {
  Debug: {
    ping: 'ping',
  }
}

// Define JSON-RPC Server
const server = jayson.Server({

  //
  // Debug
  //

  [ApiPaths.Debug.ping]: function ping(args, cb) {
      cb(null, 'pong')
  },
})

// Configure server
const app = connect()
app.use(cors({methods: ['POST']}))
app.use(bodyParser.json())
app.use(server.middleware())

// Listen
app.listen(process.env.PORT, process.env.HOST, () => {
  console.log(`Listening on port ${process.env.PORT}.`)
})