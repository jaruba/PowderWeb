
const { app } = require('electron')
const path = require('path')
const temp = path.join(app.getPath('temp'), 'PowderWeb')
const torrentWorker = require('torrent-worker')
const config = require('./config')
const hat = require('hat')
const getPort = require('get-port')
const readTorrent = require('read-torrent')
const fastResumeDir = path.join(app.getPath('appData'), 'PowderWeb', 'fastresume')

module.exports = (torrent) => {

    return new Promise((resolve, reject) => {
        const read = (torrent) => {
            return new Promise((resolve, reject) => {
                readTorrent(torrent, (err, parsedTorrent) => {
                    if (!err && parsedTorrent) resolve(parsedTorrent)
                    else reject(err)
                })
            })
        }
        const torrentInfo = torrent
        getPort({ port: config.has('peerPort') ? config.get('peerPort') : 6884 }).then((port) => {
            let opts = {}

            opts.tracker = true
            opts.withResume = !!config.get('verifyFiles')
            opts.buffer = (1.5 * 1024 * 1024).toString()
            opts.tmp = temp
            opts.port = port
            opts.connections = config.get('maxPeers')
            opts.torFile = typeof torrent === 'string' && !torrent.startsWith('magnet:') && torrent.match(/(?:\.torrent)(\?([^.]+)|$)/gi) ? torrent : null
            opts.id = '-' + config.get('peerID') + '-' + hat(48)
            opts.resumeDataFolder = fastResumeDir
            opts.fastresume = !!config.get('fastResume')

            if (config.has('torrentTrackers') && config.get('torrentTrackers')) {
                opts.trackers = config.get('torrentTrackers').split(';')
                if (opts.trackers && opts.trackers.length) {
                    opts.trackers = opts.trackers.map(function(el) { return el.trim() });
                } else {
                    delete opts.trackers
                }
            }

            if (config.has('downloadFolder'))
                opts.path = config.get('downloadFolder');

            let worker = new torrentWorker(),
                engine = worker.process(torrentInfo, opts);

            resolve({ worker, engine })

        })
    })

}
