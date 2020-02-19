import React from 'react'
import styled from 'styled-components'
import Stock from './Stock'

const stonks = [
  { symbol: 'ACB', shares: 15 },
  { symbol: 'O', shares: 6 },
  { symbol: 'KO', shares: 6 },
  { symbol: 'CL', shares: 3 },
  { symbol: 'VPPNY', shares: 4 }
]

const StockList = ({ className }) => {
  return (
    <div className={className}>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Market Cap</th>
            <th>Shares</th>
            <th>Price</th>
            <th>Holdings</th>
          </tr>
        </thead>
        <tbody>
          {stonks.map(({ symbol, shares }) => (
            <Stock key={symbol} symbol={symbol} shares={shares} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const StockListS = styled(StockList)`
display: flex;

table {
  width: 100%;
  border-collapse: inherit;
  border-spacing: 0 1rem;
  table-layout: auto;
  text-align: left;

  th {
    padding: 0 1rem;
  }

  td {
    padding: 1rem;
  }
}
`

export default StockListS
