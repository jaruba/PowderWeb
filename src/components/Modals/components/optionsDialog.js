import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'
import events from 'utils/events'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      default: ''
    }
  }

  componentWillMount = () => {

    this.setState(this.props.query)

  }

  componentDidMount = () => {

    document.getElementById("optionsDialog").addEventListener('iron-overlay-canceled', this.closingOptionsDialog)

  }

  componentWillUnmount = () => {

  }

  cancelOptionsDialog() {
    document.getElementById("optionsDialog").removeEventListener('iron-overlay-canceled', this.closingOptionsDialog)
    document.getElementById("optionsDialog").close()
    events.emit('optionsDialogClose')
  }

  closingOptionsDialog() {
    document.getElementById("optionsDialog").removeEventListener('iron-overlay-canceled', this.closingOptionsDialog)
    events.emit('optionsDialogClose')
  }

  handleOptions() {

    const newValues = []

    _.forEach(this.state.options, (el, ij) => {
      if (this.refs[ij].checked)
        newValues.push(ij)
    })

    const newUserValue = newValues.length ? newValues.join(',') : 'all'

    events.emit('optionsDialogValue', newUserValue)
    this.cancelOptionsDialog()
  }

  resetOptions() {
    _.forEach(this.state.options, (el, ij) => {
      if (this.refs[ij].checked)
        this.refs[ij].checked = false
    })
  }

  optionsList() {

    let selectedOpts = []

    if (this.state.default && this.state.default != 'all') {
      selectedOpts = this.state.default.split(',')
    }

    let opts = []

    _.forEach(this.state.options, (el, ij) => {

        const isChecked = !!selectedOpts.includes(ij)

        const newOpt = (
          <label class="control control--checkbox">{el}
            <input ref={ij} defaultChecked={isChecked} type="checkbox"/>
            <div class="control__indicator"></div>
          </label>
        )

        opts.push(newOpt)
    })
    return opts
  }

  render() {
    return (
        <paper-dialog
            id="optionsDialog"
            style={{display: 'none', width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            on-iron-overlay-closed={this.closingOptionsDialog.bind(this)}
            opened={true}
            with-backdrop >

            {this.state.label}
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px', height: '200px', overflowX: 'hidden', overflowY: 'scroll'}}>
              {this.optionsList()}
            </div>
            
            <div style={{marginTop: '25px', marginBottom: '0', display: 'inline-block'}}>
                <paper-button
                    raised
                    onClick={this.handleOptions.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Set Value
                </paper-button>
                <paper-button
                    raised
                    onClick={this.resetOptions.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0', marginRight: '15px'}}
                    className='playerButtons' >
                Reset
                </paper-button>
                <paper-button
                    raised
                    onClick={this.cancelOptionsDialog.bind(this)}
                    style={{cursor: 'pointer', float: 'none', margin: '0'}}
                    className='playerButtons' >
                Close
                </paper-button>
            </div>
        </paper-dialog>
    )
  }
}
