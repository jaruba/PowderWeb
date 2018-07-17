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

    this.state = {
      message: ''
    }
  }

  componentDidMount = () => {
    this.setState(this.props.query)
    document.querySelector('#messageDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
  }

  componentWillUnmount = () => {

    document.querySelector('#messageDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  closeMessage() {
    document.getElementById("messageDialog").close()
    this.closingDialog()
  }

  render() {
    return (
        <paper-dialog
            id="messageDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                <span dangerouslySetInnerHTML={{__html: this.state.message}} />
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.closeMessage.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                I Understand
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
