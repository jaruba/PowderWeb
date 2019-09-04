import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import { healToken, checkToken } from 'utils/auth'
import api from 'utils/api'
import modals from 'utils/modals'
import player from 'utils/player'

let dataTimer

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      message: '',
      pid: '',
      shouldDo: null
    }
  }

  componentWillMount = () => {
    this.setState({ message: 'Starting Download' })
  }

  componentDidMount = async () => {
    const pid = this.props.query.pid
    this.setState(this.props.query)

    document.querySelector('#aceDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

    const attemptResp = await api.get({ method: 'ace', torrent: pid, json: true}, (err) => {
      if (err)
        this.setState({ message: err })
    })

    if (attemptResp && attemptResp.hasAcestream == true) {
      const checkMsg = async () => {
        const checkResp = await api.get({ method: 'aceMsg', torrent: pid, json: true})
        if (checkResp && checkResp.status) {
          this.setState({ message: checkResp.status })
          if (this.state.shouldDo == 'web') {
            if (checkResp.transcodeLink) {
              console.log('Transcode Link: ' + checkResp.transcodeLink)
              modals.close()
              player.modal.openLive(checkResp.transcodeLink, checkResp.name)
              return
            }
          } else if (this.state.shouldDo == 'playlist') {
            if (checkResp.directLink) {
              console.log('Direct Link: ' + checkResp.directLink)
              modals.close()
              window.open(api.parseUrl({ type: 'getaceplaylist.m3u', pid }), "_blank")
              return
            }
          }
        }
        if (!this.state.directLink || !this.state.transcodeLink) {
          dataTimer = setTimeout(checkMsg, 2000)
        } else {
          dataTimer = null
        }
      }

      dataTimer = setTimeout(checkMsg, 2000)

    } else {
      // acestream not installed, prompt for install
    }
  }

  componentWillUnmount = () => {

    document.querySelector('#aceDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

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
    document.getElementById("aceDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="aceDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                {this.state.message}
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
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
