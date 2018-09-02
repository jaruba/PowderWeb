const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('locbook')

module.exports = {
	getAll: () => {
		return addresses
	},
	get: (pid) => {
		return addresses[pid] || false
	},
	add: (address) => {
		addresses[address.pid] = address
		settings.set('locbook', addresses)
	},
	remove: (pid) => {
		if (addresses[pid]) {
			delete addresses[pid]
			settings.set('locbook', addresses)
		}
	}
}