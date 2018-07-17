import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import events from 'utils/events'

const focusInput = (elem) => {
  const focus = () => {
    if (!document.getElementById(elem).focused)
      document.getElementById(elem).$.nativeInput.focus()
  }
  for (var i = 0; i <= 1000; i += 150)
    setTimeout(focus, i)
}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      default: ''
    }
  }

  componentDidMount = () => {

    focusInput("inputQuery")

    document.getElementById("inputDialog").addEventListener('iron-overlay-canceled', this.closingInputDialog)

    this.setState(this.props.query)

    document.getElementById("inputQuery").addEventListener('paste', this.pasteClipboard);
  }

  componentWillUnmount = () => {
    document.getElementById("inputQuery").removeEventListener('paste', this.pasteClipboard);
  }

  cancelInputDialog() {
    document.getElementById("inputQuery").value = ''
    document.getElementById("inputDialog").removeEventListener('iron-overlay-canceled', this.closingInputDialog)
    document.getElementById("inputDialog").close()
    events.emit('inputDialogClose')
  }

  closingInputDialog() {
    document.getElementById("inputDialog").removeEventListener('iron-overlay-canceled', this.closingInputDialog)
    document.getElementById("inputQuery").value = ''
    events.emit('inputDialogClose')
  }

  pasteClipboard(e) {
    e.stopPropagation()
    e.preventDefault()
    var clipboardData = e.clipboardData || window.clipboardData
    var pastedData = clipboardData.getData('Text')
    document.getElementById("inputQuery").value = pastedData
  }

  handleInput() {
    events.emit('inputDialogValue', document.getElementById("inputQuery").value)
    this.cancelInputDialog()
  }

  render() {
    return (
        <paper-dialog
            id="inputDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            on-iron-overlay-closed={this.closingInputDialog.bind(this)}
            opened={true}
            with-backdrop >

            {this.state.label}
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
              <paper-input
                  id={'inputQuery'}
                  value={this.state.default}
                  style={{cursor: 'pointer', float: 'right', height: '32px', top: '-5px', marginRight: '4px', textAlign: 'left', width: '100%', marginBottom: '15px', padding: '0', marginTop: '0', marginRight: '0'}}
                  onKeyDown={event => event.keyCode === 13 ? this.handleInput() : void 0}
                  allowed-pattern={this.state.allowRule || "[\\d]"}
                  maxlength={this.state.maxLength || 0}
                  fullWidth={true}
                  className="dark-input dark-input-large" />
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.handleInput.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Set Value
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelInputDialog.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
