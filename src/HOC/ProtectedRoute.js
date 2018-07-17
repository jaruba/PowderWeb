import React from 'react'
import { connect } from 'react-redux'
import { Route, Redirect } from 'react-router-dom'
import { checkToken } from 'utils/auth'

const renderRoute = (props, Component) => {

  const showAuth = () => {
    return (
      <Redirect to={{
        pathname: '/auth',
        state: { from: props.location },
      }} />
    )
  }

  if (!props.token || props.expiresOn < Date.now()) {
    return showAuth()
  } else {
    checkToken(true)
  }

  return <Component {...props} />
}

const ProtectedRoute = ({ component: Component, ...rest }) => (
  <Route
    {...rest}
    render={props => renderRoute({ ...rest, ...props }, Component)}
  />
)

const mapStateToProps = ({ auth }) => ({
  token: auth.token,
  expiresOn: auth.expiresOn
})

export default connect(mapStateToProps)(ProtectedRoute)
