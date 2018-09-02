const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('ytdlbook')

module.exports = {
	getAll: () => {
		return addresses
	},
	get: (pid) => {
		return addresses[pid] || false
	},
	add: (address) => {
		addresses[address.pid] = address
		settings.set('ytdlbook', addresses)
	},
	remove: (pid) => {
		if (addresses[pid]) {
			delete addresses[pid]
			settings.set('ytdlbook', addresses)
		}
	}
}