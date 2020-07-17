/**
*
* Navigation
*
*/

import React from 'react'
import { Flex } from 'grid-styled'
import { Icon } from 'react-interface'
import { Container } from 'elements'
import Wrapper from './Wrapper'
import api from 'utils/api'
import events from 'utils/events'
import modals from 'utils/modals'
import player from 'utils/player'
import browserSupport from 'utils/browserSupport'
import _ from 'lodash'
import isElectron from 'utils/electron'
import { jackettLinkAnchor } from 'utils/misc'
import NavTitle from './navTitle'
import { getParameterByName } from 'utils/misc'

window.externalJackettLink = () => {
  if (isElectron()) {
    api.get({ method: 'jackettLink', anchor: jackettLinkAnchor() })
  } else {
    const win = window.open('https://github.com/jaruba/PowderWeb/wiki/Enable-Jackett', '_blank')
    win.focus()
  }
}

window.loadingTorrents = {}

const speedPulsing = () => {
  api.get({
            method: 'speedPulsing',
            id: window.torrentForMenu && window.torrentForMenu.utime ? window.torrentForMenu.utime : ''
          })
  delete window.torrentForMenu
  document.getElementById("torrentOptsDialog").close()
}

const goToDashboard = (props) => {
//  window.location = '/'
  props.history.push('/')
}

const openSettings = () => {
  if (window.torrentDataPage) {
    const iHash = getParameterByName('hash')
    if (iHash) {
      const openSettingsDataPage = async () => {
        const parsed = await api.get({ method: 'getall', json: true })
        if (parsed) {
          if (_.size(parsed) && parsed[iHash]) {
            const torrent = parsed[iHash]
            modals.open('torrentOpts', { torrent })
          }
        }
      }
      openSettingsDataPage()
    }
  } else {

    modals.open('settings')

  }
}

const syncBrowsers = async () => {

  const historyButtonList = JSON.parse(localStorage.getItem('historyButtonList'))

  if (historyButtonList) {

    modals.open('historyList')

    return

  }

  const histObj = await api.get({ method: 'syncBrowser', json: true })

  if (histObj && histObj.infohash) {
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

      }
    }
  }
}

const searchButtonPressed = async () => {

    let settings = await api.get({
          method: 'setting',
          for: 'getAll',
          json: true
        })

    if (!settings)
      settings = {}

    if (!settings.jackettHost || !settings.jackettKey)
      modals.open('message', { message: 'Searching works exclusively through Jackett. <span class="whiteLink" onClick="window.externalJackettLink()">Install and configure Jackett</span> on your system to enable the searching feature.' })
    else
      modals.open('doSearch')

}

function Navigation ({ logout, online, props }) {
  window.torrentDataPage = window.location.pathname.startsWith('/torrent')
  return (
    <Wrapper className="headNav">
      <div style={{ width: '100%', margin: '8px 0', height: '40px' }}>
        <div style={{float: 'right'}}>
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={modals.open.bind(this, 'addTorrent')} icon="add" title="Add Torrent" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={searchButtonPressed.bind(this)} icon="search" title="Search for Torrents" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', display: window.haveSyncBrowser ? 'inline-block' : 'none'}} onClick={syncBrowsers} icon="icons:history" title="History" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', display: 'inline-block'}} onClick={openSettings} icon="settings" title="Settings" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', display: isElectron() ? 'none' : 'inline-block'}} onClick={logout} icon="exit-to-app" title="Log Out" />
        </div>
        <div style={{float: 'left', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: 'calc(100% - 205px)', display: 'block'}}>
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', display: window.torrentDataPage ? 'none': 'inline-block'}} onClick={modals.open.bind(this, 'speedUp')} icon="image:flash-on" title="Speed Up" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', display: window.torrentDataPage ? 'none': 'inline-block'}} onClick={modals.open.bind(this, 'deleteAll')} icon="device:storage" title="Remove Old Torrents" />
            <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px', verticalAlign: 'top', display: window.torrentDataPage ? 'inline-block': 'none'}} onClick={goToDashboard.bind(this, props)} icon="icons:arrow-back" title="Back to Main Menu" />
            <NavTitle />
        </div>
        <span className="noInternet" style={{display: !online ? 'block' : 'none'}}>Internet Connection Lost</span>
      </div>
    </Wrapper>
  )
}

export default Navigation

