import {
  LOGIN,
  LOGIN_SUCCESS,
  LOGIN_FAILED,
  LOGOUT,
  LOGOUT_SUCCESS,
  SIGN_UP,
  SIGN_UP_FAILED,
  CLEAR_ERRORS,
} from './constants'

export function login (user, from) {
  return {
    type: LOGIN,
    payload: user,
    meta: {
      from,
    },
  }
}

export function loginSuccess (user) {
  return {
    type: LOGIN_SUCCESS,
    payload: user,
  }
}

export function loginFailed (errors) {
  return {
    type: LOGIN_FAILED,
    payload: errors,
  }
}

export function logout () {
  window.isMaster = false
  return {
    type: LOGOUT,
  }
}

export function logoutSuccess () {
  return {
    type: LOGOUT_SUCCESS,
  }
}

export function signUp (user, from) {
  return {
    type: SIGN_UP,
    payload: user,
    meta: {
      from,
    },
  }
}

export function clearErrors () {
  return {
    type: CLEAR_ERRORS,
    payload: [],
  }
}

export function signUpFailed (errors) {
  return {
    type: SIGN_UP_FAILED,
    payload: errors,
  }
}
