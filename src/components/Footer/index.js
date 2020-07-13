/**
*
* Footer
*
*/

import React from 'react'
import Wrapper from './Wrapper'
import api from 'utils/api'

window.donateLink = () => {
	api.get({ method: 'donateLink' })
}

function Footer () {
  return (
    <Wrapper className="nodragwindow footerContent">
      <div><a className="donateButton" href="#" onClick={window.donateLink.bind()}>Donate</a></div>
      <div>Powder Web v0.9.0</div>
    </Wrapper>
  )
}

export default Footer
