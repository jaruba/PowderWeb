const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('acenamebook')

module.exports = {
	getAll: () => {
		return addresses
	},
	get: (pid) => {
		return addresses[pid]
	},
	add: (pid, name) => {
		addresses[pid] = name
		settings.set('acenamebook', addresses)
	},
	remove: (pid) => {
		if (addresses[pid]) {
			delete addresses[pid]
			settings.set('acenamebook', addresses)
		}
	}
}