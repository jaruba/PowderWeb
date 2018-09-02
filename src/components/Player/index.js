import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

import events from 'utils/events'
import player from 'utils/player'


export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      torrent: false,
      file: false,
      isLocal: false,
      isYtdl: false,
    }
  }

  componentDidMount = () => {
    events.on('openPlayer', (modalState) => {
      this.setState(modalState)
      document.getElementById("playerOptsDialog").open()
    })
    events.on('closePlayer', (modalState) => {
      document.getElementById("playerOptsDialog").close()
    })
    document.getElementById("playerOptsDialog").addEventListener('iron-overlay-canceled', player.modal.close)

    document.getElementById('subInput').addEventListener('change', function() {
      var files = event.target.files;
      var newSub = files[0];
      var fileData = new FormData();

      fileData.append('filetoupload', newSub)

      var xhr = new XMLHttpRequest();

      xhr.open("POST", "/subUpload?token="+localStorage.getItem('token'), true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.onload = function(progressEvent) {
        if (xhr.status == 200) {
          window.player.addCustomSub(JSON.parse(xhr.responseText))
        } else {
          console.log("Error " + xhr.status + " occurred uploading your file.", xhr);
        }
      }
      xhr.send(fileData);
    })

    const dialogEl = document.getElementById('playerOptsDialog')

    dialogEl.noCancelOnOutsideClick = true
    dialogEl.noCancelOnEscKey = true

  }

  componentWillUnmount = () => {

  }

  getPlaylist() {
      const torrent = this.state.torrent
      if (torrent && torrent.files) {
        let newPlaylist = []
        torrent.files.forEach((file, ij) => {
          if (file.streamable) {
            newPlaylist.push(
              <div
                key={'playlistItem'+ij}
                className={'playlistItem'+(file.id == this.state.file.id ? ' playlistItemSelected' : '')}
                onClick={player.modal.playFile.bind(this, torrent, file, this.state.isLocal, this.state.isYtdl)}>
                  {player.filename2title(file.name)}
              </div>
            )
          }
        })
        return newPlaylist
      } else {
        return []
      }
  }

  render() {
    return (
      <div style={{width: '0px', height: '0px'}}>
        <paper-dialog
            id="playerOptsDialog"
            class="modalScroll"
            horizontal-align="left"
            horizontal-offset="0"
            style={{display: 'none', maxWidth: '100%', width: '100%', padding: '0', marginTop: '90px', marginBottom: '0px', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'left', borderRadius: '0', overflow: 'auto'}}
            with-backdrop >
            <div>
              <div style={{display: 'none'}}>
                <form id="cpd-file" action="/uploadSub" method="post" encType="multipart/form-data">
                  <input id="subInput" type="file" name="cpd-file" />
                </form>
              </div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'left', padding: '0', marginBottom: '6px', lineHeight: '39px', fontSize: '16px', opacity: '0.7', textTransform: 'uppercase', marginLeft: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: 'calc(100% - 53px)'}}>
                Web Player
              </div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'right', padding: '0', marginBottom: '6px'}}>
                <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={player.modal.close.bind(this)} icon="close" />
              </div>
              <div style={{clear: 'both'}}/>
              <div id="videoHold">
                <video id="video" className="video-js vjs-default-skin vjs-big-play-centered" width="680" height="360"/>
                <div id="vjsCustomPlaylist" className="prettyScrollWhite">
                {this.getPlaylist()}
                </div>
              </div>
              <div id="consolelog" />
            </div>
        </paper-dialog>
      </div>
    )
  }
}
