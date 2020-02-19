import React, { useState, useEffect } from 'react'
import styled from 'styled-components'

const currencyFormat = val => {
  const rev = Array.from(val.toString()).reverse()
  let buf = ''
  for (let i = 0; i < rev.length; i++) {
    buf += rev[i]
    if ((i + 1) < rev.length && (i + 1) % 3 === 0) {
      buf += ','
    }
  }
  return Array.from(buf).reverse().join('')
}

const Stock = ({ className, symbol, shares }) => {
  const [stockInfo, setStockInfo] = useState(null)

  useEffect(() => {
    if (stockInfo !== null) return
    window.fetch('http://localhost:6060', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'get_stock_info',
        params: {
          symbol
        },
        id: 1
      })
    }).then(res => res.json())
      .then(res => {
        setStockInfo(res.result)
      })
      .catch(console.log)
  })

  console.log(stockInfo)

  return (
    <tr data-loading={stockInfo === null} className={className}>
      {!stockInfo && (
        <td className='loading-indicator'>
          <div className='dot' />
          <div className='dot' />
          <div className='dot' />
        </td>
      )}
      {stockInfo && <td className='symbol'>{symbol}</td>}
      {stockInfo && <td className='name'>{stockInfo.shortName || stockInfo.longName}</td>}
      {stockInfo && <td className='marketcap'>{'marketCap' in stockInfo ? `$ ${currencyFormat(stockInfo.marketCap)}` : '-'}</td>}
      {stockInfo && <td className='shares'>{shares}</td>}
      {stockInfo && 'regularMarketPrice' in stockInfo &&
        <td className='price'>
          {stockInfo.regularMarketPrice.toFixed(2)}&nbsp;
          <span className='change' data-positive={stockInfo.regularMarketChangePercent > 0}>
            {`${stockInfo.regularMarketChangePercent > 0 ? '+' : ''}${stockInfo.regularMarketChangePercent.toFixed(2)}`}%
          </span>
        </td>}
      {stockInfo && !('regularMarketPrice' in stockInfo) &&
        <td className='price'>
          -
        </td>}
      {stockInfo && <td className='holdings'>$ {(stockInfo.regularMarketPrice * shares).toFixed(2)}</td>}
    </tr>
  )
}

const StockS = styled(Stock)`
border-radius: .5rem;
background: white;
box-shadow:  .5rem .5rem 2rem #ededed, -.5rem -.5rem 2rem #ffffff;
padding: 2rem;
width: 100%;
white-space: nowrap;

&:not(:last-child) {
  margin-bottom: 1rem;
}

.loading-indicator {
  height: 32px;
  @keyframes loading {
    0% { transform: translateY(0) scale(.9); box-shadow: 0 .25rem .33rem hsla(0,0%,0%,.33); }
    50% { transform: translateY(-1rem) scale(1); box-shadow: 0 .75rem .5rem hsla(0,0%,0%,.1); }
    100% { transform: translateY(0) scale(.9); box-shadow: 0 .25rem .33rem hsla(0,0%,0%,.33); }
  }
  .dot {
    margin-top: .5rem;
    margin-bottom: -.5rem;
    width: 8px;
    height: 8px;
    border-radius: 99rem;
    &:nth-child(1) {
      animation: loading 1s 0s infinite ease-in-out;
      background: hsl(0,0%,75%);
    }
    &:nth-child(2) {
      animation: loading 1s .33s infinite ease-in-out;
      background: hsl(0,0%,50%);
    }
    &:nth-child(3) {
      animation: loading 1s .66s infinite ease-in-out;
      background: hsl(0,0%,25%);
    }
  }
}

.symbol {
  font-size: 1.25rem;
  color: hsl(0,0%,45%);
  width: 100%;
}

.name {
  width: 1px;
}

.marketcap {
  width: 1px;
}

.shares {
  width: 1px;
}

.price {
  font-family: monospace;
  .change {
    &[data-positive=true] {
      color: hsl(150,45%,45%);
    }
    &[data-positive=false] {
      color: hsl(0,45%,45%);
    }
  }
}
`

export default StockS
