import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Center, Panel, FormError } from 'elements'
import { login, signUp, clearErrors } from './actions'
import Wrapper from './components/Wrapper'
import Login from './components/Login'
import SignUp from './components/SignUp'
import { healToken, checkToken } from 'utils/auth'
import api from 'utils/api'

class Auth extends Component {
  constructor (props) {
    super(props)
    const { pathname, state } = props.location

    this.state = {
      mode: pathname.includes('signUp') ? 'signUp' : 'login',
      from: state ? state.from : null,
      providers: ['email'],
      switchable: false,
    }
  }

  componentDidMount = () => {
    this.checkRegister()
    checkToken(false, healToken())
  }

  checkRegister = async () => {
    const parsed = await api.get({ method: 'allowRegister', json: true })
    if (parsed && parsed.value) {
      this.setState({ switchable: true })
    }
  }

  toggleMode = () => {
    this.props.actions.clearErrors(this.state.from)
    this.setState({
      mode: this.state.mode === 'signUp' ? 'login' : 'signUp',
    })
  }

  handleLogin = user => {
    this.props.actions.login(user, this.state.from)
  }

  handleSignUp = user => {
    this.props.actions.signUp(user, this.state.from)
  }

  renderTitle () {
    if (this.state.mode === 'login')
      return (<h1 style={{ marginTop: '4px', fontSize: '26px' }}>Login</h1>)

    return (<h1 style={{ marginTop: '4px', fontSize: '26px' }}>Register</h1>)
  }

  renderAuth () {

    if (window.isMaster) {
      return (
        <div style={{paddingBottom: '17px'}}>
          Logging in, please wait ...
        </div>
      )
    }

    if (this.state.mode === 'login') {
      return (
        <Login
          onSubmit={this.handleLogin}
          providers={this.state.providers}
          errors={this.props.errors}
        />
      )
    }

    return (
      <SignUp
        onSubmit={this.handleSignUp}
        providers={this.state.providers}
        errors={this.props.errors}
      />
    )
  }

  renderSwitchMode () {
    if (!this.state.switchable || window.isMaster) return null
    return (
      <div onClick={this.toggleMode} style={{ cursor: 'pointer' }}>
        {
          this.state.mode === 'signUp'
            ? <span>Already have an account? <a>Login</a></span>
            : <span>Need an account? <a>Register</a></span>
        }
      </div>
    )
  }

  render () {
    return (
      <Wrapper id="auth">
        <Center id="innerAuth">
          <Panel>
            {this.renderTitle()}
            {this.props.errors.map(e => <FormError key={e}>{e}</FormError>)}
            {this.renderAuth()}
            {this.renderSwitchMode()}
          </Panel>
        </Center>
      </Wrapper>
    )
  }
}

Auth.propTypes = {
  actions: PropTypes.object.isRequired,
  errors: PropTypes.array,
}

Auth.defaultProps = {
  actions: {},
  errors: [],
}

const mapStateToProps = state => ({
  user: state.user,
  errors: state.auth.errors,
})

function mapDispatchToProps (dispatch) {
  return {
    actions: bindActionCreators({
      login,
      signUp,
      clearErrors,
    }, dispatch),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Auth)
