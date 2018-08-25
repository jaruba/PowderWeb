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
    this.setState({ message: 'Acestream not installed', pid, showDownload: false })
  }

  downloadAce = async () => {
    this.setState({ message: 'Starting Download', showDownload: false })
    api.get({ method: 'aceDownload' })
    const checkMsg = async () => {
      const checkResp = await api.get({ method: 'aceDownloadMsg', json: true})
      if (checkResp && checkResp.msg) {
        this.setState({ message: checkResp.msg })
        if (checkResp.msg == 'Finished!') {
          this.closingDialog()
          modals.open('aceChoice', { pid: this.state.pid })
          return
        }
      }
      dataTimer = setTimeout(checkMsg, 2000)
    }
    dataTimer = setTimeout(checkMsg, 2000)
  }

  componentDidMount = async () => {
    document.querySelector('#aceInstallDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
    const parsed = await api.get({ method: 'haveAce', json: true })
    if (!parsed || !parsed.hasAcestream) {
      const isLinux = !!(jackettLinkAnchor() == 'installation-on-linux')
      this.setState({ message: isLinux ? 'Acestream not installed, use "sudo snap install acestreamplayer" in your terminal then try again.' : 'Acestream not installed, press the install button to start the install process.', showDownload: !isLinux })
    } else {
      this.setState({ message: 'Acestream already installed', showDownload: false })
    }
  }

  componentWillUnmount = () => {

    document.querySelector('#aceInstallDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

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
    document.getElementById("aceInstallDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="aceInstallDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                {this.state.message}
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: this.state.showDownload ? 'block' : 'none'}}>
                <paper-button
                    raised
                    onClick={this.downloadAce.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Install Acestream
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
