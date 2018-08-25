import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import player from 'utils/player'
import modals from 'utils/modals'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      url: '',
      qrCode: '',
      type: 'local'
    }
  }

  componentDidMount = async () => {

    this.setType('local')

    document.querySelector('#qrcodeDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#qrcodeDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  refreshDialogPosition() {
    const myDialog = document.getElementById("qrcodeDialog")
    if (myDialog) {
      if (myDialog._boundNotifyResize) {
        myDialog._boundNotifyResize()
      } else if (myDialog.resizeHandler) {
        myDialog.resizeHandler()
      } else if (myDialog.repositionTarget) {
        myDialog.repositionTarget()
      }
    }
  }

  setType = async (qrType) => {
    const qrResp = await api.get({ method: 'qrCode', qrType, json: true })

    if (qrResp && qrResp.url) {
      qrResp.type = qrType
      this.setState(qrResp)
      setTimeout(() => {
        this.refreshDialogPosition()
      })
    }
  }

  copyLink() {

    var copyText = document.getElementById("qrLinkCopy")

    copyText.select()

    document.execCommand("copy")

    copyText.blur()

  }

  close() {
    document.getElementById("qrcodeDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="qrcodeDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>

              <div style={{opacity: '0', width: '0', height: '0'}}>
                <input id="qrLinkCopy" type="text" value={this.state.url}/>
              </div>

              <div style={{margin: '0', marginBottom: '15px', fontSize: '16px'}}>
                Connect other devices to this engine.
              </div>

              <div style={{margin: '0', marginBottom: '15px', fontSize: '16px', display: this.state.url ? 'block' : 'none' }}>
                Use this link in your browser:
              </div>

              <div style={{margin: '0', marginBottom: '15px', fontSize: '16px', display: this.state.url ? 'block' : 'none', backgroundColor: 'rgba(0,0,0,0.2)', padding: '9px', wordWrap: 'break-word' }}>
                {this.state.url}
              </div>

              <div style={{margin: '0', marginBottom: '15px', fontSize: '16px', display: this.state.url ? 'block' : 'none' }}>
                Or scan this QR Code:
              </div>

              <div style={{margin: '0', marginBottom: '20px', fontSize: '16px', display: this.state.url ? 'block' : 'none' }}>
                <img src={this.state.qrCode} style={{ maxWidth: '100%' }} />
              </div>

              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.copyLink.bind(this)}
                  className='playerButtons' >
              Copy Link to Clipboard
              </paper-button>
              
              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.setType.bind(this, this.state.type == 'local' ? 'internet' : 'local')}
                  className='playerButtons' >
              {'Use '+(this.state.type == 'local' ? 'Internet' : 'Local')+' IP'}
              </paper-button>
              
              <paper-button
                  raised
                  onClick={this.close.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px'}}
                  className='playerButtons' >
              Close
              </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
