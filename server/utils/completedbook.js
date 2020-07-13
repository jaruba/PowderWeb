const settings = require('electron-settings')

let addresses = settings.get('completed')

module.exports = {
	get: (iHash) => {
		return addresses[iHash] || false
	},
	add: (iHash) => {
		addresses[iHash] = true
		settings.set('completed', addresses)
	},
	remove: (iHash) => {
		if (addresses[iHash]) {
			delete addresses[iHash]
			settings.set('completed', addresses)
		}
	}
}
