import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import player from 'utils/player'
import modals from 'utils/modals'
import events from 'utils/events'
import isElectron from 'utils/electron'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      ace: false
    }
  }

  componentDidMount = () => {

    const ace = this.props.query.ace

    this.setState({ ace, update: Date.now() })
    document.querySelector('#aceOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#aceOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  togglePauseTorrent = async () => {
    const ace = this.state.ace
    if (ace) {
      if (ace.running) {
        api.get({ method: 'aceCancel', pid: ace.pid })
        this.close()
      }
    }
  }

  deleteTorrent() {
    const ace = this.state.ace
    if (ace) {
      api.get({ method: 'aceDestroy', pid: ace.pid })
      this.close()
    }
  }

  streamFiles() {
    const ace = this.state.ace
    if (ace) {
      window.open(api.parseUrl({ type: 'getaceplaylist.m3u', pid: ace.pid }), "_blank")
    }
    this.close()
  }

  runPlaylist = async () => {

    api.get({ method: 'runAcePlaylist', pid: this.state.ace.pid })

    this.close()

  }

  streamWebPlayer = async () => {

    const ace = this.state.ace

    if (ace) {
      modals.open('ace', { pid: ace.pid, shouldDo: 'web' })
    }

    this.close()

  }

  close() {
    document.getElementById("aceOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="aceOptsDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: this.state.ace && this.state.ace.running ? 'block' : 'none'}}
                  onClick={this.togglePauseTorrent.bind(this)}
                  className='playerButtons' >
              Pause Torrent
              </paper-button>

              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: window.isMaster ? 'block' : 'none'}}
                  onClick={this.runPlaylist.bind(this)}
                  className='playerButtons' >
              Run Playlist
              </paper-button>

              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: isElectron() ? 'none' : 'block'}}
                  onClick={this.streamFiles.bind(this)}
                  className='playerButtons' >
              Download Playlist
              </paper-button>

              <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                  <paper-button
                      raised
                      onClick={this.streamWebPlayer.bind(this)}
                      style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                      className='playerButtons' >
                  Stream with Web Player
                  </paper-button>
              </div>

              <paper-button
                  raised
                  onClick={this.deleteTorrent.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px'}}
                  className='playerButtons' >
              Delete Torrent & Data
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
