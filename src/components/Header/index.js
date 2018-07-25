import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import api from 'utils/api'
import events from 'utils/events'
import isElectron from 'utils/electron'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      title: 'Powder Web'
    }
  }

  componentDidMount = () => {
    events.on('windowTitleUpdate', this.setTitle);

    // hack to bypass closing modals when window header is clicked:

    function isHover(e) {
      return (e.parentElement.querySelector(':hover') === e);
    }

    document.querySelector('header').addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      if (isHover(document.querySelector('.headerToolbar .controls'))) {
        if (isHover(document.querySelector('.headerToolbar .controls .closeWindow'))) {
          this.closeWindow()
          if (window.player && window.player.paused && !window.player.paused()) {
            window.player.pause()
          }
        } else if (isHover(document.querySelector('.headerToolbar .controls .minimize'))) {
          this.toggleMinimize()
        } else if (isHover(document.querySelector('.headerToolbar .controls .toggleMaximize'))) {
          this.toggleMaximize()
        }
      }
    })
  }

  componentWillUnmount = () => {
    events.removeListener('windowTitleUpdate', this.setTitle);
  }

  setTitle(title) {
      this.setState({
          title: title
      });
  }

  toggleMaximize() {
    api.get({ method: 'toggleMaximize' })
  }

  toggleMinimize() {
    api.get({ method: 'minimize' })
  }

  closeWindow() {
    api.get({ method: 'closeWindow'})
  }

  render() {
    return (
        <div className="headerHolder">
          <header className="headerToolbar">
              <div className={'controls'}>
                  <div className="closeWindow">
                      <i/>
                  </div>
                  <div className="toggleMaximize">
                      <i/>
                      <i/>
                  </div>
                  <div className="minimize">
                      <i/>
                  </div>
              </div>
              <div className="windowTitle">
                  {this.state.title}
              </div>
          </header>
        </div>
    );
  }
}
