import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import { healToken, checkToken } from 'utils/auth'
import api from 'utils/api'
import player from 'utils/player'

import DeleteAllDialog from './components/deleteAllDialog'
import SpeedUpDialog from './components/speedUpDialog'
import AddURLDialog from './components/addURLDialog'
import StreamDialog from './components/streamDialog'
import DoSearchDialog from './components/doSearchDialog'
import LoadingDialog from './components/loadingDialog'
import EmbedLoadingDialog from './components/embedLoadingDialog'
import AddTorrentDialog from './components/addTorrentDialog'
import SearchResultsDialog from './components/searchResultsDialog'
import TorrentOptsDialog from './components/torrentOptsDialog'
import FileOptsDialog from './components/fileOptsDialog'
import SettingsDialog from './components/settingsDialog'
import InputDialog from './components/inputDialog'
import OptionsDialog from './components/optionsDialog'
import HistoryListDialog from './components/historyListDialog'
import SubtitleListDialog from './components/subtitleListDialog'
import MessageDialog from './components/messageDialog'
import AceDialog from './components/aceDialog'
import AceOptsDialog from './components/aceOptsDialog'
import AceChoiceDialog from './components/aceChoiceDialog'
import AceInstallDialog from './components/aceInstallDialog'
import AceNotInstalledDialog from './components/aceNotInstalledDialog'
import QrCodeDialog from './components/qrcodeDialog'
import SopDialog from './components/sopDialog'
import SopOptsDialog from './components/sopOptsDialog'
import SopChoiceDialog from './components/sopChoiceDialog'
import SopInstallDialog from './components/sopInstallDialog'
import SopNotInstalledDialog from './components/sopNotInstalledDialog'
import LocalOptsDialog from './components/localOptsDialog'
import YtdlOptsDialog from './components/ytdlOptsDialog'

import events from 'utils/events'


export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      type: ''
    }
  }

  componentDidMount = () => {
    events.on('openModal', (modalState) => {
      if (document.getElementById('playerOptsDialog') && document.getElementById('playerOptsDialog').opened) {
        player.modal.close()
      }
      if (modalState.type == this.state.type) {
        // remove it first
//        if (document.getElementById(this.state.type+"Dialog") && document.getElementById(this.state.type+"Dialog").opened) {
          this.setState({ type: '' })
//        } else {
//          this.setState({ type: '' })
//          setTimeout(() => {
//            this.setState(modalState)
//          })
//        }
      } else {
        setTimeout(() => {
          this.setState(modalState)
        }, 100)
      }
    })
    events.on('closeModal', () => {
      this.setState({
        type: ''
      })
    })

  }

  componentWillUnmount = () => {

  }

  getContents() {
      switch (this.state.type) {
          case 'deleteAll':
              return <DeleteAllDialog />;
              break;
          case 'speedUp':
              return <SpeedUpDialog />;
              break;
          case 'addURL':
              return <AddURLDialog />;
              break;
          case 'stream':
              return <StreamDialog query={this.state.query} />;
              break;
          case 'doSearch':
              return <DoSearchDialog />;
              break;
          case 'loading':
              return <LoadingDialog />;
              break;
          case 'embedLoading':
              return <EmbedLoadingDialog />;
              break;
          case 'addTorrent':
              return <AddTorrentDialog />;
              break;
          case 'searchResults':
              return <SearchResultsDialog query={this.state.query} />;
              break;
          case 'torrentOpts':
              return <TorrentOptsDialog query={this.state.query} />;
              break;
          case 'fileOpts':
              return <FileOptsDialog query={this.state.query} />;
              break;
          case 'settings':
              return <SettingsDialog query={this.state.query} />;
              break;
          case 'input':
              return <InputDialog query={this.state.query} />;
              break;
          case 'options':
              return <OptionsDialog query={this.state.query} />;
              break;
          case 'historyList':
              return <HistoryListDialog query={this.state.query} />;
              break;
          case 'subtitleList':
              return <SubtitleListDialog query={this.state.query} />;
              break;
          case 'message':
              return <MessageDialog query={this.state.query} />;
              break
          case 'ace':
              return <AceDialog query={this.state.query} />;
              break
          case 'aceOpts':
              return <AceOptsDialog query={this.state.query} />;
              break
          case 'aceChoice':
              return <AceChoiceDialog query={this.state.query} />;
              break
          case 'aceInstall':
              return <AceInstallDialog query={this.state.query} />;
              break
          case 'aceNotInstalled':
              return <AceNotInstalledDialog query={this.state.query} />;
              break
          case 'qrCode':
              return <QrCodeDialog query={this.state.query} />;
              break
          case 'sop':
              return <SopDialog query={this.state.query} />;
              break
          case 'sopOpts':
              return <SopOptsDialog query={this.state.query} />;
              break
          case 'sopChoice':
              return <SopChoiceDialog query={this.state.query} />;
              break
          case 'sopInstall':
              return <SopInstallDialog query={this.state.query} />;
              break
          case 'sopNotInstalled':
              return <SopNotInstalledDialog query={this.state.query} />;
              break
          case 'localOpts':
              return <LocalOptsDialog query={this.state.query} />;
              break
          case 'ytdlOpts':
              return <YtdlOptsDialog query={this.state.query} />;
              break
      }
  }

  render() {
    return (
      <div style={{width: '0px', height: '0px'}}>
        {this.getContents()}
      </div>
    )
  }
}
