
const fs = require('fs'),
      path = require('path'),
      { app } = require('electron')

const appData = path.join(app.getPath('appData'), 'PowderWeb')

const paths = {
    settings: path.join(appData, 'Settings'),
    backup: path.join(appData, 'Settings-backup')
}

// create an hourly backup of the DB to
// guard against data loss

const hours1 = 60 * 60 * 1000

function createBackup() {
    if (!fs.existsSync(paths.settings))
        return

    fs.createReadStream(paths.settings).pipe(fs.createWriteStream(paths.backup))

    setTimeout(createBackup, hours1)
}

setTimeout(createBackup, hours1)


module.exports = {
    get: () => {

        let data, obj

        try {
            data = fs.readFileSync(paths.backup)
        } catch(e) {
            // this method is called on app start, warnings
            // (such as the file not existing yet) are too
            // common to log
            return false
        }

        try {
            obj = JSON.parse(data)
        } catch(e) {
            // the actual parsing error is irrelevent
            console.error('Warning: Could not parse JSON of backup DB')
            return false
        }

        return obj || false
    }
}