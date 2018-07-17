import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import { healToken, checkToken } from 'utils/auth'
import api from 'utils/api'
import modals from 'utils/modals'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {}
  }

  componentDidMount = () => {
    document.querySelector('#speedUpDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  componentWillUnmount = () => {

    document.querySelector('#speedUpDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  speedUpYes() {
    api.get({ method: 'speedUp', id: window.lastTorrentId })
    document.getElementById("speedUpDialog").close()
  }

  cancelSpeedUpDialog() {
    document.getElementById("speedUpDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="speedUpDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                Are you sure? This will speed up the current download by pausing all torrents except the last one added.
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.speedUpYes.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Yes
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelSpeedUpDialog.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                No
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
