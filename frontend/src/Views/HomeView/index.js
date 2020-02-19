import React from 'react'
import styled from 'styled-components'

const HomeView = ({ className }) => {
  return (
    <div className={className}>
      <img className='logo' src={`${process.env.PUBLIC_URL}/logo.png`} />
    </div>
  )
}

const HomeViewS = styled(HomeView)`
display: flex;
flex-flow: column nowrap;

.logo {
  margin: 1rem auto;
  object-fit: scale-down;
  object-position: center center;
  min-width: 250px;
  width: 100%;
  max-width: 500px;
}
`

export default HomeViewS
