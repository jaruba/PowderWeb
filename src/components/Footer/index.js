/**
*
* Footer
*
*/

import React from 'react'
import Wrapper from './Wrapper'
import api from 'utils/api'
import isElectron from 'utils/electron'

window.donateLink = () => {
    if (isElectron()) {
		api.get({ method: 'donateLink' })
	} else {
		const win = window.open('https://powder.media/donate', '_blank')
		win.focus()
	}
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
