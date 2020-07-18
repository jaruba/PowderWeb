// this is a shim for electron-settings that
// is used when running in headless mode


const jsonfile = require('jsonfile')
const uniqueString = require('unique-string')
const path = require('path')

const app = require('./electronShim')

const userData = app.getPath('userData')

const configPath = path.join(userData, 'settingsShim.json')

let map = {}

function loadUserConfig(err, obj) {
    if (err) {

        try {
            jsonfile.atomicWriteFileSync(configPath, map)
        } catch(e) {
            // ignore error here
        }

        return map

    } else {
        let changed

        for (let key in map)
            if (!obj.hasOwnProperty(key)) {
                obj[key] = map[key]
                changed = true
            }

        if (changed)
            jsonfile.atomicWriteFileSync(configPath, obj)

        return obj
    }
}

function init() {
    let obj, err

    try {
        obj = jsonfile.readFileSync(configPath)
    } catch(e) {
        err = e
    }

    map = loadUserConfig(err, obj)
}

init()

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
