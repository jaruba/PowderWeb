const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('fastresumebook')

module.exports = {
	get: (pid) => {
		return addresses[pid] || false
	},
	add: (address) => {
		addresses[address.pid] = address
		settings.set('fastresumebook', addresses)
	},
	remove: (pid) => {
		if (addresses[pid]) {
			delete addresses[pid]
			settings.set('fastresumebook', addresses)
		}
	}
}