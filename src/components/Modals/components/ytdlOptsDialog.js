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


const getValueString = (label, oldValue, allowRule, maxLength, cb) => {

  const receiveValue = (value) => {
    cb(value, () => {
      events.off('inputDialogValue', receiveValue)
      events.off('inputDialogClose', closing)
    })
  }

  const closing = () => {
    events.off('inputDialogValue', receiveValue)
    events.off('inputDialogClose', closing)
  }

  events.on('inputDialogValue', receiveValue)

  events.on('inputDialogClose', closing)

  modals.open('input', { label, default: oldValue, allowRule, maxLength, oldScroll: 0 })

}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      ytdl: false
    }
  }

  componentDidMount = () => {

    const ytdl = this.props.query.ytdl

    this.setState({ ytdl, update: Date.now() })
    document.querySelector('#ytdlOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#ytdlOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  deleteTorrent() {
    const ytdl = this.state.ytdl
    if (ytdl) {
      api.get({ method: 'ytdlDestroy', pid: ytdl.pid })
      this.close()
    }
  }

  streamFiles() {
    const ytdl = this.state.ytdl
    if (ytdl) {
      api.get({ method: 'ytdlUpdateTime', pid: ytdl.pid })
      window.open(api.parseUrl({ type: 'getytdlplaylist.m3u', pid: ytdl.pid }), "_blank")
    }
    this.close()
  }

  renameChannel() {

    getValueString('New Name:', '', '[^]', 10000, (newValue, cb) => {
      api.get({ method: 'ytdlRename', pid: this.state.ytdl.pid, name: newValue })
      cb()
    })

  }

  runPlaylist = async () => {

    api.get({ method: 'ytdlUpdateTime', pid: this.state.ytdl.pid })

    api.get({ method: 'runYtdlPlaylist', pid: this.state.ytdl.pid })

    this.close()

  }

  streamWebPlayer = async () => {

    const ytdl = this.state.ytdl

    if (ytdl && ytdl.extracted) {

      api.get({ method: 'ytdlUpdateTime', pid: ytdl.pid })

      player.modal.open(ytdl, { id: 0, name: ytdl.name, streamable: true }, 0, true, null, null, null, true)

    }

    this.close()

  }

  close() {
    document.getElementById("ytdlOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="ytdlOptsDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
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
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.renameChannel.bind(this)}
                  className='playerButtons' >
              Rename
              </paper-button>

              <paper-button
                  raised
                  onClick={this.deleteTorrent.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px'}}
                  className='playerButtons' >
              Remove From List
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
