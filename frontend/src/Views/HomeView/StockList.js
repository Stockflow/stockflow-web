import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import Stock from './Stock'

class StockManager {
  static load () {
    StockManager.notifyCallback = null
    StockManager.stocks = []
    StockManager.deserialize()
  }

  static serialize () {
    window.localStorage.setItem('stocks', JSON.stringify(StockManager.stocks))
  }

  static deserialize () {
    if (!window.localStorage.getItem('stocks')) return
    StockManager.stocks = JSON.parse(window.localStorage.getItem('stocks'))
  }

  static add (symbol, shares) {
    StockManager.stocks.push({ symbol, shares })
    StockManager.serialize()
    StockManager.notifyChange()
  }

  static notifyChange () {
    if (!StockManager.notifyCallback) return
    StockManager.notifyCallback(StockManager.stocks)
  }

  static onNotify (cb) {
    StockManager.notifyCallback = stocks => cb(stocks)
  }

  static list () {
    return StockManager.stocks
  }
}

StockManager.load()

const StockList = ({ className }) => {
  const [positions, setPositions] = useState(StockManager.list())
  const [showPopup, setShowPopup] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [newShares, setNewShares] = useState('')

  useEffect(() => {
    StockManager.onNotify((stocks) => {
      setPositions(stocks)
    })
  })

  const addPosition = () => {
    StockManager.add(newSymbol, newShares)
    setPositions(StockManager.list())
    setShowPopup(false)
    setNewSymbol('')
    setNewShares('')
  }

  return (
    <div className={className}>
      {showPopup && (
        <div className='popup-wrapper'>
          <div className='popup'>
            <div className='title'>New Position</div>
            <input onChange={(e) => setNewSymbol(e.target.value)} value={newSymbol} type='text' placeholder='Symbol' />
            <input onChange={(e) => setNewShares(e.target.value)} value={newShares} type='text' placeholder='Shares' pattern='[0-9]+' />
            <div className='btn-wrapper'>
              <div
                className='btn' onClick={() => {
                  setShowPopup(false)
                  setNewSymbol('')
                  setNewShares('')
                }}
              >Cancel
              </div>
              <div className='btn' onClick={() => addPosition()}>Add</div>
            </div>
          </div>
        </div>
      )}
      {positions.length > 0 && (
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
            {positions.map(({ symbol, shares }) => (
              <Stock key={symbol} symbol={symbol} shares={shares} />
            ))}
          </tbody>
        </table>
      )}
      <div className='btn' onClick={() => setShowPopup(true)}>New Position</div>
    </div>
  )
}

const StockListS = styled(StockList)`
position: relative;
display: flex;
flex-flow: column nowrap;

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

.popup-wrapper {
  top: 4rem;
  position: absolute;
  z-index: 100;
  width: 100%;
}

.popup {
  display: flex;
  flex-flow: column;
  padding: 2rem;
  background: hsla(0,0%,100%,.95);
  border: 2px solid hsl(0,0%,90%);
  border-radius: .3rem;
  width: 75%;
  min-width: 350px;
  margin: 0 auto;
  box-shadow:  .5rem .5rem 2rem #ededed, -.5rem -.5rem 2rem #ffffff;

  *:not(:last-child) {
    margin-bottom: 1rem;
  }

  .title {
    font-size: 1.5rem;
    color: hsl(0,0%,45%);
    user-select: none;
  }

  input {
    padding: .5rem;
    border: 1px solid hsl(0,0%,75%);
    border-radius: .3rem;
  }
}

.btn {
  background: hsl(185,45%,55%);
  color: white;
  text-shadow: 0 0 .25rem hsla(185,90%,10%,.5);
  padding: .5rem 1rem;
  text-align: center;
  border-radius: .3rem;
  margin-left: auto;
  cursor: pointer;
  user-select: none;
}

.btn-wrapper {
  margin-left: auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;

  .btn {
    margin: 0;
  }

  .btn:not(:last-child) {
    margin-right: 1rem;
  }
}
`

export default StockListS
