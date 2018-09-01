
const path = require('path')

function isString(str) {
	return !!(str && typeof str == 'string')
}

function isLink(str) {
	return !!(str.startsWith('http://') || str.startsWith('https://'))
}

module.exports = {
	isInfoHash: (str) => {
		return !!(isString(str) && str.length == 40)
	},
	isMagnetLink: (str) => {
		return !!(isString(str) && str.startsWith('magnet:'))
	},
	isTorrentPath: (str) => {
		return !!(isString(str) && str.endsWith('.torrent') && path.isAbsolute(str))
	},
	isTorrentLink: (str) => {
		return (!!isString(str) && isLink(str) && (str.includes('.torrent') || str.includes('jackett_apikey=')))
	}
}
