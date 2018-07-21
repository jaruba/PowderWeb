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
      subs: [],
      filename: '',
      pressed: []
    }
  }

  componentDidMount = () => {

    const pQuery = this.props.query

    pQuery.pressed = []

    this.setState(pQuery)

    document.querySelector('#subtitleListDialog').addEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  componentWillUnmount = () => {

      document.querySelector('#subtitleListDialog').removeEventListener('iron-overlay-closed', this.closingDialog.bind(this))

  }

  closingDialog() {
    setTimeout(() => {
        modals.close()
    })
  }

  close() {
    document.getElementById("subtitleListDialog").close()
    this.closingDialog()
  }

  downloadSub = (sub, ij) => {

    const subLink = window.atob(sub.src.split('from=')[1])

    if (isElectron()) {

      api.get({ method: 'downloadFile', file: window.btoa(subLink) })

    } else {

      window.open(subLink, "_blank")

    }

    const pressed = this.state.pressed

    pressed.push(ij)

    this.setState({
      pressed: pressed,
      update: Date.now()
    })

  }

  getSubtitleList() {
    if (this.state.subs && this.state.subs.length) {
      let subList = []

      let backColor = '#3e3e3e'

      this.state.subs.forEach((el, ij) => {

        backColor = backColor == '#444' ? '#3e3e3e' : '#444'

        const subItem = (
          <div key={'subs-'+ij} className="dashboardFile" style={{backgroundColor: backColor}}>
              <div className="torrentFile" onClick={this.downloadSub.bind(this, el, ij)}>
                  <div className="torrentFileDetails" style={{marginTop: '8px', fontSize: '16px', marginLeft: '18px', marginBottom: '27px', opacity: this.state.pressed.indexOf(ij) > -1 ? '0.7' : '1' }}>
                      <div className="torrentFileName" style={{marginBottom: '7px'}}>{el.label}</div>
                  </div>
                  <div style={{clear: 'both'}} />
              </div>
              <div style={{clear: 'both'}} />
          </div>
        )
        subList.push(subItem)
      })
      return subList
    }
    return []
  }

  render() {
    return (
        <paper-dialog
            id="subtitleListDialog"
            class="modalScroll"
            horizontal-align="left"
            horizontal-offset="0"
            style={{display: 'none', maxWidth: '100%', width: '100%', padding: '0', marginTop: '57px', marginBottom: '0px', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'left', borderRadius: '0', overflow: 'auto', height: 'calc(100% - 57px)'}}
            opened={true}
            with-backdrop >
            <div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'left', padding: '0', marginBottom: '6px', lineHeight: '39px', fontSize: '16px', opacity: '0.7', textTransform: 'uppercase', marginLeft: '10px'}}>
                Subtitles for "{this.state.filename}"
              </div>
              <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'right', padding: '0', marginBottom: '6px'}}>
                <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={this.close.bind(this)} icon="close" />
              </div>
              <div style={{clear: 'both'}}/>

              {this.getSubtitleList()}

            </div>
        </paper-dialog>
    )
  }
}
