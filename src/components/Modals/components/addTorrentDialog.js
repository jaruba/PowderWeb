import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

import events from 'utils/events'

import modals from 'utils/modals'

let checkReadyInterval

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {}
  }

  componentDidMount = () => {

      document.querySelector('#addTorrentDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

      document.querySelector('#addTorrentDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  torrent2magnet() {

    var fileInput = document.getElementById('fileInput')
    if (fileInput && fileInput.files && fileInput.files.length) {
      const file = fileInput.files[0]
      const reader = new FileReader()

      reader.onload = () => {

        const view = new Uint8Array(reader.result)
        const buffer = new Buffer(view.byteLength)

        for (let i = 0; i < buffer.length; ++i)
          buffer[i] = view[i]

        api.addMagnet(parseTorrent.toMagnetURI(parseTorrent(buffer)))

      }

      reader.readAsArrayBuffer(file)
    }
  }

  openAddMagnet() {
    events.emit('openModal', { type: 'addURL' })
  }

  cancelAddTorrent() {
    document.getElementById("addTorrentDialog").close()
    this.closingDialog()
  }

  openLocalMedia() {
    api.get({ method: 'addLocal' })
    this.cancelAddTorrent()
  }

  render() {
    return (

        <paper-dialog
            id="addTorrentDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                How would you like to add your torrent?
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'block'}}>
                <paper-button
                    raised
                    style={{cursor: 'pointer', float: 'none', display: 'block', marginBottom: '10px'}}
                    className='playerButtons-primary' >
                <input style={{ cursor: 'pointer', position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', opacity: '0' }} type="file" id="fileInput" onChange={this.torrent2magnet.bind(this)} />
                From Torrent File
                </paper-button>
                <paper-button
                    raised
                    onClick={this.openAddMagnet.bind(this)}
                    style={{cursor: 'pointer', float: 'none', display: 'block', marginBottom: '10px'}}
                    className='playerButtons' >
                From URL
                </paper-button>
                <paper-button
                    raised
                    onClick={this.openLocalMedia.bind(this)}
                    style={{cursor: 'pointer', float: 'none', display: window.isMaster ? 'block' : 'none', marginBottom: '10px'}}
                    className='playerButtons' >
                From Local Media
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelAddTorrent.bind(this)}
                    style={{cursor: 'pointer', float: 'none', display: 'block', marginBottom: '0px'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>

    )
  }
}
