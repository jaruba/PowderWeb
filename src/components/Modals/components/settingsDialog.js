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

let internetIp

function findIP(onNewIP) { //  onNewIp - your listener function for new IPs
  var failedWebRTC = false
  var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection; //compatibility for firefox and chrome
  if (myPeerConnection) {
    var pc = new myPeerConnection({iceServers: []}),
      noop = function() {},
      localIPs = {},
      ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
      key;

    if (pc.createDataChannel && pc.createOffer && pc.setLocalDescription) {

      function ipIterate(ip) {
        if (!localIPs[ip]) onNewIP(ip);
        localIPs[ip] = true;
      }
      pc.createDataChannel(""); //create a bogus data channel
      pc.createOffer(function(sdp) {
        sdp.sdp.split('\n').forEach(function(line) {
          if (line.indexOf('candidate') < 0) return;
          line.match(ipRegex).forEach(ipIterate);
        });
        pc.setLocalDescription(sdp, noop, noop);
      }, noop); // create offer and set local description
      pc.onicecandidate = function(ice) { //listen for candidate events
        if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
        ice.candidate.candidate.match(ipRegex).forEach(ipIterate);
      };
    } else {
      failedWebRTC = true
    }
  } else {
    failedWebRTC = true
  }

  if (failedWebRTC) {
    var xmlhttp = new XMLHttpRequest();
    var url = 'https://api.ipify.org/?format=json';

    xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        var resp = false
        if (this.responseText) {
          try {
            resp = JSON.parse(this.responseText);
          } catch(e) {}
        }
        if (resp && resp.ip) {
          onNewIP(resp.ip)
        }
      }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
  }
}

function addIP(ip) {
  internetIp = ip
}

findIP(addIP);

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {}
  }

  componentDidMount = async () => {
      if (this.props.query && this.props.query.oldScroll) {
        setTimeout(() => {
          document.querySelector('#settingsDialog').scrollTop = this.props.query.oldScroll
        })
      }

      let settings = await api.get({
            method: 'setting',
            for: 'getAll',
            json: true
          })

      if (!settings)
        settings = {}

      settings.copyts = this.getLocalValue('copyts')
      settings.maxCompatibility = this.getLocalValue('maxCompatibility')
      settings.maxQuality = this.getLocalValue('maxQuality')
      settings.alwaysTranscode = this.getLocalValue('alwaysTranscode')
      settings.subSearch = this.getLocalValue('subSearch')
      settings.renderNotFocused = this.getLocalValue('renderNotFocused')
      settings.playButtonAction = this.getLocalValue('playButtonAction')
      settings.historyButtonList = this.getLocalValue('historyButtonList')
      settings.playNewTorrent = this.getLocalValue('playNewTorrent')

      this.setState(settings)

      document.querySelector('#settingsDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  componentWillUnmount = () => {
      document.querySelector('#settingsDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  closeSettings = (label, oldValue, cb) => {
    const generalOpts = document.getElementById("settingsDialog")
    generalOpts.close()
    generalOpts.scrollTop = 0
    this.closingDialog()
  }

  getValue = (label, oldValue, cb) => {

    const oldScroll = document.querySelector('#settingsDialog').scrollTop

    const receiveValue = (value) => {
      cb(value, () => {
        modals.open('settings', { oldScroll })
        events.off('inputDialogValue', receiveValue)
        events.off('inputDialogClose', closing)
      })
    }

    const closing = () => {
      modals.open('settings', { oldScroll })
      events.off('inputDialogValue', receiveValue)
      events.off('inputDialogClose', closing)
    }

    events.on('inputDialogValue', receiveValue)

    events.on('inputDialogClose', closing)

    modals.open('input', { label, default: oldValue, maxLength: 100000, oldScroll })

  }


  getValueString = (label, oldValue, allowRule, maxLength, cb) => {

    const oldScroll = document.querySelector('#settingsDialog').scrollTop

    const receiveValue = (value) => {
      cb(value, () => {
        modals.open('settings', { oldScroll })
        events.off('inputDialogValue', receiveValue)
        events.off('inputDialogClose', closing)
      })
    }

    const closing = () => {
      modals.open('settings', { oldScroll })
      events.off('inputDialogValue', receiveValue)
      events.off('inputDialogClose', closing)
    }

    events.on('inputDialogValue', receiveValue)

    events.on('inputDialogClose', closing)

    modals.open('input', { label, default: oldValue, allowRule, maxLength, oldScroll })

  }

  saveValue = async (valueName, value, cb) => {
    await api.get({ method: 'settings', [valueName]: value })
    cb && cb()
  }

  saveLocalValue = (valueName, value, cb) => {
    localStorage.setItem(valueName, JSON.stringify(value))
    cb && cb()
  }

  getLocalValue = (valueName) => {
    return JSON.parse(localStorage.getItem(valueName))
  }

  showInfo = (whichInfo) => {
    let infoBox = document.querySelector('.'+whichInfo + 'Info')
    if (infoBox) {
      infoBox.classList.toggle('settingsInfoShow')
    }
  }

  generalAssociateMagnet = () => {
    api.get({ method: 'associateMagnetLink' })
  }
  generalAssociateTorrentFile = () => {
    api.get({ method: 'associateTorrentFile' })
  }
  generalOpenDownloadFolder = () => {
    api.get({ method: 'openDefaultFolder' })
  }
  generalChangeDownloadFolder = async () => {
    var newValue = await api.get({ method: 'selectFolder', json: true })
    if (newValue && newValue.value && newValue.value[0]) {
      this.saveValue('downloadFolder', newValue.value[0], () => {
        this.setState({
          downloadFolder: newValue.value[0]
        })
      })
    }
  }
  generalConcurrentDownloads = () => {

    const label = 'Maximum number of torrents active at the same time. Torrents are paused to maintain concurrency after they have been active for at least 1 hour.'

    this.getValue(label, this.state.maxConcurrency, (newValue, cb) => {
      this.saveValue('maxConcurrency', newValue, cb)
    })

  }
  generalDownloadAllFiles = () => {
    const newValue = !this.state.downloadAll
    this.saveValue('downloadAll', newValue, () => {
      this.setState({
        downloadAll: newValue
      })
    })
  }
  generalVerifyFiles =  () => {
    const newValue = !this.state.verifyFiles
    this.saveValue('verifyFiles', newValue, () => {
      this.setState({
        verifyFiles: newValue
      })
    })
  }
  generalForcedDownloading = () => {
    const newValue = !this.state.forceDownload
    this.saveValue('forceDownload', newValue, () => {
      this.setState({
        forceDownload: newValue
      })
    })
  }
  generalSpeedLimit = () => {

    const label = 'The maximum speed limit for each torrent, in KB. 0 means no speed limit. Setting a speed limit disables Forced Downloading, as both cannot be active at the same time.'

    this.getValue(label, (this.state.speedLimit || 0), (newValue, cb) => {
      this.saveValue('speedLimit', newValue, cb)
    })

  }
  generalAlwaysDeleteInactive = () => {
    const newValue = this.state.removeLogic == 0 ? 1 : 0
    this.saveValue('removeLogic', newValue, () => {
      this.setState({
        removeLogic: newValue
      })
    })
  }
  generalWebserverSSL = () => {
    const newValue = this.state.webServerSSL ? false : true
    this.saveValue('webServerSSL', newValue, () => {
      this.setState({
        webServerSSL: newValue
      })
    })
  }
  generalDeleteAllTorrents = () => {
    api.get({ method: 'deleteAllPaused' })
  }
  generalSetJackettHost = () => {
    const label = 'The Jackett Host Server, by default this is "http://localhost:9117/". Needs Jackett installed separately and configured.'

    this.getValueString(label, (this.state.jackettHost || ''), '[^]', 10000, (newValue, cb) => {
      this.saveValue('jackettHost', newValue, cb)
    })

  }
  generalSetJackettKey = () => {
    const label = 'The Jackett API Key, this can be seen on the Jackett Host Server in your browser (by default the server is at: "http://localhost:9117/"). Needs Jackett installed separately and configured.'

    this.getValueString(label, (this.state.jackettKey || ''), '[^]', 10000, (newValue, cb) => {
      this.saveValue('jackettKey', newValue, cb)
    })

  }
  generalDefaultTrackers = () => {
    const label = 'Default torrent tracker list, separated by ";". These trackers will be added to all the loaded torrents.'

    this.getValueString(label, (this.state.torrentTrackers || ''), '[^]', 10000000, (newValue, cb) => {
      this.saveValue('torrentTrackers', newValue, cb)
    })
  }
  generalSetPlayer = async () => {
    var newValue = await api.get({ method: 'selectFile', json: true })
    if (newValue && newValue.value && newValue.value[0]) {
      this.saveValue('extPlayer', newValue.value[0], () => {
        this.setState({
          extPlayer: newValue.value[0]
        })
      })
    }
  }
  generalSetPlayerArgs = () => {
    const label = 'Command line arguments to use when running the external video player.'

    this.getValueString(label, (this.state.playerCmdArgs || ''), '[^]', 10000, (newValue, cb) => {
      this.saveValue('playerCmdArgs', newValue, cb)
    })
  }
  generalSetTorrentClient = async () => {
    var newValue = await api.get({ method: 'selectFile', json: true })
    if (newValue && newValue.value && newValue.value[0]) {
      this.saveValue('extTorrentClient', newValue.value[0], () => {
        this.setState({
          extTorrentClient: newValue.value[0]
        })
      })
    }
  }
  generalSetTorrentClientArgs = () => {
    const label = 'Command line arguments to use when running the external torrent client.'

    this.getValueString(label, (this.state.torrentCmdArgs || ''), '[^]', 10000, (newValue, cb) => {
      this.saveValue('torrentCmdArgs', newValue, cb)
    })
  }
  generalWebserverPort = () => {

    const label = 'The port that the web server will use.'

    this.getValue(label, (this.state.webServerPort || 0), (newValue, cb) => {
      this.saveValue('webServerPort', newValue, cb)
    })

  }
  generalAllowedUsers = () => {

    const label = 'Enables registration for X number of users. While open, registration is available for everyone that has the server link. 0 means registration is disabled.'

    this.getValue(label, (this.state.maxUsers || 0), (newValue, cb) => {
      this.saveValue('maxUsers', newValue, cb)
    })

  }
  generalMaximumPeers = () => {

    const label = 'The maximum number of peers that each torrent can connect to. A lower number of maximum peers has better results for video players that lack large buffering caches, like VLC.'

    this.getValue(label, (this.state.maxPeers || 0), (newValue, cb) => {
      this.saveValue('maxPeers', newValue, cb)
    })

  }
  generalPeerPort = () => {

    const label = 'The peer port that torrents will use.'

    this.getValue(label, (this.state.peerPort || 0), (newValue, cb) => {
      this.saveValue('peerPort', newValue, cb)
    })

  }
  generalPeerId = () => {

    const label = 'The peer ID is usually the form of "AA0000". Only letters and digits are allowed, maximum length is 6.'

    this.getValueString(label, (this.state.peerID || 'PW0050'), '[a-zA-Z\\d]', 6, (newValue, cb) => {
      this.saveValue('peerID', newValue, cb)
    })

  }
  generalResetSettings = () => {
    if (window.isMaster) {
      api.get({ method: 'resetSettings' })
    }
    player.resetSettings()
    this.closeSettings()
  }

  generalPlayButtonAction = () => {
    const newValue = !this.state.playButtonAction
    this.saveLocalValue('playButtonAction', newValue, () => {
      this.setState({
        playButtonAction: newValue
      })
    })
  }

  generalHistoryButtonList = () => {
    const newValue = !this.state.historyButtonList
    this.saveLocalValue('historyButtonList', newValue, () => {
      this.setState({
        historyButtonList: newValue
      })
    })
  }

  generalPlayNewTorrent = () => {
    const oldValue = this.getLocalValue('playNewTorrent')

    let newValue = 0

    if (!oldValue) {
      newValue = 1
    } else if (oldValue == 1) {
      newValue = 2
    } else if (oldValue == 2) {
      newValue = 3
    } else if (oldValue == 3 && window.isMaster) {
      newValue = 4
    }

    this.saveLocalValue('playNewTorrent', newValue, () => {
      this.setState({
        playNewTorrent: newValue
      })
    })
  }

  generalUseWebPlayerAssoc = () => {

    const newValue = this.state.useWebPlayerAssoc ? false : true

    this.saveValue('useWebPlayerAssoc', newValue, () => {
      this.setState({
        useWebPlayerAssoc: newValue
      })
    })

  }

  generalRenderNotFocused = () => {
    const newValue = !this.state.renderNotFocused
    this.saveLocalValue('renderNotFocused', newValue, () => {
      this.setState({
        renderNotFocused: newValue
      })
    })
  }

  generalCopyts = () => {
    const newValue = !this.state.copyts
    this.saveLocalValue('copyts', newValue, () => {
      this.setState({
        copyts: newValue
      })
    })
  }

  generalBrowserSupport = () => {
    const newValue = !this.state.maxCompatibility
    this.saveLocalValue('maxCompatibility', newValue, () => {
      this.setState({
        maxCompatibility: newValue
      })
    })
  }

  generalVideoQuality = () => {
    const newValue = !this.state.maxQuality
    this.saveLocalValue('maxQuality', newValue, () => {
      this.setState({
        maxQuality: newValue
      })
    })
  }

  generalSubSearch = () => {
    const newValue = !this.state.subSearch
    this.saveLocalValue('subSearch', newValue, () => {
      this.setState({
        subSearch: newValue
      })
    })
  }

  generalForceTranscode = () => {
    const newValue = !this.state.alwaysTranscode
    this.saveLocalValue('alwaysTranscode', newValue, () => {
      this.setState({
        alwaysTranscode: newValue
      })
    })
  }

  copyEmbedToken = () => {

    var copyText = document.getElementById("embedKeyCopy")

    copyText.select()

    document.execCommand("copy")

    copyText.blur()

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  render() {
    return (
          <paper-dialog
            id="settingsDialog"
            className="prettyScrollWhite"
            style={{display: 'none', maxWidth: '100%', width: '100%', padding: '0', marginTop: '90px', marginBottom: '0px', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'left', borderRadius: '0', overflowX: 'scroll'}}
            opened={true}
            with-backdrop >
            <div>

              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'left', padding: '0', marginBottom: '6px', lineHeight: '39px', fontSize: '16px', opacity: '0.7', textTransform: 'uppercase', marginLeft: '10px'}}>
                General Settings
              </div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'right', padding: '0', marginBottom: '6px'}}>
                <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={this.closeSettings.bind(this)} icon="close" />
              </div>
              <div style={{clear: 'both'}}/>


              <div className="setting-header" style={{marginTop: '10px'}}>
                  Embedding in Websites
              </div>

              <div style={{opacity: '0', width: '0', height: '0'}}>
                <input id="embedKeyCopy" type="text" value={this.state.embedToken + '-' + window.btoa(window.location.origin+'/')}/>
              </div>

              <paper-button
                  raised
                  onClick={this.copyEmbedToken.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block'}}
                  className='playerButtons' >
              Copy Embed Token
              </paper-button>

              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.showInfo.bind(this, 'embedKey')}
                  style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                  className='playerButtons' >
              { '?' }
              </paper-button>

              <div className="settingsInfo embedKeyInfo">

                <div style={{clear: 'both', height: '15px'}} />

                <i>The Web Player can also be embedded into websites with your permission. If a website asks for your Embed Token and you want to allow it access to torrent streaming, click "Copy Embed Token", then go back to the website and paste the copied key in the "Embed Token" input field.</i>

              </div>

              <div style={{clear: 'both', height: '15px'}} />

              <div className="setting-header" style={{marginTop: '10px'}}>
                  Transcoding (for Web Player)
              </div>

              <paper-button
                  raised
                  onClick={this.generalCopyts.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Preserve Timestamp:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalCopyts.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '100px', maxWidth: '100px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.copyts ? 'Always' : 'Auto' }
              </paper-button>

              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.showInfo.bind(this, 'copyts')}
                  style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                  className='playerButtons' >
              { '?' }
              </paper-button>

              <div className="settingsInfo copytsInfo">

                <div style={{clear: 'both', height: '15px'}} />

                <i>Video timestamps are preserved (when seeking) by default through transcoding on Chrome, Opera and Safari, while on other browsers are preserved programmatically. Setting this to "Always" attempts to preserve the timestamp through transcoding at all times which may not work at all in some browsers resulting in incorrect timestamps. Preserving timestamps programmatically though, might or might not create small inconsistencies in subtitle synchronisation.</i>

              </div>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalBrowserSupport.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Browser Support:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalBrowserSupport.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '100px', maxWidth: '100px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.maxCompatibility ? 'Maximum' : 'Auto' }
              </paper-button>

              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.showInfo.bind(this, 'browserSupport')}
                  style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                  className='playerButtons' >
              { '?' }
              </paper-button>

              <div className="settingsInfo browserSupportInfo">

                <div style={{clear: 'both', height: '15px'}} />

                <i>By default, one video source is set based on the best known video / audio support of the current browser. If by any chance playback fails in your browser, you can set this to "Maximum" in order to add all possible video sources and let the browser choose the one it can play by itself. This will guarantee playback, but it will take more for the player to start playback as waterfalling through possible sources can take more time.</i>

              </div>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalForceTranscode.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Use Transcoding:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalForceTranscode.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '100px', maxWidth: '100px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.alwaysTranscode ? 'Always' : 'Auto' }
              </paper-button>

              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.showInfo.bind(this, 'alwaysTranscode')}
                  style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                  className='playerButtons' >
              { '?' }
              </paper-button>

              <div className="settingsInfo alwaysTranscodeInfo">

                <div style={{clear: 'both', height: '15px'}} />

                <i>We always attempt detection of browser supported audio / video codecs. So we may sometimes just transcode video as the original audio codec is supported by default, or even not transcode anything as both video and audio codecs are supported. This leads to less computer processing power being used in order to make videos streamable online. But transcoding only video and not audio will create a temporary desynchronisity between video and audio on seek, this is recognised by seeing the video frozen while audio is playing for a few seconds before it starts working normally. Setting this to "Always" will always transcode, fixing this side effect, but using significantly more computer processing power.</i>

              </div>

              <div style={{clear: 'both', height: '15px'}} />

              <div className="setting-header" style={{marginTop: '10px'}}>
                  Web Player
              </div>

              <paper-button
                  raised
                  onClick={this.generalVideoQuality.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Video Quality:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalVideoQuality.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '100px', maxWidth: '100px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.maxQuality ? 'Highest' : 'Auto' }
              </paper-button>

              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.showInfo.bind(this, 'videoQuality')}
                  style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                  className='playerButtons' >
              { '?' }
              </paper-button>

              <div className="settingsInfo videoQualityInfo">

                <div style={{clear: 'both', height: '15px'}} />

                <i>On "Auto" mode, it will default on playing at 360p quality regardless of the original quality of the video, this is to minimize internet bandwidth usage while still maintaining a watchable stream on the majority of devices. "Highest" will always play with the original video's size, which may use significantly more internet bandwidth, but due to not needing to resize, some videos may not need transcoding at all to play in the browser and thus use a lot less processing power.</i>

              </div>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalSubSearch.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Subtitle Search:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalSubSearch.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.subSearch ? 'On' : 'Off' }
              </paper-button>

              <div style={{clear: 'both', height: '15px'}} />

              <div className="setting-header" style={{marginTop: '10px'}}>
                  User Interface
              </div>

              <paper-button
                  raised
                  onClick={this.generalRenderNotFocused.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Render When Not Focused:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalRenderNotFocused.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '80px', maxWidth: '80px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.renderNotFocused ? 'True' : 'False' }
              </paper-button>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalPlayButtonAction.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Play Button:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalPlayButtonAction.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '200px', maxWidth: '200px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.playButtonAction ? 'Web Player' : 'Download Playlist' }
              </paper-button>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalHistoryButtonList.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              History Button:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalHistoryButtonList.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '150px', maxWidth: '150px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.historyButtonList ? 'History Menu' : 'Last Played' }
              </paper-button>

              <div style={{clear: 'both', height: '15px'}} />

              <paper-button
                  raised
                  onClick={this.generalPlayNewTorrent.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                  className='playerButtons' >
              Play New Torrent:
              </paper-button>
              
              <paper-button
                  raised
                  id="forcedButton"
                  onClick={this.generalPlayNewTorrent.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '180px', maxWidth: '180px', display: 'inline-block', textAlign: 'center'}}
                  className='playerButtons' >
              { this.state.playNewTorrent == 1 ? 'Dashboard' : this.state.playNewTorrent == 2 ? 'Web Player' : this.state.playNewTorrent == 3 ? 'Download Playlist' : this.state.playNewTorrent == 4 ? 'Run Playlist' : 'Ask' }
              </paper-button>

              <div style={{ display: window.isMaster ? 'block' : 'none' }}>

                <div style={{clear: 'both', height: '15px'}} />

                <div className="setting-header" style={{marginTop: '10px'}}>
                    Associations
                </div>

                <paper-button
                    raised
                    onClick={this.generalAssociateMagnet.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', marginRight: '15px', display: 'inline-block'}}
                    className='playerButtons' >
                Magnet Links
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalAssociateTorrentFile.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block'}}
                    className='playerButtons' >
                Torrent Files
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'assoc')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo assocInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Associating with magnet links or torrent files will automatically start video playback of a playlist with all the torrent's video files. By default, this playlist will be played with your operating system's default video player. You can although set your preferred video player from the "Video Player" setting below. However, if "Use Web Player" is set to "True", it will open a browser page with the Web Player streaming a transcoded version of the torrent's videos in order to support playback in your browser instead of opening an external video player.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalUseWebPlayerAssoc.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Use Web Player:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalUseWebPlayerAssoc.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                {this.state.useWebPlayerAssoc ? 'True' : 'False'}
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'useWebPlayerAssoc')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo useWebPlayerAssocInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>How to open torrents with video files from associations. When set to "True", such torrents will start a new browser page with the Web Player. If set to "False" (default) they will start with the video player that is set in the "External Applications" settings below.</i>

                </div>

                <div className="setting-header">
                    External Applications
                </div>

                <i>These options only apply for magnet link / torrent file associations locally. If a torrent includes video files (and the "Use Web Player" setting above is set to "False"), a video playlist will be made and loaded with the selected video player or with the default one for your operating system. If a torrent does not include video files it will start with the selected external torrent client or alternatively with the internal one.</i>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSetPlayer.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Video Player:
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalSetPlayer.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '150px', display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', direction: 'rtl', textOverflow: 'ellipsis', verticalAlign: 'middle'}}
                    className='playerButtons' >
                { this.state.extPlayer || 'Default' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'setVideoPlayer')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo setVideoPlayerInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>This reffers to the video player that will be used when running from magnet link / torrent file associations in the case of a torrent that includes video files.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSetPlayerArgs.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block'}}
                    className='playerButtons' >
                Set Player Arguments
                </paper-button>

                <div style={{height: '2px', backgroundColor: 'rgba(0,0,0,0.2)', margin: '20px 0'}} />

                <paper-button
                    raised
                    onClick={this.generalSetTorrentClient.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Torrent Client:
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalSetTorrentClient.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '150px', display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', direction: 'rtl', textOverflow: 'ellipsis', verticalAlign: 'middle'}}
                    className='playerButtons' >
                { this.state.extTorrentClient || 'Internal' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'setTorrentClient')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo setTorrentClientInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>By default, the internal torrent client will also be used for torrents that do not include any video files. You can change this to a different torrent client if you prefer those sort of files being downloaded by a different client.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSetTorrentClientArgs.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block'}}
                    className='playerButtons' >
                Set Torrent Client Arguments
                </paper-button>

                <div className="setting-header">
                    Download Folder: {this.state.downloadFolder || 'Temp'}
                </div>

                <paper-button
                    raised
                    onClick={this.generalOpenDownloadFolder.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', marginRight: '15px'}}
                    className='playerButtons' >
                Open
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalChangeDownloadFolder.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px'}}
                    className='playerButtons' >
                Change
                </paper-button>

                <div className="setting-header">
                    Download Rules
                </div>

                <paper-button
                    raised
                    onClick={this.generalConcurrentDownloads.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Concurrent Downloads:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalConcurrentDownloads.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                {this.state.maxConcurrency}
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'concurrency')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo concurrencyInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Torrents are active by default for 1 hour. After one hour torrents will be disabled if more torrents are active then the set download concurrency.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalDownloadAllFiles.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Download All Files:
                </paper-button>
                
                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalDownloadAllFiles.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '70px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.downloadAll ? 'True' : 'False' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'downloadAll')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo downloadAllInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>If this is set to "False", the torrent engine will download each file only when it is needed for either playback or browser download or if the user unpauses the file explicitly.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalForcedDownloading.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Forced Downloading:
                </paper-button>
                
                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalForcedDownloading.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '70px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.forceDownload ? 'ON' : 'OFF' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'forcedDownload')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo forcedDownloadInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>By default, the torrent engine can blacklist some peers due to inactivity for a period of time or other such motives. When forced downloading is turned on, it will periodically clear the peer blacklist and reattempt connection to all previously known peers. For popular torrents, this setting is not needed, as it will always have enough peers, but for low seeded torrents, that might have 6 peers total and 5 have been blacklisted for one reason or another, this setting will always achieve the maximum download potential of a torrent.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSpeedLimit.bind(this)}
                    id="speedLimitButton"
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Speed Limit:
                </paper-button>
                
                <paper-button
                    raised
                    onClick={this.generalSpeedLimit.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.speedLimit ? this.state.speedLimit + 'kb' : 'None' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'speedLimit')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo speedLimitInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Maintains a user set download speed limit per torrent.</i>

                </div>

                <div className="setting-header">
                    Clean Up
                </div>

                <paper-button
                    raised
                    onClick={this.generalAlwaysDeleteInactive.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Always Delete Inactive:
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalAlwaysDeleteInactive.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '70px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.removeLogic ? 'True' : 'False' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'alwaysDelete')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo alwaysDeleteInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Deletes the torrent once it has become inactive either by a user pausing the torrent, or by being paused automatically to maintain torrent concurrency.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalDeleteAllTorrents.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block'}}
                    className='playerButtons' >
                Delete All Paused Torrents
                </paper-button>

                <div className="setting-header">
                    Web Server
                </div>

                <paper-button
                    raised
                    onClick={this.generalWebserverPort.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Server Port:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalWebserverPort.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.webServerPort }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'serverPort')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo serverPortInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>The web server port, by default this is "3000". The web version of this application requires login in order to access. To make this web server available online, setup port forwarding on your router and enable the port in your firewall, then access this link: <a href={'http://'+internetIp+':'+this.state.webServerPort+'/'} target="_blank" style={{ color: '#4690dd', textDecoration: 'none !important' }}>http://{ internetIp }:{ this.state.webServerPort }/</a></i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalWebserverSSL.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Use SSL:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalWebserverSSL.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.webServerSSL ? 'True' : 'False' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'serverSSL')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo serverSSLInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>If the web server should use HTTPS or not. If this is set to "True" a self-signed certificate will be created. This certificate will only work locally for "localhost" (it will not work outside your LAN).</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalAllowedUsers.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Allowed Users:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalAllowedUsers.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.maxUsers || 0 }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'allowedUsers')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo allowedUsersInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>By default this is "0", because you don't need any user to use this application locally, increasing the number of users will allow user registration until the number of users reaches the maximum that is set.</i>

                </div>

                <div className="setting-header">
                    Torrent Engine
                </div>

                <paper-button
                    raised
                    onClick={this.generalMaximumPeers.bind(this)}
                    id="speedLimitButton"
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Maximum Peers:
                </paper-button>
                
                <paper-button
                    raised
                    onClick={this.generalMaximumPeers.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.maxPeers }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'maxPeers')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo maxPeersInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Maximum peer connections per torrent.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalPeerPort.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Peer Port:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalPeerPort.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.peerPort }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'peerPort')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo peerPortInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>The port that will be used to connect to peers.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalPeerId.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Peer ID:
                </paper-button>

                <paper-button
                    raised
                    onClick={this.generalPeerId.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', minWidth: '50px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.peerID }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'peerId')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo peerIdInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>The peer ID that is used by this application when connecting to torrent trackers. Some trackers blacklist some peer IDs, others only allow a few specific peer IDs, this is common on private torrent trackers. With this setting you can set the peer id to whatever you like, even the peer ID of a different torrent client.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalVerifyFiles.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Verify Files:
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.generalVerifyFiles.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '70px', maxWidth: '70px', display: 'inline-block', textAlign: 'center'}}
                    className='playerButtons' >
                { this.state.verifyFiles ? 'True' : 'False' }
                </paper-button>

                <paper-button
                    raised
                    id="forcedButton"
                    onClick={this.showInfo.bind(this, 'verifyFiles')}
                    style={{ borderRadius: '21px', cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', minWidth: '50px', maxWidth: '50px', display: 'inline-block', textAlign: 'center', marginLeft: '15px'}}
                    className='playerButtons' >
                { '?' }
                </paper-button>

                <div className="settingsInfo verifyFilesInfo">

                  <div style={{clear: 'both', height: '15px'}} />

                  <i>Verifying files is necessary in order to understand what has already been downloaded to resume download correctly. But unfortunately this is also a lengthy task that happens on every torrent resume, so disabling it makes resuming torrents much faster, although it will disable all information gathering of previous downloads.</i>

                </div>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalDefaultTrackers.bind(this)}
                    id="speedLimitButton"
                    style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', verticalAlign: 'middle', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Set Default Trackers
                </paper-button>

                <div className="setting-header">
                    Jackett Settings (for Search)
                </div>

                <div style={{clear: 'both', height: '7px'}} />

                <i>Searching for torrents is done exclusively through Jackett, a separate software that needs to be installed and configured before searching can work.</i>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSetJackettHost.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Set Jackett Host
                </paper-button>

                <div style={{clear: 'both', height: '15px'}} />

                <paper-button
                    raised
                    onClick={this.generalSetJackettKey.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', display: 'block', fontSize: '16px', display: 'inline-block', marginRight: '15px'}}
                    className='playerButtons' >
                Set Jackett Api Key
                </paper-button>

              </div>

              <div style={{height: '2px', backgroundColor: 'rgba(0,0,0,0.2)', margin: '20px 0'}} />

              <paper-button
                  raised
                  onClick={this.generalResetSettings.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: 'inline-block', fontSize: '16px', textAlign: 'center'}}
                  className='playerButtons' >
              Reset Settings
              </paper-button>

              <div style={{height: '2px', backgroundColor: 'rgba(0,0,0,0.2)', margin: '20px 0'}} />

              <paper-button
                  raised
                  onClick={this.closeSettings.bind(this)}
                  style={{cursor: 'pointer', float: 'none', margin: '0', display: 'inline-block', fontSize: '16px', textAlign: 'center'}}
                  className='playerButtons' >
              Close
              </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
