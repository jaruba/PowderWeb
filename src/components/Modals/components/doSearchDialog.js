import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

import events from 'utils/events'
import modals from 'utils/modals'

const focusInput = (elem) => {
  const focus = () => {
    if (document.getElementById(elem) && !document.getElementById(elem).focused)
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

  componentDidMount = async () => {
    focusInput("addSearchQuery")
    document.getElementById("doSearchDialog").addEventListener('iron-overlay-canceled', this.closingSearchDialog)
    document.querySelector('#doSearchDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))
    document.getElementById("addSearchQuery").addEventListener('paste', this.pasteClipboard);
  }

  componentWillUnmount = () => {

    document.querySelector('#doSearchDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

    document.getElementById("addSearchQuery").removeEventListener('paste', this.pasteClipboard);

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  handleSearchInput() {
    const query = document.getElementById("addSearchQuery").value;
    document.getElementById("doSearchDialog").close()
    document.getElementById("addSearchQuery").value = ''
    modals.open('searchResults', query)
  }

  closingSearchDialog() {
    document.getElementById("doSearchDialog").removeEventListener('iron-overlay-canceled', this.closingSearchDialog)
    document.getElementById("addSearchQuery").value = ''
  }

  cancelDoSearch() {
    document.getElementById("addSearchQuery").value = ''
    document.getElementById("doSearchDialog").removeEventListener('iron-overlay-canceled', this.closingSearchDialog)
    document.getElementById("doSearchDialog").close()
    this.closingDialog()
  }

  pasteClipboard(e) {
    e.stopPropagation()
    e.preventDefault()
    var clipboardData = e.clipboardData || window.clipboardData
    var pastedData = clipboardData.getData('Text')
    document.getElementById("addSearchQuery").value = pastedData
  }

  render() {
    return (
        <paper-dialog
            id="doSearchDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            on-iron-overlay-closed={this.closingSearchDialog}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
              <paper-input
                  id={'addSearchQuery'}
                  label=""
                  style={{cursor: 'pointer', float: 'right', height: '32px', top: '-5px', marginRight: '4px', textAlign: 'left', width: '100%', marginBottom: '15px', padding: '0', marginTop: '0', marginRight: '0'}}
                  onKeyDown={event => event.keyCode === 13 ? this.handleSearchInput() : void 0}
                  onContextMenu={this.pasteClipboard.bind(this)}
                  fullWidth={true}
                  className="dark-input dark-input-large" />
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.handleSearchInput.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Search
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelDoSearch.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                Cancel
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
