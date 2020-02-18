#!/usr/bin/env node
require('dotenv').config()
import AlphaVantage from 'alphavantage'

const alpha = AlphaVantage({key: process.env.ALPHAVANTAGE})

async function main() {
  console.log(await getDividendPayments('O'))
  console.log(await getProjectedYearlyDividendYield('O'));
}

async function getProjectedYearlyDividendYield(symbol) {
  const d = await getDividendPayments(symbol);
  const pdy = (
    d
    .filter(o => parseFloat(o.dividend) > 0)
    .slice(0, 12)
    .reduce((acc, div) => acc + parseFloat(div), 0.00)
   ) / 12.0;
  return pdy;
}

async function getDividendPayments(symbol) {
  const ma = await alpha.data.monthly_adjusted(symbol)
  const pma = alpha.util.polish(ma)
  console.log(pma.meta);
  const divs = Object.entries(pma.data).map(([time, {dividend}]) => ({symbol: pma.meta.symbol, time, dividend}))
  return divs
}

main()
