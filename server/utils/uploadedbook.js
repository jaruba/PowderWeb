const settings = require('electron-settings')

let addresses = settings.get('uploaded')

module.exports = {
	get: (iHash) => {
		return addresses[iHash] || 0
	},
	add: (iHash, uploaded) => {
		addresses[iHash] = uploaded
		settings.set('uploaded', addresses)
	},
	remove: (iHash) => {
		if (addresses[iHash]) {
			delete addresses[iHash]
			settings.set('uploaded', addresses)
		}
	}
}
