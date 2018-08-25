const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('addressbook')

const addMissing = (newObj, oldObj, altsToo) => {

	// add utime and opener if their missing

	if (oldObj) {

		if (!newObj.utime && oldObj.utime)
			newObj.utime = oldObj.utime

		if (!newObj.opener && oldObj.opener) {
			if (oldObj.opener.toLowerCase().indexOf(newObj.infoHash || oldObj.infoHash) > -1)
				newObj.opener = oldObj.opener
		}

		if (altsToo) {
			newObj.pulsing = oldObj.pulsing || false
			newObj.forced = oldObj.forced || false
		}

	}

	return newObj
}

module.exports = {
	getAll: (streams) => {
		return _.mapValues(addresses, el => {
			let streamer
			el.running = _.some(streams, (stream) => {
				if (stream && stream.engine && el.infoHash == stream.engine.infoHash) {
					streamer = stream
					return true
				}
			})
			return el
		})
	},
	get: (infoHash) => {
		return addresses[infoHash] ? addresses[infoHash] : false
	},
	getList: (infoHashs) => {
		let results = []
		infoHashs.forEach(hash => {
			results.push(addresses[hash] || {})
		})
		return results
	},
	add: (address) => {
		if (!addresses[address.infoHash]) {
			addresses = Object.assign({ [address.infoHash]: address }, addresses)
			settings.set('addressbook', addresses)
			return true
		} else
			return false
	},
	update: (address) => {
		addresses[address.infoHash] = address
		settings.set('addressbook', addresses)
	},
	updateList: (addressList) => {
		let changed = false
		addressList.forEach(el => {
			if (addresses[el.infoHash]) {

				el = addMissing(el, addresses[el.infoHash], true)

				if (!_.isEqual(el, addresses[el.infoHash])) {
					addresses[el.infoHash] = el
					changed = true
				}
			}
		})
		if (changed)
			settings.set('addressbook', addresses)
	},
	remove: (infoHash) => {
		if (addresses[infoHash]) {
			delete addresses[infoHash]
			settings.set('addressbook', addresses)
		}
	}
}