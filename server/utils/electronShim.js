// this project also supports a headless mode
// so this file will try to reproduce electron
// features with just nodejs

const fs = require('fs')
const path = require('path')
const os = require('os')
const opn = require('open')
const haveElectron = require('./haveElectron.js')()

const rootDir = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share')

let configDir

const electronShim = {
	getPath: data => {
		if (haveElectron) {
			const { app } = require('electron')
			return app.getPath(data)
		} else {
			if (data == 'userData') {
				if (configDir)
					return configDir

				configDir = path.join(rootDir, 'PowderWeb')

				if (!fs.existsSync(configDir))
					fs.mkdirSync(configDir)

				return configDir
			} else if (data == 'appData')
				return rootDir
			else if (data == 'temp')
				return os.tmpdir()
			return false
		}
	},
	openItem: data => {
		if (haveElectron) {
			const { shell } = require('electron')
			shell.openItem(data)
		} else
			opn(data)
	},
	openExternal: data => {
		if (haveElectron) {
			const { shell } = require('electron')
			shell.openExternal(data)
		} else
			opn(data)
	},
	showItemInFolder: data => {
		if (haveElectron) {
			const { shell } = require('electron')
			shell.showItemInFolder(data)
		} else {

			// there is no substitute for this that i know of
			// using open folder instead

			opn(path.dirname(data))

		}

		return false
	},
	showOpenDialog: data => {
		if (haveElectron) {
			const { dialog } = require('electron')
			dialog.showOpenDialog(data)
		}

		// there is no substitute for this that i know of

		return false
	},
	setAsDefaultProtocolClient: data => {
		if (haveElectron) {
			const { app } = require('electron')
			app.setAsDefaultProtocolClient(data);
		} else {

			// only magnet link association will work
			// in the headless version for now

			if (data == 'magnet') {
				const dataPath = electronShim.getPath('userData')
				fs.writeFile(dataPath+'\\register-link.reg', 'REGEDIT4\r\n[HKEY_CLASSES_ROOT\\Magnet]\r\n@="URL:magnet Protocol"\r\n"Content Type"="application/x-magnet"\r\n"URL Protocol"=""\r\n\[HKEY_CLASSES_ROOT\\Magnet\\DefaultIcon]\r\n@="\\"'+process.execPath.split("\\").join("\\\\")+'\\"\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell]\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell\\open]\r\n[HKEY_CLASSES_ROOT\\Magnet\\shell\\open\\command]\r\n@="\\"'+process.execPath.split("\\").join("\\\\")+'\\" \\"%1\\""\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet]\r\n@="URL:magnet Protocol"\r\n"Content Type"="application/x-magnet"\r\n"URL Protocol"=""\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\DefaultIcon]\r\n@="\\"'+process.execPath.split("\\").join("\\\\")+'\\"\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell]\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell\\open]\r\n[HKEY_CURRENT_USER\\Software\\Classes\\Magnet\\shell\\open\\command]\r\n@="\\"'+process.execPath.split("\\").join("\\\\")+'\\" \\"%1\\""', function (err) {
					if (err) throw err;
					opn(dataPath+'\\register-link.reg'); 
				});
			}
		}
	},
	settings: () => {
		return haveElectron ? require('electron-settings') : require('./settingsShim')
	}
}

module.exports = electronShim
