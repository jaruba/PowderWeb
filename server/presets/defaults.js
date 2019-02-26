const { app } = require('electron')
const _ = require('lodash')
const mkdirp = require('mkdirp')
const path = require('path')

const userDataFolders = [
    'torrentFiles'
]

const fs = require('fs')

userDataFolders.forEach(folder => {
    mkdirp(path.join(app.getPath('userData'), folder), () => {})
})

const settings = require('electron-settings')

const map = {
    addressbook: {},
    acebook: {},
    acenamebook: {},
    sopbook: {},
    locbook: {},
    ytdlbook: {},
    fastresumebook: {},
    uploaded: {},
    users: {},
    history: {},
}

module.exports = {
    set: () => {
        _.forEach(map, (el, ij) => {
            if (!settings.has(ij))
                settings.set(ij, el)
        })
        return true
    },
    reset: () => {
        _.forEach(map, (el, ij) => {
            settings.set(ij, el)
        })
    }
}