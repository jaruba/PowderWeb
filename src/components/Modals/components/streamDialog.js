import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import modals from 'utils/modals'
import player from 'utils/player'
import events from 'utils/events'
import isElectron from 'utils/electron'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      infoHash: 0
    }
  }

  componentDidMount = () => {
    this.setState(this.props.query)
    setTimeout(() => {
      let playNewTorrent = JSON.parse(localStorage.getItem('playNewTorrent'))

      // because we can't download playlist in Electron:
      if (playNewTorrent == 3 && isElectron())
        playNewTorrent = 4

      if (!playNewTorrent) {
        document.getElementById("streamDialog").open()
      } else if (playNewTorrent == 1) {
        this.torrentDashboard()
      } else if (playNewTorrent == 2) {
        this.streamWebPlayer()
      } else if (playNewTorrent == 3) {
        this.downloadPlaylist()
      } else if (playNewTorrent == 4) {
        this.runPlaylist()
      }
    })
  }

  componentWillUnmount = () => {

  }

  runPlaylist() {

    api.get({ method: 'runPlaylist', infoHash: this.state.infoHash })

    this.cancelStreamDialog()
  }

  downloadPlaylist() {
    window.open(api.parseUrl({ type: 'playlist.m3u', id: this.state.infoHash }), "_blank")
    this.cancelStreamDialog()
  }

  streamWebPlayer = async () => {
    console.log(114)
    this.cancelStreamDialog()

    modals.open('loading')

    console.log(115)
    let isCanceled = false
    const hasCanceled = () => {
    console.log(116)
      events.off('canceledLoading', hasCanceled)
      isCanceled = true
    }
    events.on('canceledLoading', hasCanceled)

    console.log(117)
    const torData = await api.get({ method: 'torrentData', id: this.state.infoHash, json: true })

    console.log(118)
    if (isCanceled)
      return
    console.log(119)

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

  torrentDashboard() {
    this.cancelStreamDialog()
    window.location = '/torrent?hash=' + this.state.infoHash
  }

  cancelStreamDialog() {
    // if (checkReadyInterval)
    //   clearInterval(checkReadyInterval)
    // checkReadyInterval = false
    document.getElementById("streamDialog").close()
  }

  render() {
    return (
        <paper-dialog
            id="streamDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={false}
            with-backdrop >

            You can set a default action from the Dashboard Settings.

            <br />
            <br />
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px', display: window.isMaster ? 'block' : 'none'}}>
                <paper-button
                    raised
                    onClick={this.runPlaylist.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                    className='playerButtons' >
                Run Playlist
                </paper-button>
            </div>
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px', display: isElectron() ? 'none' : 'block'}}>
                <paper-button
                    raised
                    onClick={this.downloadPlaylist.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                    className='playerButtons' >
                Download Playlist
                </paper-button>
            </div>

            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                <paper-button
                    raised
                    onClick={this.streamWebPlayer.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                    className='playerButtons' >
                Stream with Web Player
                </paper-button>
            </div>

            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                <paper-button
                    raised
                    onClick={this.torrentDashboard.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                    className='playerButtons' >
                Show in Torrent Dashboard
                </paper-button>
            </div>
            
            <div style={{margin: '0', fontSize: '16px'}}>
                <paper-button
                    raised
                    onClick={this.cancelStreamDialog.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', width: '100%'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
