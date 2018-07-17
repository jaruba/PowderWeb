import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

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

    this.state = {}
  }

  componentDidMount = () => {

    focusInput("addMagnetUrl")
    document.getElementById("addURLDialog").addEventListener('iron-overlay-canceled', this.closingAddUrlDialog)

    document.getElementById("addMagnetUrl").addEventListener('paste', this.pasteClipboard);
  }

  componentWillUnmount = () => {
    document.getElementById("addMagnetUrl").removeEventListener('paste', this.pasteClipboard);
  }

  handleAddMagnetInput() {
    const torrentUrl = document.getElementById("addMagnetUrl").value
    document.getElementById("addMagnetUrl").value = ''

    api.addMagnet(torrentUrl)

    document.getElementById("addURLDialog").close()
  }

  cancelAddMagnet() {
    document.getElementById("addMagnetUrl").value = ''
    document.getElementById("addURLDialog").removeEventListener('iron-overlay-canceled', this.closingAddUrlDialog)
    document.getElementById("addURLDialog").close()
  }

  closingAddUrlDialog() {
    document.getElementById("addURLDialog").removeEventListener('iron-overlay-canceled', this.closingAddUrlDialog)
    document.getElementById("addMagnetUrl").value = ''
  }


  pasteClipboard(e) {
    e.stopPropagation()
    e.preventDefault()
    var clipboardData = e.clipboardData || window.clipboardData
    var pastedData = clipboardData.getData('Text')
    document.getElementById("addMagnetUrl").value = pastedData
  }

  render() {
    return (
        <paper-dialog
            id="addURLDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            on-iron-overlay-closed={this.closingAddUrlDialog.bind(this)}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
              <paper-input
                  id={'addMagnetUrl'}
                  label="Magnet URI, HTTP or HTTPS"
                  style={{cursor: 'pointer', float: 'right', height: '32px', top: '-5px', marginRight: '4px', textAlign: 'left', width: '100%', marginBottom: '15px', padding: '0', marginTop: '0', marginRight: '0'}}
                  onKeyDown={event => event.keyCode === 13 ? this.handleAddMagnetInput() : void 0}
                  fullWidth={true}
                  className="dark-input dark-input-large" />
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.handleAddMagnetInput.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Load URL
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelAddMagnet.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
