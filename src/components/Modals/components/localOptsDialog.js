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
      local: false
    }
  }

  componentDidMount = () => {

    const loc = this.props.query.loc

    this.setState({ local: loc, update: Date.now() })
    document.querySelector('#localOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#localOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  deleteTorrent() {
    const loc = this.state.local
    if (loc) {
      api.get({ method: 'locDestroy', pid: loc.pid })
      this.close()
    }
  }

  streamFiles() {
    const loc = this.state.local
    if (loc) {
      api.get({ method: 'locUpdateTime', pid: loc.pid })
      window.open(api.parseUrl({ type: 'getlocalplaylist.m3u', pid: loc.pid }), "_blank")
    }
    this.close()
  }

  renameChannel() {

    getValueString('New Name:', '', '[^]', 10000, (newValue, cb) => {
      api.get({ method: 'locRename', pid: this.state.local.pid, name: newValue })
      cb()
    })

  }

  runPlaylist = async () => {

    api.get({ method: 'locUpdateTime', pid: this.state.local.pid })

    api.get({ method: 'runLocalPlaylist', pid: this.state.local.pid })

    this.close()

  }

  openFolder = () => {
    api.get({ method: 'localDirLoc', pid: this.state.local.pid })
    this.close()
  }

  openFileLoc = () => {
    api.get({ method: 'localFileLoc', pid: this.state.local.pid })
    this.close()
  }

  streamWebPlayer = async () => {

    const loc = this.state.local

    if (loc) {

      api.get({ method: 'locUpdateTime', pid: loc.pid })

      let flLoc

      if (loc.files && loc.files.length) {
        flLoc = loc.files[0]
      } else {
        flLoc = { id: 0, name: loc.name }
        loc.files = [flLoc]
      }

      player.modal.open(loc, flLoc, 0, true, null, null, true)

    }

    this.close()

  }

  close() {
    document.getElementById("localOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="localOptsDialog"
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
                  onClick={this.openFolder.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: window.isMaster && this.state.local && this.state.local.isDirectory ? 'block' : 'none', fontSize: '16px'}}
                  className='playerButtons' >
              Open Folder
              </paper-button>

              <paper-button
                  raised
                  onClick={this.openFileLoc.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: window.isMaster && this.state.local && this.state.local.isFile ? 'block' : 'none', fontSize: '16px'}}
                  className='playerButtons' >
              Show File in Folder
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
