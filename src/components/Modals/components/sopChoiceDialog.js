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
      pid: false
    }
  }

  componentDidMount = () => {

    console.log('sop choice')

    const pid = this.props.query.pid

    this.setState({ pid })
    document.querySelector('#sopChoiceDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

    document.querySelector('#sopChoiceDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  startWeb() {
    modals.open('sop', { pid: this.state.pid, shouldDo: 'web' })
  }

  streamFiles() {
    modals.open('sop', { pid: this.state.pid, shouldDo: 'playlist' })
  }

  runPlaylist() {
    api.get({ method: 'runSopPlaylist', pid: this.state.pid })
    this.close()
  }

  close() {
    document.getElementById("sopChoiceDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="sopChoiceDialog"
            class="modalScroll"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', overflowX: 'auto'}}
            opened={true}
            with-backdrop >
            <div>
              <div style={{margin: '0', marginBottom: '20px', fontSize: '16px'}}>
                  How would you like to open this link?
              </div>

              <paper-button
                  raised
                  style={{cursor: 'pointer', float: 'none', margin: '0', fontSize: '16px', display: 'block'}}
                  onClick={this.startWeb.bind(this)}
                  className='playerButtons' >
              Stream with Web Player
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
