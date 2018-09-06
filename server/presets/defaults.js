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

const uniqueString = require('unique-string')

const map = {
//    torrentContent: false,
    peerPort: 6881,
    maxPeers: 200,
//    bufferSize: 7000,
    removeLogic: 0,
//    downloadType: 0,
//    casting: {},
//    dlnaFinder: 0,
    extPlayer: false,
    playerCmdArgs: '',
    extTorrentClient: false,
    torrentCmdArgs: '',
    speedLimit: 0,
    downloadAll: true,
    forceDownload: false,
    peerID: 'PW0700',
    addressbook: {},
    acebook: {},
    acenamebook: {},
    sopbook: {},
    locbook: {},
    ytdlbook: {},
    fastresumebook: {},
    uploaded: {},
    maxConcurrency: 2,
    users: {},
    maxUsers: 0,
    webServerPort: 3000,
    webServerSSL: false,
    downloadFolder: '',
    history: {},
    torrentTrackers: '',

    ytdlQuality: 2,

    subLimits: ['best', 'all', 3, 4 ,5],
    subLimit: 0,

    jackettHost: 'http://localhost:9117/',
    jackettKey: '',

    verifyFiles: true,

    embedToken: uniqueString(),

    useWebPlayerAssoc: false,

    useFilenameStream: true,
    torrentNotifs: true,

    fastResume: true,

    userCommands: '',

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