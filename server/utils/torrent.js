
const { app } = require('electron')
const path = require('path')
const temp = path.join(app.getPath('temp'), 'PowderWeb')
const torrentWorker = require('torrent-worker')
const settings = require('electron-settings')
const hat = require('hat')
const getPort = require('get-port')
const readTorrent = require('read-torrent')

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
        getPort().then((port) => {
            let opts = {}

            opts.tracker = true
            opts.withResume = !!settings.get('verifyFiles')
            opts.buffer = (1.5 * 1024 * 1024).toString()
            opts.tmp = temp
            opts.port = settings.has('peerPort') && settings.get('peerPort') != '6881' ? settings.get('peerPort') : port
            opts.connections = settings.get('maxPeers')
            opts.torFile = typeof torrent === 'string' && !torrent.startsWith('magnet:') && torrent.match(/(?:\.torrent)(\?([^.]+)|$)/gi) ? torrent : null
            opts.id = '-' + settings.get('peerID') + '-' + hat(48)

            if (settings.has('torrentTrackers') && settings.get('torrentTrackers')) {
                opts.trackers = settings.get('torrentTrackers').split(';')
                if (opts.trackers && opts.trackers.length) {
                    opts.trackers = opts.trackers.map(function(el) { return el.trim() });
                } else {
                    delete opts.trackers
                }
            }

            if (settings.has('downloadFolder'))
                opts.path = settings.get('downloadFolder');

            let worker = new torrentWorker(),
                engine = worker.process(torrentInfo, opts);

            resolve({ worker, engine })

        })
    })

}
