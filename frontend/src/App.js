import React from 'react'
import styled from 'styled-components'
import HomeView from './Views/HomeView'

function App ({ className }) {
  return (
    <div className={className}>
      <HomeView />
    </div>
  )
}

export default styled(App)`
width: min(90vw, 1200px);
margin: 0 auto;
`
