// this is a shim for electron-settings that
// is used when running in headless mode


const jsonfile = require('jsonfile')
const uniqueString = require('unique-string')
const path = require('path')

const app = require('./electronShim')

const userData = app.getPath('userData')

const configPath = path.join(userData, 'settingsShim.json')

let map = {}

jsonfile.readFile(configPath, (err, obj) => {
	if (err)
		jsonfile.atomicWriteFileSync(configPath, map)
	else
		map = obj
})

const config = {
	getAll: () => {
		return map
	},
	get: str => {
		return map[str]
	},
	set: (str, value) => {
		map[str] = value
		jsonfile.atomicWriteFileSync(configPath, map)
	},
	has: key => {
		return map.hasOwnProperty(key)
	}
}

module.exports = config

