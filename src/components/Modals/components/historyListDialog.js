import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import player from 'utils/player'
import modals from 'utils/modals'
import events from 'utils/events'

function sec2humanReadable(duration){
    var hour = 0;
    var min = 0;
    var sec = 0;

    if (duration){
        if (duration >= 60){
            min = Math.floor(duration / 60);
            sec = duration % 60;
        }
        else{
            sec = duration;
        }

        if (min >= 60){
            hour = Math.floor(min / 60);
            min = min - hour * 60;
        }

        if ( hour < 10 ){ hour = '0'+hour; }
        if ( min < 10 ){ min = '0'+min; }
        if ( sec < 10 ){ sec = '0'+sec; }
    }
    var humanTime = hour +":"+ min +":"+ sec
    if (humanTime == '0:0:0') humanTime = '00:00:00'
    return humanTime;
}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      history: false
    }
  }

  componentDidMount = async () => {

    const parsed = await api.get({ method: 'historyList', json: true })

    this.setState({ history: parsed })

    document.querySelector('#historyListDialog').open()

    document.querySelector('#historyListDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

      document.querySelector('#historyListDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  close() {
    document.getElementById("historyListDialog").close()
    this.closingDialog()
  }

  playHistoryItem = async (histObj) => {

    if (histObj) {
      if (histObj.isLocal) {

        const loc = await api.get({ method: 'getLoc', pid: histObj.infohash, json: true })

        if (loc) {

          let flLoc

          if (loc.files && histObj.fileID && loc.files[histObj.fileID]) {
            flLoc = loc.files[histObj.fileID]
          } else {
            flLoc = { id: 0, name: loc.name }
            loc.files = [flLoc]
          }

          modals.close()

          player.modal.open(loc, flLoc, parseFloat(histObj.time), true, null, null, true)

        } else {
          modals.open('message', { message: 'The file related to this item has been deleted and can no longer be accessed.' })
        }

      } else if (histObj.isYtdl) {

          const ytdlObjOld = await api.get({ method: 'getYtdl', pid: histObj.infohash, json: true })

          if (ytdlObjOld && ytdlObjOld.originalURL) {

            modals.open('loading')

            let isCanceled = false

            const hasCanceled = () => {
              events.off('canceledLoading', hasCanceled)
              isCanceled = true
            }

            events.on('canceledLoading', hasCanceled)

            const ytdlObj = await api.get({ method: 'ytdlAdd', pid: ytdlObjOld.originalURL, json: true })

            if (ytdlObj && ytdlObj.extracted && !isCanceled) {
              modals.close()
              player.modal.open(ytdlObj, { id: 0, name: ytdlObj.name, streamable: true }, parseFloat(histObj.time), true, null, null, null, true)
            } else {
              modals.open('message', { message: 'Could not load Youtube-DL link' })
            }

          } else {
            modals.open('message', { message: 'The website link related to this item has been deleted and can no longer be accessed.' })
          }


      } else if (histObj.infohash) {
        const allTors = await api.get({ method: 'getall', json: true })

        if (allTors) {
          if (_.size(allTors) && allTors[histObj.infohash]) {
            const el = allTors[histObj.infohash]
            modals.open('loading')
            let isCanceled = false
            const hasCanceled = () => {
              events.off('canceledLoading', hasCanceled)
              isCanceled = true
            }
            events.on('canceledLoading', hasCanceled)
            if (!el.running) {
              window.loadingTorrents[el.infoHash] = true
              await api.get({ type: 'getplaylist.m3u', id: el.infoHash || el.opener })
              delete window.loadingTorrents[el.infoHash]
            }
     
            if (isCanceled)
              return

            const torData = await api.get({ method: 'torrentData', id: histObj.infohash, json: true })

            if (isCanceled)
              return

            const torrent = torData
            let file
            torData.files.some((fl) => {
              if (fl.id == histObj.fileID) {
                file = fl
                return true
              }
            })
            if (file) {
              if (document.getElementById("loadingDialog"))
                document.getElementById("loadingDialog").close()

              player.modal.open(torrent, file, parseFloat(histObj.time))
            }

          } else {
            modals.open('message', { message: 'The torrent related to this item has been deleted and can no longer be accessed.' })
          }
        }
      }
    }
  }

  removeHistoryItem = async (histIndex) => {

    await api.get({ method: 'removeHistoryItem', id: histIndex})

    const parsed = await api.get({ method: 'historyList', json: true })

    this.setState({ history: parsed })

  }

  getHistoryList() {
    if (this.state.history && this.state.history.length) {
      let histList = []

      let backColor = '#3e3e3e'

      this.state.history.forEach((el, ij) => {

        backColor = backColor == '#444' ? '#3e3e3e' : '#444'

        const fileFinished = el.ended ? JSON.parse(el.ended) : false

        const fileProgress = Math.round((parseFloat(el.time) / parseFloat(el.duration)) * 100)

        const histItem = (
          <div key={'hist-'+ij} className="dashboardFile" style={{backgroundColor: backColor}}>
              <div className="dashboardFileButtonHold">
                  <paper-fab icon={ 'delete' } onClick={this.removeHistoryItem.bind(this, ij)} style={{ backgroundColor: fileFinished ? '#11a34e' : '#e38318' }} />
              </div>
              <div className="torrentFile" onClick={this.playHistoryItem.bind(this, el)}>
                  <div className="torrentFileProgressHold">
                      <progress-bubble value={fileFinished ? 100 : fileProgress} max="100" stroke-width="5">
                          <strong style={{fontSize: '18px', top: '-42px'}}>{fileFinished ? 100 : fileProgress}<span>%</span></strong>
                      </progress-bubble>
                  </div>
                  <div className="torrentFileDetails" style={{marginTop: '8px'}}>
                      <div className="torrentFileName" style={{marginBottom: '7px'}}>{el.filename}</div>
                      <div className="torrentFileSubtitle">{sec2humanReadable(fileFinished ? el.duration : Math.round(el.time)) + ' / ' + sec2humanReadable(el.duration)}</div>
                  </div>
                  <div style={{clear: 'both'}} />
              </div>
              <div style={{clear: 'both'}} />
          </div>
        )
        histList.push(histItem)
      })
      return histList
    }
    return []
  }

  render() {
    return (
        <paper-dialog
            id="historyListDialog"
            class="modalScroll"
            horizontal-align="left"
            horizontal-offset="0"
            style={{display: 'none', maxWidth: '100%', width: '100%', padding: '0', marginTop: '57px', marginBottom: '0px', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'left', borderRadius: '0', overflow: 'auto', height: 'calc(100% - 57px)'}}
            opened={true}
            with-backdrop >
            <div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'left', padding: '0', marginBottom: '6px', lineHeight: '39px', fontSize: '16px', opacity: '0.7', textTransform: 'uppercase', marginLeft: '10px'}}>
                History
              </div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'right', padding: '0', marginBottom: '6px'}}>
                <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={this.close.bind(this)} icon="close" />
              </div>
              <div style={{clear: 'both'}}/>

              {this.getHistoryList()}
            </div>
        </paper-dialog>
    )
  }
}
