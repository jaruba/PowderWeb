import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Route, Switch, withRouter } from 'react-router-dom'
import Network from 'react-network'
import { Theme, Icon } from 'react-interface'

// Elements
import { Notification } from 'elements'

// Actions
import { logout } from 'containers/Auth/actions'
import { setNotification, setNetworkStatus } from 'containers/App/actions'

// Top level routes
import DashboardPage from 'containers/Dashboard'
import TorrentInfoPage from 'containers/TorrentInfo'
import AuthPage from 'containers/Auth'

// Components
import ProtectedRoute from 'HOC/ProtectedRoute'
import Header from 'components/Header'
import Navigation from 'components/Navigation'
import Footer from 'components/Footer'
import Modals from 'components/Modals'
import Wrapper from './components/Wrapper'
import Main from './components/Main'

import events from 'utils/events'

import Player from 'components/Player'

import EmbedPlayer from 'components/EmbedPlayer'

import api from 'utils/api'

import isElectron from 'utils/electron'

// Selectors
import {
  selectShowNavigation,
  selectShowFooter,
  selectShowPlayer,
  selectShowEmbedPlayer,
} from './selectors'

class App extends Component {
  handleNetworkChange = ({ online }) => {
    this.props.actions.setNetworkStatus(online)
  }

  renderLoading (loading) {
    return loading ? <p>Loading...</p> : null
  }

  renderRoute (history) {
    return (
      <Switch>
        <ProtectedRoute path="/" exact component={DashboardPage} {...this.props} />
        <ProtectedRoute path="/torrent" exact component={TorrentInfoPage} {...this.props} />
        <Route path="/auth" exact component={AuthPage} />
      </Switch>
    )
  }

  renderNotifications (notification) {
    if (!notification) return null
    return (
      <Notification
        notification={notification}
        setNotification={this.props.actions.setNotification}
      />
    )
  }

  renderNavigation (showNavigation, logout, online) {
    if (!showNavigation) return null
    return <Navigation logout={logout} online={online} props={this.props} />
  }

  renderEmbedPlayer (showEmbed) {
    if (!showEmbed) return null
    return (
      <EmbedPlayer />
    )
  }

  renderPlayer (showPlayer) {
    if (!showPlayer) return null
    return (
      <Player />
    )
  }

  renderFooter (showFooter) {
    if (!showFooter) return null
    return <Footer />
  }

  update() {
    this.setState({})
  }

  componentWillMount() {
    if (isElectron()) {
      document.querySelector('body').classList.add('isElectron')
    }
  }

  componentDidMount() {
    events.addListener('updateNav', this.update.bind(this))
  }

  componentWillUnmount() {
    events.removeListener('updateNav', this.update.bind(this))
  }

  render () {
    const {
      loading,
      notification,
      history,
      user,
      showNavigation,
      showFooter,
      showPlayer,
      showEmbedPlayer,
      actions,
    } = this.props

    return (
      <Network
        onChange={this.handleNetworkChange}
        render={({ online }) => (
          <Theme>
            <Wrapper>
              <Header />
              {this.renderNavigation(showNavigation, actions.logout, online)}
              <Main className="nodragwindow">
                {this.renderNotifications(notification)}
                {this.renderLoading(loading)}
                {this.renderRoute(history)}
              </Main>
              {this.renderFooter(showFooter)}
              <Modals />
              {this.renderPlayer(showPlayer)}
              {this.renderEmbedPlayer(showEmbedPlayer)}
            </Wrapper>
          </Theme>
        )}
      />
    )
  }
}

App.propTypes = {
  actions: PropTypes.object,
  user: PropTypes.object,
  notification: PropTypes.string,
  loading: PropTypes.bool,
  location: PropTypes.object,
}

App.defaultProps = {
  actions: {},
  history: {},
  location: {},
  user: null,
  notification: null,
  online: true,
  loading: false,
}

const mapStateToProps = state => ({
  notification: state.global.notification,
  online: state.global.online,
  loading: state.global.loading,
  location: state.route.location,
  user: state.auth.user,
  showNavigation: selectShowNavigation(state),
  showFooter: selectShowFooter(state),
  showPlayer: selectShowPlayer(state),
  showEmbedPlayer: selectShowEmbedPlayer(state),
})

function mapDispatchToProps (dispatch) {
  return {
    actions: bindActionCreators({
      setNotification,
      setNetworkStatus,
      logout,
    }, dispatch),
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(App))
