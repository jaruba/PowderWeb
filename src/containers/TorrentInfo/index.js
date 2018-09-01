import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { createStructuredSelector } from 'reselect'
import { increment, incrementAsync, decrement } from './actions'
import { selectCount } from './selectors'
import _ from 'lodash'

import events from 'utils/events'
import { healToken, checkToken } from 'utils/auth'

import api from 'utils/api'
import modals from 'utils/modals'
import player from 'utils/player'

import { getParameterByName, readableSize, humanReadableTime } from 'utils/misc'

let dataTimeout
let focused

const next = function() {
  const fetchData = () => {
    dataTimeout = false
    getData.call(this)
  }
  if (!dataTimeout)
    dataTimeout = setTimeout(fetchData, 1500)
}

const getData = async function() {

  if (focused) {

    const parsed = await api.get({ method: 'torrentData', id: getParameterByName('hash'), json: true })

    if (parsed) {

      if (!focused) return

      const newDocTitle = parsed.name + ' - Powder Web'

      if (document.title != newDocTitle)
        document.title = newDocTitle

      events.emit('navTitle', { title: parsed.name })

      this.setState({ torrent: parsed })

    } else {
      healToken(() => {checkToken(true)})
    }

    next.call(this)

  }
}

let dataInterval

export default class Counter extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      torrents: {},
      activeTorrents: [],
    }
  }

  decideFileAction = () => {

  }

  openFileMenu = (file) => {
    modals.open('fileOpts', { torrent: this.state.torrent, file })
  }

  openFile = (el) => {
    api.get({ method: 'exec', infoHash: this.state.torrent.infoHash, id: el.id })
  }

  openPlaylist = (el) => {
    api.get({ type: 'getplaylist.m3u', id: this.state.torrent.infoHash, fileID: el.id, openNow: true })
  }

  downloadFile = (el) => {
    window.open(api.parseUrl({ type: 'api/' + this.state.torrent.infoHash + '/' + el.id }), "_blank")
  }

  streamFile = (el) => {
    window.open(api.parseUrl({ type: 'getplaylist.m3u', id: this.state.torrent.infoHash, fileID: el.id }), "_blank")
  }

  playFile = (el) => {

    const playButtonAction = JSON.parse(localStorage.getItem('playButtonAction'))

    if (playButtonAction && el.streamable) {
      player.modal.open(this.state.torrent, el)
    } else {
      if (window.isMaster) {
        if (el.streamable)
          this.openPlaylist(el)
        else
          this.openFile(el)
      } else {
        if (el.streamable)
          this.streamFile(el)
        else
          this.downloadFile(el)
      }
    }
  }

  torrentList = () => {

    let fileList = []

    let backColor = '#3e3e3e'

    _.forEach(this.state.torrent && this.state.torrent.files ? this.state.torrent.files : [], (el, ij) => {

      backColor = backColor == '#444' ? '#3e3e3e' : '#444'

      const fileProgress = el.progress
      const fileFinished = (el.progress == 100)
      const filePercent = fileProgress / 100

      const newFile = (
          <div key={ij} className="dashboardFile" style={{backgroundColor: backColor}}>
              <div className="dashboardFileButtonHold">
                  <paper-fab icon={ 'menu' } onClick={this.openFileMenu.bind(this, el)} style={{ backgroundColor: fileFinished ? '#11a34e' : el.selected ? '#e38318' : '#e3b618' }} />
                  <paper-fab icon={ 'av:play-arrow' } onClick={this.playFile.bind(this, el)} style={{ backgroundColor: fileFinished ? '#11a34e' : el.selected ? '#e38318' : '#e3b618' }} />
              </div>
              <div className="torrentFile" onClick={this.openFileMenu.bind(this, el)}>
                  <div className="torrentFileProgressHold">
                      <progress-bubble value={fileProgress} max="100" stroke-width="5">
                          <strong>{fileProgress}<span>%</span></strong>
                      </progress-bubble>
                  </div>
                  <div className="torrentFileDetails" style={{marginTop: '8px'}}>
                      <div className="torrentFileName" style={{marginBottom: '7px'}}>{el.name}</div>
                      <div className="torrentFileSubtitle">Downloaded: {fileFinished ? readableSize(el.length) : readableSize(el.length * filePercent)} / {readableSize(el.length)}</div>
                  </div>
                  <div style={{clear: 'both'}} />
              </div>
              <div style={{clear: 'both'}} />
          </div>
      );
      fileList.push(newFile);
    })

    return fileList
  }

  torrentHeader = () => {
    const torrent = this.state.torrent
    if (!torrent)
      return []
    let finished = torrent.isFinished
    if (!finished) {
      if (torrent.swarm.downloaded > torrent.total.length) finished = true
    }
    const filePercent = finished ? 1 : torrent.swarm.downloaded / torrent.total.length
    const fileProgress = Math.round(filePercent * 100)
    const eta = Math.round((torrent.total.length - torrent.swarm.downloaded) / torrent.swarm.downloadSpeed)
    const uploadStart = torrent.uploadedStart || 0
    return (
      <div className={"torrentHeader"}>
        <div style={{float: 'left', marginLeft: '15px'}}>
          <div className="torrentDataBlock" style={{width: '150px'}}>
            <div className="torrentDataLine">
                <iron-icon icon="image:flash-on" style={{color: '#bcbdbe', marginRight: '8px', width: '16px', height: '16px', position: 'relative', top: '-1px'}} />
                Speed: {(finished ? readableSize(torrent && torrent.swarm ? torrent.swarm.uploadSpeed : 0) : readableSize(torrent && torrent.swarm ? torrent.swarm.downloadSpeed : 0)) + '/s'}
            </div>
            <div className="torrentDataLine">
                <iron-icon icon="swap-horiz" style={{color: '#bcbdbe', marginRight: '8px', width: '18px', height: '18px', position: 'relative', top: '-1px'}}  />
                Peers: {torrent && torrent.swarm && torrent.swarm.wires && torrent.swarm.wires.length ? torrent.swarm.wires.length : 0}
            </div>
          </div>
          <div className="torrentDataBlock">
            <div className="torrentDataLine">
                <iron-icon icon="cloud-download" style={{color: '#bcbdbe', marginRight: '8px', width: '16px', height: '16px', position: 'relative', top: '-1px'}} />
                Downloaded: {finished ? readableSize(torrent && torrent.total.length ? torrent.total.length : 0) : readableSize(torrent && torrent.swarm ? torrent.swarm.downloaded : 0)} / {readableSize(torrent.total.length)}
            </div>
            <div className="torrentDataLine">
                <iron-icon icon="cloud-upload" style={{color: '#bcbdbe', marginRight: '8px', width: '16px', height: '16px', position: 'relative', top: '-1px'}} />
                Uploaded: {readableSize((torrent && torrent.swarm ? torrent.swarm.uploaded : 0) + uploadStart)}
            </div>
          </div>
          <div className="torrentDataBlock" style={{marginRight: '0'}}>
            <div className="torrentDataLine">
                <iron-icon icon="device:access-time" style={{color: '#bcbdbe', marginRight: '8px', width: '16px', height: '16px', position: 'relative', top: '-1px'}} />
                ETA: {finished ? '-' : humanReadableTime(eta)}
            </div>
          </div>
        </div>
        <div className="torrentFileProgressHold" style={{float: 'right', marginTop: '-5px', marginRight: '10px'}}>
          <progress-bubble value={fileProgress} max="100" stroke-width="5">
              <strong>{fileProgress}<span>%</span></strong>
          </progress-bubble>
        </div>
      </div>
    )
  }


  onfocus = () => {
    focused = true
    getData.call(this)
  }

  onblur = () => {
    focused = false
    if (dataTimeout)
      clearTimeout(dataTimeout)
    dataTimeout = false
  }

  componentWillMount = () => {
    window.torrentDataPage = true
  }

  componentDidMount = () => {

    api.secureToken()

    const renderNotFocused = JSON.parse(localStorage.getItem('renderNotFocused'))

    if (renderNotFocused) {
      focused = true
      this.onfocus()
    } else {
      focused = document.hasFocus()
      window.addEventListener("focus", this.onfocus)
      window.addEventListener("blur", this.onblur)
      getData.call(this)
    }

    player.init()

    const checkHaveSync = async () => {
      const haveSyncParsed = await api.get({ method: 'haveSyncBrowser', json: true })

      if (haveSyncParsed && haveSyncParsed.value) {
        window.haveSyncBrowser = true
        events.emit('updateNav')
      }
    }

    checkHaveSync()

  }

  componentWillUnmount = () => {
    window.torrentDataPage = false
    window.removeEventListener("focus", this.onfocus)
    window.removeEventListener("blur", this.onblur)
    this.onblur()
    player.modal.close()
    events.emit('navTitle', { title: '' })
  }

  render() {

    return (
      <div className="torrentDataList">
        {this.torrentHeader()}
        {this.torrentList()}
      </div>
    )
  }
}
