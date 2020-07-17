import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import { healToken, checkToken } from 'utils/auth'
import api from 'utils/api'
import modals from 'utils/modals'
import player from 'utils/player'
import { jackettLinkAnchor } from 'utils/misc'
import isElectron from 'utils/electron'

let dataTimer

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      message: '',
      pid: '',
      showDownload: false
    }
  }

  componentWillMount = () => {
    const pid = this.props.query.pid
    this.setState({ message: 'Sopcast not installed', pid, showDownload: false })
  }

  downloadSop = async () => {
    this.setState({ message: 'Starting Download', showDownload: false })
    api.get({ method: 'sopDownload' })
    const checkMsg = async () => {
      const checkResp = await api.get({ method: 'sopDownloadMsg', json: true })
      if (checkResp && checkResp.msg) {
        this.setState({ message: checkResp.msg })
        if (checkResp.msg == 'Finished!') {
          this.closingDialog()
          modals.open('sopChoice', { pid: this.state.pid })
          return
        }
      }
      dataTimer = setTimeout(checkMsg, 2000)
    }
    dataTimer = setTimeout(checkMsg, 2000)
  }

  componentDidMount = async () => {
    document.querySelector('#sopInstallDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
    const parsed = await api.get({ method: 'haveSop', json: true })
    if (!parsed || !parsed.hasSopcast) {
      const isWin = !!(jackettLinkAnchor() == 'installation-on-windows')
      const isLinux = !!(jackettLinkAnchor() == 'installation-on-linux')
      this.setState({ message: isWin || isLinux ? 'Sopcast not installed, follow <span class="whiteLink" onClick="window.externalSopGuide()">our guide</span> in order to install it.' : 'Sopcast not installed, press the install button to start the install process.', showDownload: (!isWin && !isLinux) })
    } else {
      this.setState({ message: 'Sopcast already installed', showDownload: false })
    }
    window.externalSopGuide = () => {
      if (isElectron()) {
        api.get({ method: 'sopGuideLink' })
      } else {
        const win = window.open('https://github.com/jaruba/PowderWeb/wiki/Enable-Sopcast', '_blank')
        win.focus()
      }
    }
  }

  componentWillUnmount = () => {

    document.querySelector('#sopInstallDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    if (dataTimer) {
      clearTimeout(dataTimer)
      dataTimer = false
    }
    setTimeout(() => {
        modals.close()
    })
  }

  closeMessage() {
    document.getElementById("sopInstallDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="sopInstallDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                <span dangerouslySetInnerHTML={{__html: this.state.message}} />
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: this.state.showDownload ? 'block' : 'none'}}>
                <paper-button
                    raised
                    onClick={this.downloadSop.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Install Sopcast
                </paper-button>
            </div>

            <div style={{marginBottom: '0', display: 'block'}}>
                <paper-button
                    raised
                    onClick={this.closeMessage.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
