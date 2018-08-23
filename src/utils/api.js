import 'isomorphic-fetch'
import Frisbee from 'frisbee'
import _ from 'lodash'

import modals from 'utils/modals'

import events from 'utils/events'

import { getParameterByName } from 'utils/misc'

const apiGet = new Frisbee({
  baseURI: window.location.origin,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

const api = {
	frisbee: new Frisbee({
		baseURI: window.location.origin,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
	}),

	get: async (opts, errCb) => {

		const isJson = !!opts.json
		delete opts.json

		const resp = await api.frisbee.get(api.parseUrl(opts, true))

		if (resp && resp.err && errCb) {
			// fetch errors
			if (resp.originalResponse && resp.status == 500 && resp.originalResponse._bodyBlob) {
				if (FileReader) {
					const reader = new FileReader()
					reader.addEventListener('loadend', (e) => {
					  const text = e.srcElement.result
					  if (text)
					  	errCb(text)
					})
					reader.readAsText(resp.originalResponse._bodyBlob)
					return false
				}
			}
		}

		if (!resp || !resp.body)
			return false

		if (isJson) {
			let parsed = false

			try {
				parsed = JSON.parse(resp.body)
			} catch(e) {}

			return parsed
		} else
			return resp.body
	},

	parseUrl: (opts, noToken) => {
		let params = []

		if (!noToken && !opts.token && (localStorage.getItem('token') || getParameterByName('token')))
			opts.token = localStorage.getItem('token') || getParameterByName('token')

		_.each(opts, (el, ij) => {
			if (ij == 'type') return
			params.push(ij+'='+encodeURIComponent(el))
		})

		return '/' + (opts.type || 'actions') + (params.length ? ('?' + params.join('&')) : '')
	},

	secureToken: () => {
		const token = localStorage.getItem('token')
		const expiresOn = localStorage.getItem('expiresOn')

		if (token && expiresOn > Date.now())
			api.frisbee.headers = { ...api.frisbee.headers, authorization: token }
	},

	addMagnet: async (torrentUrl) => {

		const waitForListening = async (utime, hash, cb) => {

		  let checkReadyInterval = setInterval(async () => {

			if (canceledLoading) {
			    if (checkReadyInterval)
					clearInterval(checkReadyInterval)
				checkReadyInterval = false
				return
			}

		    let pattern = { method: 'isListening', json: true }

		    if (utime)
		      pattern.utime = utime

		    if (hash)
		      pattern.hash = hash

		    const parsed = await api.get(pattern)

		    if (parsed && parsed.value) {
		      if (checkReadyInterval)
		        clearInterval(checkReadyInterval)
		      checkReadyInterval = false
		      if (canceledLoading)
		      	return
		      cb(true)
		    }
		  }, 500)

		}

//		cancelAddMagnet()

		if (window.torrentDataPage) {
			await api.get({ method: 'new', torrent: torrentUrl })
			window.location = '/'
			return
		}

		let canceledLoading = false

		const didCancel = () => {
			events.off('canceledLoading', didCancel)
			canceledLoading = true
		}

		events.on('canceledLoading', didCancel)

		modals.open('loading')

		const parsed = await api.get({ method: 'new', torrent: torrentUrl, json: true })

		if (canceledLoading)
			return

		if (parsed && parsed.infoHash) {
			const selectedId = parsed.infoHash
			waitForListening(parsed.utime, false, () => {
				modals.open('stream', { infoHash: selectedId })
			})
		}
	},

	findSubs: async (torrent, file, cb) => {

		const parsed = await api.get({ method: 'getSubs', infohash: torrent.infoHash, id: file.id, json: true })

		if (parsed) {
			console.log(parsed)
			cb && cb(parsed)
		} else {
			console.log('no subs found')
			cb && cb(false)
		}
	}
}

export default api
