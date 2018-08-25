import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import events from 'utils/events'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      message: ''
    }
  }

  componentDidMount = () => {
    events.on('embedLoadingMsg', (msg) => {
      this.setState({
        message: msg
      })
    })
  }

  componentWillUnmount = () => {

  }

  cancelLoadingDialog() {

  }

  closingLoadingDialog() {

  }

  render() {
    return (

        <paper-dialog
            id="embedLoadingDialog"
            on-iron-overlay-closed={this.closingLoadingDialog.bind(this)}
            style={{display: 'none', margin: '0', width: '440px', textAlign: 'left', borderRadius: '3px', width: '100%', maxWidth: '100%', height: '100%', maxhHeight: '100%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
              <div id="main-baller" />
              <div className='ball-one' />
              <div className='ball-two' />
              <div className='ball-three' />
            </div>
            <div style={{ marginTop: '50px', marginBottom: '0px', top: '50%', position: 'absolute', left: '50%', transform: 'translate(-50%,-50%)'}}>
              {this.state.message && this.state.message.length ? this.state.message : 'Loading Torrent ...'}
            </div>
        </paper-dialog>
    )
  }
}
