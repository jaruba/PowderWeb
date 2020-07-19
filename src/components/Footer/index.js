/**
*
* Footer
*
*/

import React from 'react'
import Wrapper from './Wrapper'
import api from 'utils/api'
import isElectron from 'utils/electron'

window.footerDonateLink = () => {
  if (isElectron()) {
		api.get({ method: 'donateLink' })
	} else {
		const win = window.open('https://powder.media/donate', '_blank')
		win.focus()
	}
}

window.footerHomeLink = () => {
  if (isElectron()) {
    api.get({ method: 'homeLink' })
  } else {
    const win = window.open('https://web.powder.media/', '_blank')
    win.focus()
  }
}

function Footer () {
  return (
    <Wrapper className="nodragwindow footerContent">
      <div><a className="donateButton" href="#" onClick={window.footerDonateLink.bind()}>Donate</a></div>
      <div><span id="footerHomeButton" onClick={window.footerHomeLink.bind()}>Powder Web</span> v0.9.0</div>
    </Wrapper>
  )
}

export default Footer
