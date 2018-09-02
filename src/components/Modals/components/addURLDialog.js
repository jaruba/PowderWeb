import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import modals from 'utils/modals'
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

  handleAddMagnetInput = async () => {
    const torrentUrl = document.getElementById("addMagnetUrl").value
    document.getElementById("addMagnetUrl").value = ''
    if (torrentUrl.startsWith('acestream://')) {
      const aceHash = torrentUrl.replace('acestream://', '')

      const parsed = await api.get({ method: 'haveAce', json: true })
      if (!parsed || !parsed.hasAcestream) {
        modals.open('aceInstall', { pid: aceHash })
      } else {
        modals.open('aceChoice', { pid: aceHash })
      }
    } else if (torrentUrl.startsWith('sop://')) {
      const sopHash = torrentUrl

      const parsed = await api.get({ method: 'haveSop', json: true })
      if (!parsed || !parsed.hasSopcast) {
        modals.open('sopInstall', { pid: sopHash })
      } else {
        modals.open('sopChoice', { pid: sopHash })
      }
    } else {
      const urlType = await api.get({ method: 'urlType', pid: torrentUrl, json: true })

      if (urlType) {
        if (urlType.isTorrent) {
          api.addMagnet(torrentUrl)
        } else if (urlType.isYoutubeDl) {

          modals.open('loading')

          let isCanceled = false

          const hasCanceled = () => {
            events.off('canceledLoading', hasCanceled)
            isCanceled = true
          }

          events.on('canceledLoading', hasCanceled)

          const ytdlObj = await api.get({ method: 'ytdlAdd', pid: torrentUrl, json: true })
          if (ytdlObj && ytdlObj.extracted && !isCanceled) {
            modals.open('ytdlOpts', { ytdl: ytdlObj })
          } else {
            modals.open('message', { message: 'Could not load Youtube-DL link' })
          }
        }
      }
    }

    if (document.getElementById("addURLDialog"))
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
                  label="Magnet URI, AceStream, SopCast or Link"
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
