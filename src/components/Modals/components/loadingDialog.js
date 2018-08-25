import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import events from 'utils/events'
import modals from 'utils/modals'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {}
  }

  componentDidMount = () => {
    document.querySelector('#loadingDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  componentWillUnmount = () => {
    document.querySelector('#loadingDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  closingDialog() {

    events.emit('canceledLoading')

    if (document.getElementById("loadingDialog"))
      document.getElementById("loadingDialog").close()

    setTimeout(() => {
        modals.close()
    })

  }

  render() {
    return (

        <paper-dialog
            id="loadingDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
              <div id="main-baller" />
              <div className='ball-one' />
              <div className='ball-two' />
              <div className='ball-three' />
            </div>
            
            <div style={{marginTop: '100px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.closingDialog.bind(true)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                Cancel
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
