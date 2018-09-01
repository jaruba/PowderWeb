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
      sop: false
    }
  }

  componentDidMount = () => {

    const sop = this.props.query.sop

    this.setState({ sop, update: Date.now() })
    document.querySelector('#sopOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#sopOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  togglePauseTorrent = async () => {
    const sop = this.state.sop
    if (sop) {
      if (sop.running) {
        api.get({ method: 'sopCancel', pid: sop.pid })
        this.close()
      }
    }
  }

  deleteTorrent() {
    const sop = this.state.sop
    if (sop) {
      api.get({ method: 'sopDestroy', pid: sop.pid })
      this.close()
    }
  }

  streamFiles() {
    const sop = this.state.sop
    if (sop) {
      window.open(api.parseUrl({ type: 'getsopplaylist.m3u', pid: sop.pid }), "_blank")
    }
    this.close()
  }

  runPlaylist = async () => {

    api.get({ method: 'runSopPlaylist', pid: this.state.sop.pid })

    this.close()

  }

  renameChannel() {

    getValueString('New Channel Name:', '', '[^]', 10000, (newValue, cb) => {
      api.get({ method: 'sopRename', pid: this.state.sop.pid, name: newValue })
      cb()
    })
  }

  streamWebPlayer = async () => {

    const sop = this.state.sop

    if (sop) {
      modals.open('sop', { pid: sop.pid, shouldDo: 'web' })
    }

    this.close()

  }

  close() {
    document.getElementById("sopOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="sopOptsDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: this.state.sop && this.state.sop.running ? 'block' : 'none'}}
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
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.renameChannel.bind(this)}
                  className='playerButtons' >
              Rename Channel
              </paper-button>

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
