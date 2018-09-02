import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'
import { healToken, checkToken } from 'utils/auth'

import api from 'utils/api'

import events from 'utils/events'
import player from 'utils/player'

import modals from 'utils/modals'

import { getParameterByName } from 'utils/misc'

const fail = () => {
  let opener = getParameterByName('opener')
  let iHash = getParameterByName('hash')
  let urlExtra = ''
  if (opener) {
    urlExtra += '&opener=' + encodeURIComponent(opener)
  }
  if (iHash) {
    urlExtra += '&hash=' + iHash
  }
  window.location = 'http://powder.media/embed?invalid=1' + urlExtra
}

const playTorrent = async () => {

  const validToken = await api.get({ method: 'validToken', token: getParameterByName('token'), json: true })

  if (validToken && validToken > 0) {
    modals.open('embedLoading')

    const iHash = getParameterByName('hash')

    const opener = getParameterByName('opener')

    if (opener && opener.startsWith('acestream://')) {

      const pid = opener.replace('acestream://', '')

      const attemptResp = await api.get({ method: 'ace', torrent: pid, json: true}, (err) => {
        if (err)
          events.emit('embedLoadingMsg', err)
      })


      if (attemptResp && attemptResp.hasAcestream == true) {

        let dataTimer

        const checkMsg = async () => {
          const checkResp = await api.get({ method: 'aceMsg', torrent: pid, json: true})
          if (checkResp && checkResp.status) {
            events.emit('embedLoadingMsg', checkResp.status)
            if (checkResp.transcodeLink) {
              console.log('Transcode Link: ' + checkResp.transcodeLink)
              modals.close()
              setTimeout(() => {
                player.modal.openLive(checkResp.transcodeLink, checkResp.name)
              })
              return
            }
          }
          dataTimer = setTimeout(checkMsg, 2000)
        }

        dataTimer = setTimeout(checkMsg, 2000)

      } else {
        // acestream not installed, prompt for install
        modals.open('aceNotInstalled')
      }

    } else if (opener && opener.startsWith('sop://')) {

      const attemptResp = await api.get({ method: 'sop', torrent: opener, json: true}, (err) => {
        if (err)
          events.emit('embedLoadingMsg', err)
      })


      if (attemptResp && attemptResp.hasSopcast == true) {

        let dataTimer

        const checkMsg = async () => {
          const checkResp = await api.get({ method: 'sopMsg', torrent: opener.replace(/[^a-z0-9]/gi,''), json: true})
          if (checkResp && checkResp.status) {
            events.emit('embedLoadingMsg', checkResp.status)
            if (checkResp.transcodeLink) {
              console.log('Transcode Link: ' + checkResp.transcodeLink)
              modals.close()
              setTimeout(() => {
                player.modal.openLive(checkResp.transcodeLink, checkResp.name)
              })
              return
            }
          }
          dataTimer = setTimeout(checkMsg, 2000)
        }

        dataTimer = setTimeout(checkMsg, 2000)

      } else {
        // acestream not installed, prompt for install
        modals.open('aceNotInstalled')
      }

    } else {

      const urlType = await api.get({ method: 'urlType', pid: getParameterByName('hash') || getParameterByName('opener'), json: true })

      if (urlType) {
        if (urlType.isTorrent) {

          const runningTorrent = await api.get({ method: 'embedStart', id: getParameterByName('hash') || getParameterByName('opener'), json: true })

          const parsed = await api.get({ method: 'torrentData', id: runningTorrent.infoHash || getParameterByName('hash'), json: true })

          if (parsed) {

            player.modal.open(parsed, parsed.files[0])

          } else {

            fail()

          }

        } else if (urlType.isYoutubeDl) {

          modals.open('embedLoading')

          const ytdlObj = await api.get({ method: 'ytdlAdd', pid: getParameterByName('hash') || getParameterByName('opener'), json: true })

          if (ytdlObj && ytdlObj.extracted) {
            modals.close()
            player.modal.open(ytdlObj, { id: 0, name: ytdlObj.name, streamable: true }, 0, true, null, null, null, true)
          } else {
            events.emit('embedLoadingMsg', 'Could not load Youtube-DL link')
          }
        } else {
          events.emit('embedLoadingMsg', 'Invalid Link')
        }

    } else {
          events.emit('embedLoadingMsg', 'Invalid Link')
        }
  }

  } else {
    fail()
  }
}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      torrent: false,
      file: false
    }
  }

  componentDidMount = () => {

    player.init()

    events.on('openPlayer', (modalState) => {
      this.setState(modalState)
      document.getElementById("embedPlayerOptsDialog").open()
    })

    events.on('closePlayer', (modalState) => {
      document.getElementById("embedPlayerOptsDialog").close()
    })

    document.getElementById("embedPlayerOptsDialog").addEventListener('iron-overlay-canceled', player.modal.close)

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

    api.frisbee.headers = { ...api.frisbee.headers, authorization: getParameterByName('token') }

    if (getParameterByName('url')) {
      const playUrl = decodeURIComponent(getParameterByName('url'))
      player.modal.openUrl(playUrl)
    } else {
      setTimeout(playTorrent)
    }
  }

  componentWillUnmount = () => {

  }

  render() {
    return (
      <div style={{width: '0px', height: '0px'}}>
        <paper-dialog
            id="embedPlayerOptsDialog"
            className="prettyScrollWhite"
            style={{maxWidth: '100%', width: '100%', padding: '0', backgroundColor: '#303030', color: 'white', textAlign: 'left', borderRadius: '0', overflow: 'hidden', margin: '0', height: '100%', maxHeight: '100%'}}
            opened={true}
            with-backdrop >
            <div style={{padding: '0', margin: '0', height: '100%'}}>
              <div style={{display: 'none'}}>
                <form id="cpd-file" action="/uploadSub" method="post" encType="multipart/form-data">
                  <input id="subInput" type="file" name="cpd-file" />
                </form>
              </div>
              <div id="videoHold">
                <video id="video" className="video-js vjs-default-skin vjs-big-play-centered" width="100%" height="100%"/>
              </div>
              <div id="consolelog" />
            </div>
        </paper-dialog>
      </div>
    )
  }
}
