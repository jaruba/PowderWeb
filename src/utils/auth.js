import * as R from 'ramda'
import querystring from 'query-string'
import openPopup from 'utils/popup'
import api from 'utils/api'
import { replace } from 'react-router-redux'
import events from 'utils/events'
import { getParameterByName } from 'utils/misc'

const listenForCredentials = (popup, resolve, reject) => {
  let hash
  try {
    hash = popup.location.hash
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      /* eslint-disable no-console */
      console.error(err)
      /* eslint-enable no-console */
    }
  }

  if (hash) {
    popup.close()

    const response = querystring.parse(hash.substr(1))

    if (response.access_token) {
      const expiresIn = response.expires_in
        ? parseInt(response.expires_in)
        : NaN
      const result = {
        token: response.access_token,
        expiresAt: !isNaN(expiresIn)
          ? new Date().getTime() + expiresIn * 1000
          : null,
      }
      resolve(result)
    } else {
      reject(response.error || 'Unknown error.')
    }
  } else if (popup.closed) {
    reject('Authentication was cancelled.')
  } else {
    setTimeout(() => listenForCredentials(popup, resolve, reject), 100)
  }
}

export const authorize = config => {
  const query = querystring.stringify({
    response_type: config.response_type,
    redirect_url: config.redirect,
  })
  const url = config.url + (config.url.indexOf('?') === -1 ? '?' : '&') + query
  const width = config.width || 400
  const height = config.height || 400
  const popup = openPopup(url, 'oauth2', width, height)

  return new Promise((resolve, reject) =>
    listenForCredentials(popup, resolve, reject),
  )
}

export function getNextRoute (action) {
  const nextPath = R.path(['meta', 'from', 'pathname'], action)
  return nextPath && nextPath !== '/auth' ? nextPath : '/'
}

export function storeCredentials (token, expiresOn) {
  localStorage.setItem('token', token)
  localStorage.setItem('expiresOn', expiresOn)
}

export function getToken () {
  return localStorage.getItem('token') || null
}

export function getExpiresOn () {
  return localStorage.getItem('expiresOn') || 0
}

export function storeUser (user) {
  localStorage.setItem('user', JSON.stringify(user))
}

export function getUser () {
  const user = localStorage.getItem('user')
  return user !== 'undefined' ? JSON.parse(user) : null
}

function logout () {
  localStorage.setItem('token', null)
  localStorage.setItem('expiresOn', 0)
}

export function logout () {
  localStorage.setItem('token', null)
  localStorage.setItem('expiresOn', 0)
}

let virgin = true

export function healToken (cb) {
  virgin = true
  cb && cb()
}

export function checkToken (validate, cb) {
  const check = async () => {
    let queryToken = getParameterByName('token')
    const localToken = localStorage.getItem('token')
    if (queryToken && queryToken != localToken) {
      localStorage.setItem('token', queryToken)
      localStorage.setItem('expiresOn', (Date.now() + 604800000))
    }
    if (!queryToken && localToken) {
      queryToken = localToken
    }

    if (!queryToken) {
      return
    }

    const body = await api.get({ method: 'validToken', token: queryToken })
    if (!body || body == '"0"') {
      localStorage.setItem('token', null)
      localStorage.setItem('expiresOn', 0)
      if (validate)
        window.location.reload()
    } else if (body) {
      if (body == '"2"' && !window.isMaster) {
        window.isMaster = true
      } else {
        window.isMaster = false
      }
      events.emitEvent('updateNav')

      if (!validate) {
        window.location.replace('/')
      }
    }
    cb && cb()
  }
  if (virgin) {
    virgin = false
    check()
  }
}

export default authorize
