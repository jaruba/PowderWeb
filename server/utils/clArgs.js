const path = require('path')
const url = require('url')
const settings = require('electron-settings')
const streams = require('../streams')
const { app, shell } = require('electron')
const helpers = require('../utils/misc')
const fs = require('fs')

const runPlaylist = (torrentId, organizedFiles, infoHash, reqToken) => {

  const server = require('../../server')

  if (organizedFiles) {

    if (organizedFiles.streamable) {

      const serverUrl = 'http' + (server.isSSL ? 's': '') + '://localhost:' + server.port()
      // create playlist of streams

      if (settings.get('useWebPlayerAssoc')) {
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

const runTorrent = (torrentQuery, reqToken) => {

    let torrentId

    streams.new(torrentQuery,

        torrentObj => {
          torrentId = torrentObj.utime
        },

        (engine, organizedFiles) => {

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

          // listening

          // we only need the next code when it's ran from a magnet link / torrent file association

          runPlaylist(torrentId, organizedFiles, engine.infoHash, reqToken)

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
                    // none yet
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