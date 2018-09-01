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
      torrent: false,
      pulsing: false,
      forced: false
    }
  }

  componentDidMount = () => {

    const torrent = this.props.query.torrent

    this.setState({ torrent, pulsing: torrent.pulsing, forced: torrent.forced, update: Date.now() })
    document.querySelector('#torrentOptsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#torrentOptsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  togglePauseTorrent = async () => {
    const torrent = this.state.torrent
    if (torrent) {
      if (torrent.running) {
        api.get({ method: 'cancel', infohash: torrent.infoHash, noDelete: true })
        this.close()
      } else {
        const thisHash = torrent.infoHash
        window.loadingTorrents[thisHash] = true
        this.close()
        if (window.torrentDataPage)
          api.get({ type: 'getplaylist.m3u', id: thisHash })
        else
          await api.get({ type: 'getplaylist.m3u', id: thisHash })
        delete window.loadingTorrents[thisHash]
      }
    }
    if (window.torrentDataPage)
      window.location = '/'
  }

  streamFiles() {
    const torrent = this.state.torrent
    if (torrent) {
      window.open(api.parseUrl({ type: 'getplaylist.m3u', id: torrent.infoHash }), "_blank")
    }
    this.close()
  }

  openFolder() {
    const torrent = this.state.torrent
    if (torrent) {
      api.get({ method: 'torrentLoc', infoHash: torrent.infoHash })
    }
    this.close()
  }

  deleteTorrent() {
    const torrent = this.state.torrent
    api.get({
              method: 'cancel',
              force: true,
              infohash: torrent && torrent.infoHash ? torrent.infoHash : ''
            })
    this.close()
    if (window.torrentDataPage)
      window.location = '/'
  }

  forceDownload() {
    const torrent = this.state.torrent
    api.get({
              method: 'forceDownload',
              id: torrent && torrent.utime ? torrent.utime : ''
            })
    torrent.forced = !torrent.forced
    torrent.pulsing = false
    this.setState({ torrent, pulsing: torrent.pulsing, forced: torrent.forced, update: Date.now() })
  }

  runPlaylist = async () => {

    document.getElementById("torrentOptsDialog").close()

    if (!this.state.torrent.running) {
      window.loadingTorrents[this.state.torrent.infoHash] = true
      await api.get({ type: 'getplaylist.m3u', id: this.state.torrent.infoHash })
      delete window.loadingTorrents[this.state.torrent.infoHash]
    }

    api.get({ method: 'runPlaylist', infoHash: this.state.torrent.infoHash })

  }

  streamWebPlayer = async () => {

    modals.open('loading')

    let isCanceled = false
    const hasCanceled = () => {
      events.off('canceledLoading', hasCanceled)
      isCanceled = true
    }
    events.on('canceledLoading', hasCanceled)


    if (!this.state.torrent.running) {
      await api.get({ type: 'getplaylist.m3u', id: this.state.torrent.infoHash })
    }

    const torData = await api.get({ method: 'torrentData', id: this.state.torrent.infoHash, json: true })

    if (isCanceled)
      return

    const torrent = torData
    let file
    torData.files.some((fl) => {
      if (fl.streamable) {
        file = fl
        return true
      }
    })
    if (file) {
      if (document.getElementById("loadingDialog"))
        document.getElementById("loadingDialog").close()
      player.modal.open(torrent, file)
    }

  }

  getValue = (label, oldValue, cb) => {

    const oldState = this.state

    const receiveValue = (value) => {
      cb(value, () => {
        modals.open('torrentOpts', oldState)
        events.off('inputDialogValue', receiveValue)
        events.off('inputDialogClose', closing)
      })
    }

    const closing = () => {
      modals.open('torrentOpts', oldState)
      events.off('inputDialogValue', receiveValue)
      events.off('inputDialogClose', closing)
    }

    events.on('inputDialogValue', receiveValue)

    events.on('inputDialogClose', closing)

    modals.open('input', { label, default: oldValue, maxLength: 1000 })

  }

  torrentSpeedLimit = () => {

    const torrent = this.state.torrent

    const label = 'The maximum speed limit for this torrent, in KB. 0 means no speed limit. Setting a speed limit disables Forced Downloading, as both cannot be active at the same time.'

    this.getValue(label, (this.state.pulsing || 0), (newValue, cb) => {

      api.get({ method: 'speedPulsing', id: torrent.utime, max: newValue })

      torrent.forced = false
      torrent.pulsing = newValue || false

      this.setState({ torrent, pulsing: torrent.pulsing, forced: torrent.forced, update: Date.now() })

    })

  }

  close() {
    document.getElementById("torrentOptsDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="torrentOptsDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.togglePauseTorrent.bind(this)}
                  className='playerButtons' >
              {this.state.torrent && this.state.torrent.running ? 'Pause' : 'Start'} Torrent
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
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: window.isMaster ? 'block' : 'none'}}
                  onClick={this.openFolder.bind(this)}
                  className='playerButtons' >
              Open Folder
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
                  onClick={this.forceDownload.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', width: 'calc(100% - 70px)', display: this.state.torrent && this.state.torrent.running && (this.state.torrent.downloaded < this.state.torrent.totalSize) ? 'inline-block' : 'none'}}
                  className='playerButtons' >
              Forced Downloading:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.forceDownload.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '70px', display: this.state.torrent && this.state.torrent.running && (this.state.torrent.downloaded < this.state.torrent.totalSize) ? 'inline-block' : 'none'}}
                  className='playerButtons' >
              { this.state.forced ? 'ON' : 'OFF' }
              </paper-button>

              <paper-button
                  raised
                  onClick={this.torrentSpeedLimit.bind(this)}
                  id="speedLimitButton"
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: this.state.torrent && this.state.torrent.running && (this.state.torrent.downloaded < this.state.torrent.totalSize) ? 'block' : 'none'}}
                  className='playerButtons' >
              Speed Limit: { this.state.pulsing ? this.state.pulsing + 'kb' : 'None' }
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
