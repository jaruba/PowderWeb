import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

import events from 'utils/events'

const focusInput = (elem) => {
  const focus = () => {
    if (!document.getElementById(elem).focused)
      document.getElementById(elem).$.nativeInput.focus()
  }
  for (var i = 0; i <= 1000; i += 150)
    setTimeout(focus, i)
}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
    	navTitle: ''
    }
  }

  update = (obj) => {
  	if (obj && obj.title != this.state.navTitle)
	  	this.setState({
	  		navTitle: obj.title
	  	})
  }

  componentWillMount = () => {
	window.torrentDataPage = window.location.pathname.startsWith('/torrent')
  }

  componentDidMount = () => {
  	events.on('navTitle', this.update)
  }

  componentWillUnmount = () => {
  	events.off('navTitle', this.update)
  }

  render() {
    return (
        <span className={'headerText' + (window.torrentDataPage ? ' torrentDataHeaderText' : '')}>
        	{this.state.navTitle}
        </span>
    )
  }
}
