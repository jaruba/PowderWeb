const _ = require('lodash')
const settings = require('electron-settings')

let addresses = settings.get('sopbook')

if (_.size(addresses)) {
	for (var pid in addresses) {
		addresses[pid].running = false
		if (addresses[pid].directLink)
			delete addresses[pid].directLink
		if (addresses[pid].transcodeLink)
			delete addresses[pid.transcodeLink]
	}
}

module.exports = {
	getAll: () => {
		return addresses
	},
	get: (pid) => {
		return addresses[pid] || false
	},
	add: (address) => {
		addresses[address.pid] = address
		settings.set('sopbook', addresses)
	},
	remove: (pid) => {
		if (addresses[pid]) {
			delete addresses[pid]
			settings.set('sopbook', addresses)
		}
	}
}