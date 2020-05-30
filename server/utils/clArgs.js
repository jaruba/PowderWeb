const path = require('path')
const url = require('url')
const config = require('./config')
const streams = require('../streams')
const acestream = require('../acestream')
const youtube = require('../ytdl')
const sop = require('../sopcast')
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

      if (config.get('useWebPlayerAssoc') || (opts && opts.runWebPlayer)) {
        const webPlayerUrl = serverUrl + '/embed?opener=' + infoHash + '&token=' + reqToken
        shell.openExternal(webPlayerUrl)
      } else {

        if (config.get('extPlayer')) {

          // open with selected external player

          const playlist = serverUrl + '/playlist.m3u?id=' + torrentId + '&token=' + reqToken

          helpers.openApp(config.get('extPlayer'), config.get('playerCmdArgs'), playlist)

        } else {

          // open with default player

          streams.createPlaylist(torrentId, organizedFiles, reqToken, false, playlist => {
            const filePath = path.join(app.getPath('appData'), 'PowderWeb', 'playlist'+(Date.now())+'.m3u')

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

const runAcePlaylist = (pid, reqToken) => {
  if (pid) {

    const reqUrl = 'http://127.0.0.1:3000'

    // create playlist of streams

    if (config.get('extPlayer')) {

      // open with selected external player

      const playlist = reqUrl + '/getaceplaylist.m3u?pid=' + pid + '&token=' + reqToken

      helpers.openApp(config.get('extPlayer'), config.get('playerCmdArgs'), playlist)

    } else {

      // open with default player

      const tryConnect = () => {
        acestream.getVersion((connected) => {
          if (connected) {
            acestream.getPort((servPort) => {
                if (!servPort) {
                    console.log('NO ACESTREAM PORT')
                    // this means acestream is installed somewhere else and we don't have access to it
                    // SHOULD SHOW INSTALL PROMPT
                } else {
                    acestream.connect(pid, servPort, peerflixProxy, reqToken, (playlist) => {
                      // playlist cb
                      const filePath = path.join(app.getPath('appData'), 'PowderWeb', 'playlist'+(Date.now())+'.m3u')
                      fs.writeFile(filePath, playlist, function(err) {
                          if (err) {
                              return console.log(err);
                          }
                          shell.openItem(filePath)
                      })
                    }, reqUrl)
                }
            })
          }
        })
      }

      const runAce = () => {
        acestream.isDownloaded((downloaded) => {
          if (downloaded) {
            acestream.binary.run(function(didRun) {
              if (didRun) {
                tryConnect()
              } else {
                console.log('CAN\'T START ACESTREAM')
              }
            })
          } else {
            console.log('NO ACESTREAM INSTALLED')
          }
        })
      }


      acestream.getVersion((connected) => {
          if (connected) {
            acestream.getPort((servPort) => {
              if (!servPort) {
                runAce()
              } else {
                tryConnect()
              }
            })
          } else {
            runAce()
          }
      })

    }

  }

}

const runSopPlaylist = (pid, reqToken) => {
  if (pid) {

    const reqUrl = 'http://127.0.0.1:3000'

    // create playlist of streams

    if (config.get('extPlayer')) {

      // open with selected external player

      const playlist = reqUrl + '/getsopplaylist.m3u?pid=' + pid + '&token=' + reqToken

      helpers.openApp(config.get('extPlayer'), config.get('playerCmdArgs'), playlist)

    } else {

      // open with default player

      const tryConnect = () => {
        sop.connect(urlParsed.query.pid, peerflixProxy, reqToken, (playlist) => {
          // playlist cb
          const filePath = path.join(app.getPath('appData'), 'PowderWeb', 'playlist'+(Date.now())+'.m3u')
          fs.writeFile(filePath, playlist, (err) => {
              if (err) {
                  return console.log(err);
              }
              shell.openItem(filePath)
          })
        }, reqUrl)
      }

      const runSop = () => {
        sop.isDownloaded((downloaded) => {
          if (downloaded) {
            tryConnect()
          } else {
            page500("Sopcast Not Installed")
            console.log('NO SOPCAST INSTALLED')
          }
        })
      }

      runSop()

    }

  }

}

const runTorrent = (torrentQuery, reqToken, noAction, opts) => {

  if (torrentQuery.startsWith('acestream://')) {

    const pid = torrentQuery.replace('acestream://', '')

    runAcePlaylist(pid, reqToken)

  } else if (torrentQuery.startsWith('sop://')) {

    runSopPlaylist(torrentQuery, reqToken)

  } else {

    helpers.urlType(torrentQuery, (urlType) => {
      if (urlType.isTorrent) {

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

                if (config.get('extTorrentClient')) {

                  // check if there is any streamable content

                  if (organizedFiles) {
                    if (!organizedFiles.streamable) {

                      // cancel torrent and start with external torrent client

                      streams.cancel(torrentId, () => {
                        helpers.openApp(config.get('extTorrentClient'), config.get('torrentCmdArgs'), torrentQuery)
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

            }, false, true)
      } else if (urlType.isYoutubeDl) {
        youtube.add(torrentQuery, (ytdl) => {
          let newM3U = "#EXTM3U";

          const reqUrl = 'http://127.0.0.1:3000'

          if (ytdl) {
            const uri = reqUrl + '/ytdl/' + ytdl.pid + '/0&token=' + reqToken
            newM3U += os.EOL+"#EXTINF:0,"+ytdl.name+os.EOL+uri
          }

          const filePath = path.join(app.getPath('appData'), 'PowderWeb', 'playlist'+(Date.now())+'.m3u')

          fs.writeFile(filePath, newM3U, (err) => {
              if (err) {
                  return console.log(err);
              }
              if (config.get('extPlayer')) {
                helpers.openApp(config.get('extPlayer'), config.get('playerCmdArgs'), filePath)
              } else {
                shell.openItem(filePath)
              }
          })
        }, (errMsg) => {
          console.log(errMsg)
        })
      }
    }, (errMsg) => {
      console.log(errMsg)
    })

  }
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
                if (el.includes('PowderWeb') || el == '.' || el.includes('/electron/dist/electron') || el.includes('electron\\dist\\electron')) {
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