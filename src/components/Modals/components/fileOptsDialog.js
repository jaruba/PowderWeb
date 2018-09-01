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
      file: false,
      torrent: false
    }
  }

  componentDidMount = () => {

    this.setState(Object.assign({ update: Date.now() }, this.props.query))
    document.querySelector('#fileOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#fileOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  streamFile() {
    const pattern = { type: 'getplaylist.m3u', id: this.state.torrent.infoHash, fileID: this.state.file.id, update: Date.now() }
    if (window.isMaster) {
      pattern.openNow = true
      api.get(pattern)
    } else {
      window.open(api.parseUrl(pattern), "_blank")
    }
    this.close()
  }

  downloadFile() {
    window.open(api.parseUrl({ type: 'api/' + this.state.torrent.infoHash + '/' + this.state.file.name }), "_blank")
    this.close()
  }

  openFile() {
    api.get({ method: 'exec', infoHash: this.state.torrent.infoHash, id: this.state.file.id })
    this.close()
  }

  openFileLocation() {
    api.get({ method: 'fileLoc', infoHash: this.state.torrent.infoHash, id: this.state.file.id })
    this.close()
  }

  toggleStateFile() {
    api.get({ method: 'toggleStateFile', infoHash: this.state.torrent.infoHash, id: this.state.file.id })
    this.close()
  }

  openPlayer() {
    player.modal.open(this.state.torrent, this.state.file)
  }

  findSubs() {
    modals.open('loading')

    let isCanceled = false
    const hasCanceled = () => {
      events.off('canceledLoading', hasCanceled)
      isCanceled = true
    }
    events.on('canceledLoading', hasCanceled)

    api.findSubs(this.state.torrent, this.state.file, (subs) => {
      if (isCanceled)
        return

      if (subs && subs.length) {
        modals.open('subtitleList', { subs: subs, filename: this.state.file.name })
      } else {
        modals.open('message', { message: 'Could not find subtitles for this video.' })
      }
    })
  }

  close() {
    document.getElementById("fileOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="fileOptsDialog"
            class="modalScroll"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
              <paper-button
                  raised
                  onClick={this.streamFile.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  className='playerButtons' >
              Stream File
              </paper-button>

              <paper-button
                  raised
                  onClick={this.openPlayer.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  className='playerButtons' >
              Stream File in Browser
              </paper-button>

              <paper-button
                  raised
                  onClick={this.downloadFile.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: isElectron() ? 'none' : 'block'}}
                  className='playerButtons' >
              Download File with Browser
              </paper-button>

              <paper-button
                  raised
                  onClick={this.findSubs.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  className='playerButtons' >
              Find Subtitles
              </paper-button>

              <paper-button
                  raised
                  onClick={this.openFile.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: window.isMaster ? 'block' : 'none', fontSize: '16px'}}
                  className='playerButtons' >
              Open File
              </paper-button>

              <paper-button
                  raised
                  onClick={this.openFileLocation.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: window.isMaster ? 'block' : 'none', fontSize: '16px'}}
                  className='playerButtons' >
              Open File Location
              </paper-button>

              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: this.state.file && this.state.file.progress >= 100 ? 'none' : 'block'}}
                  onClick={this.toggleStateFile.bind(this)}
                  className='playerButtons' >
              {this.state.file && this.state.file.selected ? 'Pause' : 'Start'} File Download
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
