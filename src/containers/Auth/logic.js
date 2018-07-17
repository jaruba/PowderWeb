import { createLogic } from 'redux-logic'
import { push } from 'react-router-redux'
import { authorize, storeCredentials, storeUser, getNextRoute, logout } from 'utils/auth'
import { LOGIN, LOGOUT, SIGN_UP, CLEAR_ERRORS } from './constants'
import { userSchema, sessionSchema } from './schema'
import {
  loginSuccess,
  loginFailed,
  logoutSuccess,
  signUpFailed,
  clearErrors,
} from './actions'

/**
  Logs in user, setting JWT and profile in local storage
  @param {object} api - api client
  @return {object} user - user attributes
  @throws {error} fetchError - any fetching error
 */
const loginLogic = createLogic({
  type: LOGIN,
  latest: true,
  warnTimeout: 0,
  async validate ({ api, action }, allow, reject) {
    // can also hit server to check
    const user = action.payload
    let validated = false
    try {
      await sessionSchema.validate(user, { abortEarly: false })
      validated = true
    } catch (e) {
      reject(loginFailed(e.errors))
    }

    if (validated) {
      const body = await api.get({ method: 'login', value: JSON.stringify(user) })
      if (body) {
        let parsed

        try {
          parsed = JSON.parse(body)
        } catch(e) {

        }
        if (parsed && !parsed.error && parsed.token) {
          action.payload.token = parsed.token
          action.payload.expiresOn = parsed.expiresOn
          allow(action)
        } else {
          reject(loginFailed([parsed && parsed.error ? parsed.error : 'Invalid server response']))
        }
      } else {
        reject(loginFailed(['Could not connect to server']))
      }
    }
  },
  async process ({ api, action }, dispatch, done) {

    // Store credentials in localStorage and update api headers
    storeCredentials(action.payload.token, action.payload.expiresOn)
    api.frisbee.headers = { ...api.frisbee.headers, authorization: action.payload.token }

    dispatch(loginSuccess(action.payload))
//    const nextRoute = getNextRoute(action)
    const nextRoute = '/'
    dispatch(push(nextRoute))
    done()
  },
})

const signUpLogic = createLogic({
  type: SIGN_UP,
  latest: true,
  warnTimeout: 0,
  async validate ({ api, action }, allow, reject) {
    // can also hit server to check
    const user = action.payload
    let validated = false
    try {
      await userSchema.validate(user, { abortEarly: false })
      validated = true
    } catch (e) {
      reject(signUpFailed(e.errors))
    }

    if (validated) {
      if (user.confirm != user.password) {
        reject(loginFailed(['Passwords don\'t match']))
        return
      }
      const body = await api.get({ method: 'signup', value: JSON.stringify(user) })

      if (body) {

        let parsed

        try {
          parsed = JSON.parse(body)
        } catch(e) {

        }

        if (parsed && !parsed.error && parsed.token) {
          action.payload.token = parsed.token
          action.payload.expiresOn = parsed.expiresOn
          allow(action)
        } else {
          reject(signUpFailed([parsed && parsed.error ? parsed.error : 'Invalid server response']))
        }
      } else {
        reject(loginFailed(['Could not connect to server']))
      }

    }
  },
  async process ({ api, action }, dispatch, done) {

    // Store credentials in localStorage and update api headers
    storeCredentials(action.payload.token, action.payload.expiresOn)
    api.frisbee.headers = { ...api.frisbee.headers, authorization: action.payload.token }

    dispatch(loginSuccess(action.payload))
    const nextRoute = getNextRoute(action)
    dispatch(push(nextRoute))
    done()
  },
})

const logoutLogic = createLogic({
  type: LOGOUT,
  latest: true,
  process (_, dispatch, done) {
    logout()
    dispatch(logoutSuccess())
    dispatch(push('/auth'))
    done()
  },
})


const clearErrorsLogic = createLogic({
  type: CLEAR_ERRORS,
  latest: true,
  warnTimeout: 0,
  async process ({ action }, dispatch, done) {
    clearErrors()
    done()
  },
})

export default [
  loginLogic,
  signUpLogic,
  logoutLogic,
  clearErrorsLogic
]
