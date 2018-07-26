const path = require('path')
const url = require('url')
const settings = require('electron-settings')
const streams = require('../streams')
const { app, shell } = require('electron')
const helpers = require('../utils/misc')
const events = require('../utils/events')
const isTorrentString = require('../utils/isTorrentString')
const fs = require('fs')

const runPlaylist = (torrentId, organizedFiles, infoHash, reqToken, opts) => {

  const server = require('../../server')

  if (organizedFiles) {

    if (organizedFiles.streamable) {

      const serverUrl = 'http' + (server.isSSL ? 's': '') + '://localhost:' + server.port()
      // create playlist of streams

      if (settings.get('useWebPlayerAssoc') || (opts && opts.runWebPlayer)) {
        const webPlayerUrl = serverUrl + '/embed?opener=' + infoHash + '&token=' + reqToken
        shell.openExternal(webPlayerUrl)
      } else {

        if (settings.get('extPlayer')) {

          // open with selected external player

          const playlist = serverUrl + '/playlist.m3u?id=' + torrentId + '&token=' + reqToken

          helpers.openApp(settings.get('extPlayer'), settings.get('playerCmdArgs'), playlist)

        } else {

          // open with default player

          streams.createPlaylist(torrentId, organizedFiles, reqToken, false, playlist => {
            const filePath = path.join(app.getPath('appData'), 'playlist'+(Date.now())+'.m3u')

            fs.writeFile(filePath, playlist, function(err) {
                if (err) {
                    return console.log(err);
                }
                shell.openItem(filePath)
            })
          }, serverUrl)
        }

      }

    }
  }
}

const runTorrent = (torrentQuery, reqToken, noAction, opts) => {

    let torrentId

    streams.new(torrentQuery,

        torrentObj => {
          torrentId = torrentObj.utime
        },

        (engine, organizedFiles) => {

          if (noAction) return

          if (opts) return

          // ready

          // we only need the next code when it's ran from a magnet link / torrent file association

            if (settings.get('extTorrentClient')) {

              // check if there is any streamable content

              if (organizedFiles) {
                if (!organizedFiles.streamable) {

                  // cancel torrent and start with external torrent client

                  streams.cancel(torrentId, () => {
                    helpers.openApp(settings.get('extTorrentClient'), settings.get('torrentCmdArgs'), torrentQuery)
                  }, true)

                }
              }

            } else {
              // ... download internally
            }


        },

        (engine, organizedFiles) => {

          if (noAction) return

          // listening

          // we only need the next code when it's ran from a magnet link / torrent file association

          runPlaylist(torrentId, organizedFiles, engine.infoHash, reqToken, opts)

        },

        (err) => {

          if (err && err.message) {
            throw err
          } else {
            const newErr = new Error('An unknown error occured')
            throw newErr
          }

        })
}

const torrentSpeedUp = (torrent) => {
  streams.toInfoHash(torrent, (iHash) => {
      if (!iHash) return
      const torrentId = streams.getTorrentId(iHash)
      if (!torrentId) return
      streams.speedUp(torrentId)
  })
}

const torrentCleanUp = streams.deleteAllPaused

const torrentPause = (torrent) => {
    streams.toInfoHash(torrent, (iHash) => {
        if (!iHash) return
        streams.cancelByInfohash(iHash, () => {}, false, true)
    })
}

const torrentRemove = (torrent) => {
    streams.toInfoHash(torrent, (iHash) => {
        if (!iHash) return
        streams.cancelByInfohash(iHash, () => {}, true)
    })
}

module.exports = {
    process: (args, reqToken) => {
        if (args.length) {
            console.log(args);
            args.forEach( el => {
                if (el.includes('PowderWeb') || el == '.') {
                  return
                }
                if (el.startsWith('--')) {

                    // command line args

                    let cmdValue
                    let isTorrent

                    if (el.includes('='))
                      cmdValue = el.split('=')[1]

                    if (el == '--restart') {
                      events.emit('appRelaunch')
                    } else if (el == '--quit') {
                      events.emit('appQuit')
                    } else if (el == '--show-app') {
                      events.emit('appShow')
                    } else if (el == '--show-browser') {
                      events.emit('appShowBrowser')
                    } else if (el == '--clean-up') {
                      events.emit('torrentCleanUp')
                    } else if (el == '--speed-up') {
                      events.emit('torrentSpeedUp')
                    } else if (cmdValue) {

                      const isTorrent = !!(isTorrentString.isMagnetLink(cmdValue) || isTorrentString.isTorrentPath(cmdValue) || isTorrentString.isInfoHash(cmdValue))

                      if (isTorrent) {
                        if (el.startsWith('--pause=')) {
                          torrentPause(cmdValue)
                        } else if (el.startsWith('--start=')) {
                          runTorrent(cmdValue, reqToken, true)
                        } else if (el.startsWith('--remove=')) {
                          torrentRemove(cmdValue)
                        } else if (el.startsWith('--play-browser=')) {
                          runTorrent(cmdValue, reqToken, false, { runWebPlayer: true })
                        } else if (el.startsWith('--play-playlist=')) {
                          runTorrent(cmdValue, reqToken, false, { runPlaylist: true })
                        }
                      }
                    }

                } else {
                    if (path.isAbsolute(el)) {
                        // local file
                        runTorrent(el, reqToken)
                    } else if (url.parse(el).protocol) {
                        // url
                        runTorrent(el, reqToken)
                    }
                }
            });
        }
    }
}