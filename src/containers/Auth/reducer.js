import { getToken, getExpiresOn } from 'utils/auth'
import { LOGIN_SUCCESS, LOGIN_FAILED, SIGN_UP_FAILED, CLEAR_ERRORS } from './constants'

const initialState = {
  token: getToken(),
  expiresOn: getExpiresOn()
}

function authReducer (state = initialState, action) {
  switch (action.type) {
    case LOGIN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        expiresOn: action.payload.expiresOn
      }
    case LOGIN_FAILED:
      return {
        ...state,
        errors: action.payload,
      }
    case SIGN_UP_FAILED:
      return {
        ...state,
        errors: action.payload,
      }
    case CLEAR_ERRORS:
      return {
        ...state,
        errors: [],
      }
    default:
      return state
  }
}

export default authReducer
