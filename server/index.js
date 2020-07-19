
const { app, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('easy-ffmpeg')
var dir = path.join(app.getPath('appData'), 'PowderWeb');

const openerDir = path.join(dir, 'openers')

const fastResumeDir = path.join(dir, 'fastresume')

const hlsVod = require('../node_modules/hls-vod/hls-vod.js')

const rimraf = require('rimraf')

const supported = require('./utils/isSupported')

const updater = require('./utils/updater')

setTimeout(updater.checkUpdates)

const rangeParser = require('range-parser')

const pump = require('pump')

// remove old playlist files
rimraf(path.join(dir, 'playlist*.m3u'), { maxBusyTries: 100 }, (err, data) => { })

//hlsVod(ffmpeg)

var transcoderPath = ffmpeg()

let ffmpegPath
let ffprobePath

transcoderPath._getFfmpegPath(function(err, ffpath) { ffmpegPath = ffpath })
transcoderPath._getFfprobePath(function(err, ffpath) { ffprobePath = ffpath })

const videoPresets = require('./presets/videoPresets')
const audioPresets = require('./presets/audioPresets')

// without this, `electron-settings` fails on very first run:
if (!fs.existsSync(dir))
    fs.mkdirSync(dir)

if (!fs.existsSync(openerDir))
    fs.mkdirSync(openerDir)

if (!fs.existsSync(fastResumeDir))
    fs.mkdirSync(fastResumeDir)

const defaults = require('./presets/defaults')
defaults.set()

const needle = require('needle')
const http = require('http')
const https = require('https')
const url = require('url')
const streams = require('./streams')
const settings = require('electron-settings')
const config = require('./utils/config')
const getPort = require('get-port')
const _ = require('lodash')
const os = require('os')
const TMP = os.tmpDir()
const platform = os.platform()
const addresses = require('./utils/addressbook')
const uniqueString = require('unique-string')
const formidable = require('formidable')
const subsrt = require('subsrt')
const notifier = require('node-notifier')

const clArgs = require('./utils/clArgs')

const atob = require('./utils/atob')

const register = require('./utils/register')

const subtitles = require('./utils/subtitles')

const sslUtil = require('./utils/ssl')

const hlsLink = require('./utils/live-trans')

const srt2vtt = require('srt-to-vtt')

const opn = require('opn')

const helpers = require('./utils/misc')

const jackettApi = require('./jackett')

const masterKey = uniqueString()

const argsKey = uniqueString()

const acestream = require('./acestream')

const acebook = require('./utils/acebook')

const sopbook = require('./utils/sopbook')

const youtube = require('./ytdl')

const qrCode = require('./utils/qrcode')

const sop = require('./sopcast')

const local = require('./local')

let aceDownloadMsg = ''

let sopDownloadMsg = ''

let tokens = {
  [masterKey]: 'master',
  [argsKey]: true
}

const passArgs = function(e, args) {
  clArgs.process(Array.isArray(args) ? args : [args], argsKey);
}

if (process.platform !== 'darwin') {
  passArgs(null, process.argv)
} else {
  // these events are OSX only:
  app.on('open-file', passArgs);
  app.on('open-url', passArgs);
}

if (process.env.NODE_ENV === 'development') {
  console.log('master key: '+ masterKey)
}

let port

let peerflixProxy

if (process.env.PWFRONTPORT) {
  port = process.env.PWFRONTPORT
}

if (process.env.PWBACKPORT) {
  peerflixProxy = process.env.PWBACKPORT
}

let jackettResponses = {}

function convertSecToTime(sec) {
  var date = new Date(null)
  date.setSeconds(sec)
  var result = date.toISOString().substr(11, 8)
  var tmp = (sec + '').split('.')
  if(tmp.length == 2) result += '.' + tmp[1]
  return result
}

const btoa = (str) => {
  var buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = Buffer.from(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}

let serverPort = config.get('webServerPort') || 3000

const getReqUrl = (req) => {
  let topUrl = ''

  if (req.headers.referer) {
    const refererParsed = url.parse(req.headers.referer)
    topUrl += refererParsed.protocol + '//' + refererParsed.host
  } else if (req.headers.host) {
    topUrl += 'http://' + req.headers.host
  } else {
    topUrl += 'http://127.0.0.1:' + serverPort
  }

  return topUrl
}

const initServer = () => {
const mainServer = http.createServer(function(req, resp) {
  req.setTimeout(Number.MAX_SAFE_INTEGER)
  const urlParsed = url.parse(req.url, true)
  const uri = urlParsed.pathname

  const respond = (msg, isBinary) => {
    msg = msg || {}

    resp.writeHead(200, {});

    resp.write(JSON.stringify(msg));
    resp.end();
  }

  const page404 = () => {
    resp.writeHead(404, { "Content-Type": "text/plain" });
    resp.write("404 Not Found\n");
    resp.end();
  }

  const page500 = (err) => {
    resp.writeHead(500, { "Content-Type": "text/plain" })
    resp.write(err + "\n")
    resp.end()
  }

  const respondToken = (tokenValue) => {
    const token = uniqueString()
    tokens[token] = tokenValue
    const expiresOn = Date.now() + 604800000
    setTimeout(() => {
      if (tokens[token])
        delete tokens[token]
    }, 604800000)
    respond({ token, expiresOn })
  }

  let method = false

  const embedToken = config.get('embedToken')

  if (urlParsed.query && urlParsed.query.method) {
    method = urlParsed.query.method
  } else if (uri.startsWith('/actions')) {
    return page500('Method must be specified')
  }

  if (method == 'validToken' && urlParsed.query.token) {
    respond(tokens[urlParsed.query.token] || embedToken == urlParsed.query.token ? tokens[urlParsed.query.token] == 'master' ? '2' : '1' : '0')
    return
  }

  if (method == 'allowRegister') {
    respond({ value: (_.size(settings.get('users')) < config.get('maxUsers')) })
    return
  }

  if (method == 'signup' && urlParsed.query.value) {
    if (config.get('maxUsers') && _.size(settings.get('users')) >= config.get('maxUsers')) {
      respond({ error: 'Maximum number of users reached' })
      return
    }
    let newUser = {}
    try {
      newUser = JSON.parse(urlParsed.query.value)
    } catch (e) {}

    let users = settings.get('users')

    if (newUser.email && newUser.password) {
      if (!users[newUser.email]) {
        users[newUser.email] = newUser.password
        settings.set('users', users)
        respondToken(newUser.email)
      } else {
        respond({ error: 'Email already registered' })
      }
    } else {
      respond({ error: 'All fields required' })
    }
    return
  }

  if (method == 'login' && urlParsed.query.value) {

    let tryUser = {}

    try {
      tryUser = JSON.parse(urlParsed.query.value)
    } catch (e) {}

    let users = settings.get('users')

    if (tryUser.email && tryUser.password) {
      if (users[tryUser.email]) {
        if (users[tryUser.email] == tryUser.password) {
          respondToken(tryUser.email)
        } else {
          respond({ err: 'Incorrect password' })
        }
      } else {
        respond({ error: 'Email not registered' })
      }
    } else {
      respond({ error: 'All fields required' })
    }
    return
  }

  // check token before continuing to the actual api

  let isMaster = false
  let isEmbed = false
  let reqToken = false

  if (req.headers && req.headers.authorization)
    reqToken = req.headers.authorization
  else if (urlParsed.query && urlParsed.query.token)
    reqToken = urlParsed.query.token

  if ((!reqToken || !tokens[reqToken]) && reqToken != embedToken)
    return page500('Invalid access token')

  if (reqToken == embedToken)
    isEmbed = true

  if (tokens[reqToken] == 'master')
    isMaster = true

  if (isEmbed && ['embedStart', 'torrentData', 'getSubs', 'updateHistory', 'haveAce', 'ace', 'aceMsg', 'urlType', 'ytdlAdd', 'sop', 'sopMsg'].indexOf(method) == -1 && !uri.startsWith('/srt2vtt/subtitle.vtt'))
    return page500('Invalid access token')

  if (method == 'settings') {
    const masterOnly = [
      'useWebPlayerAssoc',
      'extPlayer',
      'playerCmdArgs',
      'extTorrentClient',
      'torrentCmdArgs',
      'downloadFolder',
      'maxConcurrency',
      'downloadAll',
      'forceDownload',
      'speedLimit',
      'removeLogic',
      'webServerPort',
      'webServerSSL',
      'maxUsers',
      'maxPeers',
      'peerPort',
      'peerID',
      'verifyFiles',
      'fastResume',
      'useFilenameStream',
      'torrentNotifs',
      'torrentTrackers',
      'userCommands',
      'jackettHost',
      'jackettKey',
      'subsOnlyHash',
      'subLangs',
      'subLimit',
      'downloadSubs',
    ]
    _.forEach(urlParsed.query, (el, ij) => {
      if (ij == 'token' || ij == 'method') return
      if (!isMaster && masterOnly.includes(ij)) return
      if (el == 'true') el = true
      else if (el == 'false') el = false
      else if (!isNaN(el)) el = parseInt(el)
      config.set(ij, el)
    })
    respond({})
    return
  }

  if (method == 'aceMsg' && urlParsed.query && urlParsed.query.torrent) {
    respond(acestream.streamObj(urlParsed.query.torrent))
    return
  }

  if (uri.startsWith('/playlist.m3u') && urlParsed.query && urlParsed.query.id) {

    let utime = urlParsed.query.id

    let organizedFiles = streams.getOrganizedFiles(utime)

    if (!organizedFiles) {
      utime = streams.getUtime(utime)
      if (utime) {
        organizedFiles = streams.getOrganizedFiles(utime)
      } else {
        page500('Unknown Error')
        return
      }
    }

    if (organizedFiles) {

      if (organizedFiles.streamable) {

        streams.createPlaylist(utime, organizedFiles, reqToken, urlParsed.query.fileID || false, playlist => {

          resp.writeHead(200, {
            "Content-Type": "audio/x-mpegurl",
            "Content-Disposition": 'attachment;filename="playlist.m3u"'
          })
          resp.write(playlist)
          resp.end()

        }, getReqUrl(req))

      } else {
        page500('Torrent does not have streamable files')
      }

    } else {
      page500('Error while trying to organize torrent files')
    }

    return
  }

  if (method == 'setting' && urlParsed.query.for) {
    if (urlParsed.query.for == 'getAll') {
      const sets = config.getAll()
      respond(sets)
    } else {
      respond({ value: config.get(urlParsed.query.for) })
    }
    return
  }

  const runPlaylist = (torrentId, organizedFiles) => {
    if (organizedFiles) {

      if (organizedFiles.streamable) {

        const reqUrl = getReqUrl(req)

        // create playlist of streams

        if (config.get('extPlayer')) {

          // open with selected external player

          const playlist = reqUrl + '/playlist.m3u?id=' + torrentId + '&token=' + reqToken

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
          }, reqUrl)
        }

      }
    }
  }

  const runSopPlaylist = (pid) => {
    if (pid) {

      const reqUrl = getReqUrl(req)

      // create playlist of streams

      if (config.get('extPlayer')) {

        // open with selected external player

        const playlist = reqUrl + '/getsopplaylist.m3u?pid=' + pid + '&token=' + reqToken

        helpers.openApp(config.get('extPlayer'), config.get('playerCmdArgs'), playlist)

      } else {


        let doneResp = false

        const setResp = () => { doneResp = true }

        resp.on('finish', setResp)
        resp.on('close', setResp)

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
    } else {
      page500('Invalid Resource ID')
    }
  }

  const runLocalPlaylist = (pid) => {
    if (pid) {


      // no transcoding needed
      let newM3U = "#EXTM3U";

      const loc = local.get(pid)

      if (loc) {
        if (loc.location && !loc.isDirectory) {
          newM3U += os.EOL+"#EXTINF:0,"+loc.name+os.EOL+loc.location
        } else if (loc.files) {
          loc.files.forEach((fl) => {
            newM3U += os.EOL+"#EXTINF:0,"+fl.name+os.EOL+fl.location
          })
        }
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
    }
  }

  const runYtdlPlaylist = (pid) => {
    if (pid) {

      // no transcoding needed
      let newM3U = "#EXTM3U";

      const ytdl = youtube.get(pid)

      const reqUrl = getReqUrl(req)

      if (ytdl) {
        const uri = reqUrl + '/ytdl/' + pid + '/0&token=' + reqToken
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
    }
  }

  const runAcePlaylist = (pid) => {
    if (pid) {

      const reqUrl = getReqUrl(req)

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

    } else {
      page500('Invalid Resource ID')
    }

  }

  if (method == 'sop' && urlParsed.query && urlParsed.query.torrent) {

    const tryConnect = () => {
      respond({ hasSopcast: true })
      sop.connect(urlParsed.query.torrent, peerflixProxy, reqToken, null, getReqUrl(req))
    }

    const runSop = () => {
      sop.isDownloaded((downloaded) => {
        if (downloaded) {
          tryConnect()
        } else {
          console.log('NO SOPCAST INSTALLED')
          page500("No Sopcast Installed. Please Try Adding a Link Again.")
        }
      })
    }

    runSop()

    return
  }

  if (method == 'sopMsg' && urlParsed.query && urlParsed.query.torrent) {
    respond(sop.streamObj(urlParsed.query.torrent))
    return
  }

  if (method == 'haveSop') {
    sop.isDownloaded((isDownloaded) => {
      respond({ hasSopcast: isDownloaded })
    })
    return
  }

  if (method == 'sopDownload') {
    sop.isDownloaded((isDownloaded) => {
      if (!isDownloaded) {
        sopDownloadMsg = 'Starting Download'
        sop.download(
          function downloadCb(percent) {
            sopDownloadMsg = 'Downloading ' + percent + '%'
          },
          function extracting() {
            sopDownloadMsg = 'Extracting Package'
          },
          function doneCb() {
            sopDownloadMsg = 'Finished!'
          },
          function errCb(err) {
            sopDownloadMsg = 'Error: ' + (err ? err.message ? err.message : err : 'Unknown Error Occured') 
          }
        )
      }
    })
    respond({})
    return
  }

  if (method == 'sopDownloadMsg') {
    respond({ msg: sopDownloadMsg })
    return
  }

  if (method == 'sopRename' && urlParsed.query && urlParsed.query.pid && urlParsed.query.name) {
    sop.rename(urlParsed.query.pid, urlParsed.query.name)
    respond({})
    return
  }

  if (method == 'locRename' && urlParsed.query && urlParsed.query.pid && urlParsed.query.name) {
    local.rename(urlParsed.query.pid, urlParsed.query.name)
    respond({})
    return
  }

  if (method == 'locDestroy' && urlParsed.query && urlParsed.query.pid) {
    local.remove(urlParsed.query.pid)
    respond({})
    return
  }

  if (method == 'sopCancel' && urlParsed.query && urlParsed.query.pid) {
    sop.close(urlParsed.query.pid, () => {})
    respond({})
    return
  }

  if (method == 'sopDestroy' && urlParsed.query && urlParsed.query.pid) {
    sop.destroy(urlParsed.query.pid, () => {})
    respond({})
    return
  }

  if (method == 'ace' && urlParsed.query && urlParsed.query.torrent) {

    const tryConnect = () => {
      acestream.getVersion((connected) => {
        if (connected) {
          acestream.getPort((servPort) => {
            if (!servPort) {
                console.log('NO ACESTREAM PORT')
                // this means acestream is installed somewhere else and we don't have access to it
                // SHOULD SHOW INSTALL PROMPT
                respond({ hasAcestream: false })
            } else {
                respond({ hasAcestream: true })
                acestream.connect(urlParsed.query.torrent, servPort, peerflixProxy, reqToken, null, getReqUrl(req))
            }
          })
        }
      })
    }

    const runAce = () => {
      acestream.isDownloaded((downloaded) => {
        if (downloaded) {
          let oneResponse = true
          acestream.binary.run(function(didRun, exitCode) {

            if (!oneResponse) return
            oneResponse = false

            if (didRun) {
              tryConnect()
            } else {
              console.log('CAN\'T START ACESTREAM')
              page500("Can't Start Acestream, Exit Code: " + exitCode)
            }
          })
        } else {
          console.log('NO ACESTREAM INSTALLED')
          page500("No Acestream Installed. Please Try Adding a Link Again.")
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

    return
  }

  if (method == 'aceMsg' && urlParsed.query && urlParsed.query.torrent) {
    respond(acestream.streamObj(urlParsed.query.torrent))
    return
  }

  if (method == 'haveAce') {
    acestream.isDownloaded((isDownloaded) => {
      respond({ hasAcestream: isDownloaded })
    })
    return
  }

  if (method == 'aceDownload') {
    acestream.isDownloaded((isDownloaded) => {
      if (!isDownloaded) {
        aceDownloadMsg = 'Starting Download'
        acestream.binary.download(
          function downloadCb(percent) {
            aceDownloadMsg = 'Downloading ' + percent + '%'
          },
          function extracting() {
            aceDownloadMsg = 'Extracting Package'
          },
          function doneCb() {
            aceDownloadMsg = 'Finished!'
          },
          function errCb(err) {
            aceDownloadMsg = 'Error: ' + (err ? err.message ? err.message : err : 'Unknown Error Occured') 
          }
        )
      }
    })
    respond({})
    return
  }

  if (method == 'aceDownloadMsg') {
    respond({ msg: aceDownloadMsg })
    return
  }

  if (method == 'aceRename' && urlParsed.query && urlParsed.query.pid && urlParsed.query.name) {
    acestream.rename(urlParsed.query.pid, urlParsed.query.name)
    respond({})
    return
  }

  if (method == 'aceCancel' && urlParsed.query && urlParsed.query.pid) {
    acestream.close(urlParsed.query.pid, () => {})
    respond({})
    return
  }

  if (method == 'aceDestroy' && urlParsed.query && urlParsed.query.pid) {
    acestream.destroy(urlParsed.query.pid, () => {})
    respond({})
    return
  }

  if (method == 'ytdlAdd' && urlParsed.query && urlParsed.query.pid) {
    youtube.add(urlParsed.query.pid, (ytdlObj) => {
      respond(ytdlObj)
    }, (errMsg) => {
      page500(errMsg)
    })
    return
  }

  if (method == 'ytdlDestroy' && urlParsed.query && urlParsed.query.pid) {
    youtube.remove(urlParsed.query.pid)
    return
  }

  if (method == 'ytdlRename' && urlParsed.query && urlParsed.query.pid && urlParsed.query.name) {
    youtube.rename(urlParsed.query.pid, urlParsed.query.name)
    return
  }

  if (method == 'urlType' && urlParsed.query && urlParsed.query.pid) {
    helpers.urlType(urlParsed.query.pid, (urlType) => {
      respond(urlType)
    }, (errMsg) => {
      page500(errMsg)
    })
    return
  }

  if (method == 'qrCode' && urlParsed.query && urlParsed.query.qrType) {

    const qrKey = isMaster ? argsKey : reqToken

    if (['local','internet'].indexOf(urlParsed.query.qrType) > -1) {
      qrCode(urlParsed.query.qrType, qrKey, serverPort, respond, page500)
    } else {
      page404()
    }
    return
  }

  if (method == 'getLoc' && urlParsed.query && urlParsed.query.pid) {
    respond(local.get(urlParsed.query.pid))
    return
  }

  if (method == 'getYtdl' && urlParsed.query && urlParsed.query.pid) {
    respond(youtube.get(urlParsed.query.pid))
    return
  }

  if (method == 'new' && urlParsed.query && urlParsed.query.torrent) {

    let torrentId

    streams.new(urlParsed.query.torrent,

                torrentObj => {
                  torrentId = torrentObj.utime
                  respond(torrentObj)
                },

                (engine, organizedFiles) => {

                  // ready

                },

                (engine, organizedFiles) => {

                  // listening

                },

                (err) => {

                  if (err && err.message) {
                    page500(err.message)
                  } else {
                    page500('An unknown error occured')
                  }

                }, false, true)

    return
  }

  if (method == 'torrentData' && urlParsed.query.id) {
    streams.torrentData(urlParsed.query.id, (data) => {
      if (!data) {
        return page500('Could not get torrent info')
      }
      respond(data)
    })
    return
  }

  if (method == 'haveTorrent' && urlParsed.query && urlParsed.query.id) {
    respond({ value: streams.haveTorrent(urlParsed.query.id) ? true : false })
    return
  }

  if (uri.startsWith('/getlocalplaylist.m3u') && urlParsed.query && urlParsed.query.pid) {
    const pid = urlParsed.query.pid
    if (pid) {

      // no transcoding needed
      let newM3U = "#EXTM3U";

      const loc = local.get(pid)

      const requestHost = getReqUrl(req)
      const altHost = 'http://127.0.0.1:' + peerflixProxy

      if (loc) {
        if (loc.location && !loc.isDirectory) {
          const uri = (requestHost || altHost) + '/local/' + pid + '/0?token=' + reqToken
          newM3U += os.EOL+"#EXTINF:0,"+loc.name+os.EOL+uri
        } else if (loc.files) {
          loc.files.forEach((fl, idx) => {
            const uri = (requestHost || altHost) + '/local/' + pid + '/' + idx + '?token=' + reqToken
            newM3U += os.EOL+"#EXTINF:0,"+fl.name+os.EOL+uri
          })
        } else {
          page500('Invalid Resource')
        }
      } else {
        page500('Invalid Resource ID')
      }

      resp.writeHead(200, {
        "Content-Type": "audio/x-mpegurl",
        "Content-Disposition": 'attachment;filename="playlist.m3u"'
      })

      resp.write(newM3U, function(err) { resp.end() })

    } else {
      page500('Invalid Resource ID')
    }

    return
  }

  if (uri.startsWith('/getytdlplaylist.m3u') && urlParsed.query && urlParsed.query.pid) {
    const pid = urlParsed.query.pid
    if (pid) {

      // no transcoding needed
      let newM3U = "#EXTM3U";

      const ytdl = youtube.get(pid)

      const requestHost = getReqUrl(req)
      const altHost = 'http://127.0.0.1:' + peerflixProxy

      if (ytdl) {
        const urii = (requestHost || altHost) + '/ytdl/' + pid + '/0?token=' + reqToken
        newM3U += os.EOL+"#EXTINF:0,"+ytdl.name+os.EOL+urii
      } else {
        page500('Invalid Resource ID')
      }

      resp.writeHead(200, {
        "Content-Type": "audio/x-mpegurl",
        "Content-Disposition": 'attachment;filename="playlist.m3u"'
      })

      resp.write(newM3U, function(err) { resp.end() })

    } else {
      page500('Invalid Resource ID')
    }

    return
  }

  if (uri.startsWith('/getsopplaylist.m3u') && urlParsed.query && urlParsed.query.pid) {

    let doneResp = false

    const setResp = () => { doneResp = true }

    resp.on('finish', setResp)
    resp.on('close', setResp)

    const tryConnect = () => {
      sop.connect(urlParsed.query.pid, peerflixProxy, reqToken, (playlist) => {
        // playlist cb
        if (doneResp) return
        resp.writeHead(200, {
          "Content-Type": "audio/x-mpegurl",
          "Content-Disposition": 'attachment;filename="playlist.m3u"'
        })
        resp.write(playlist, function(err) { resp.end(); })
        resp.end()
      }, getReqUrl(req))
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

    return
  }

  if (uri.startsWith('/getaceplaylist.m3u') && urlParsed.query && urlParsed.query.pid) {

    let doneResp = false

    const setResp = () => { doneResp = true }

    resp.on('finish', setResp)
    resp.on('close', setResp)

    const tryConnect = () => {
      acestream.getVersion((connected) => {
        if (connected) {
          acestream.getPort((servPort) => {
              if (!servPort) {
                  console.log('NO ACESTREAM PORT')
                  // this means acestream is installed somewhere else and we don't have access to it
                  // SHOULD SHOW INSTALL PROMPT
                  page500("Acestream not Installed")
              } else {
                  acestream.connect(urlParsed.query.pid, servPort, peerflixProxy, reqToken, (playlist) => {
                    // playlist cb
                    if (doneResp) return
                    resp.writeHead(200, {
                      "Content-Type": "audio/x-mpegurl",
                      "Content-Disposition": 'attachment;filename="playlist.m3u"'
                    })
                    resp.write(playlist, function(err) { resp.end(); })
                    resp.end()
                  }, getReqUrl(req))
              }
          })
        }
      })
    }

    const runAce = () => {
      acestream.isDownloaded((downloaded) => {
        if (downloaded) {
          acestream.binary.run(function(didRun, exitCode) {
            if (didRun) {
              tryConnect()
            } else {
              page500("Can't Start Acestream, Exit Code: " + exitCode)
              console.log("CAN'T START ACESTREAM")
            }
          })
        } else {
          page500("Acestream Not Installed")
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

    return
  }

  if ((uri.startsWith('/getplaylist.m3u') || method == 'embedStart') && urlParsed.query && urlParsed.query.id) {

    let doneResp = false

    const setResp = () => { doneResp = true }

    resp.on('finish', setResp)
    resp.on('close', setResp)

    let torrentId

    streams.new(urlParsed.query.id,

      torrentObj => {
        torrentId = torrentObj.utime
      },

      (engine, organizedFiles) => {

        // ready

      },

      (engine, organizedFiles) => {

        // listening

        if (method && method == 'embedStart') {
          respond({ infoHash: engine.infoHash })
          return
        }

          if (organizedFiles) {
            if (organizedFiles.streamable) {

              // create playlist of streams

              streams.createPlaylist(torrentId, organizedFiles, reqToken, urlParsed.query.fileID || false, playlist => {
                if (isMaster && urlParsed.query.openNow) {
                  const filePath = path.join(app.getPath('appData'), 'PowderWeb', 'playlist'+(Date.now())+'.m3u')
                  fs.writeFile(filePath, playlist, function(err) {
                      if (err) {
                          return console.log(err);
                      }
                      shell.openItem(filePath)
                  })
                  if (doneResp) return
                  respond({})
                } else {
                  if (doneResp) return
                  resp.writeHead(200, {
                    "Content-Type": "audio/x-mpegurl",
                    "Content-Disposition": 'attachment;filename="playlist.m3u"'
                  })
                  resp.write(playlist, function(err) { resp.end(); })
                  resp.end()
                }
              }, getReqUrl(req))

            } else {

              page500('Torrent is not streamable')

            }
          } else {
            page500('An unknown error occured')
          }

      },

      (err) => {

        if (err && err.message) {
          page500(err.message)
        } else {
          page500('An unknown error occured')
        }

      }, true)
    return
  }

  if (method == 'getall') {
    respond(streams.getAll())
    return
  }

  if (method == 'getallextra') {
    respond(Object.assign({}, acebook.getAll() || {}, sopbook.getAll() || {}, local.getAll() || {}, youtube.getAll() || {}))
    return
  }

  if (method == 'locUpdateTime' && urlParsed.query && urlParsed.query.pid) {
    local.updateTime(urlParsed.query.pid)
    respond({})
    return
  }

  if (method == 'ytdlUpdateTime' && urlParsed.query && urlParsed.query.pid) {
    youtube.updateTime(urlParsed.query.pid)
    respond({})
    return
  }

  if (method == 'updateHistory') {
    const historyObj = settings.get('history')
    const params = urlParsed.query


    params.isLocal = !!(params.isLocal && params.isLocal == '1')

    const tokenId = tokens[reqToken]

    if (!historyObj[tokenId])
      historyObj[tokenId] = []

    params.utime = Date.now()

    historyObj[tokenId].some((histObj, ij) => {
      if (histObj.infohash == params.infohash && histObj.fileID == params.fileID) {
        historyObj[tokenId].splice(ij, 1)
        return true
      }
    })

    historyObj[tokenId].unshift(params)

    settings.set('history', historyObj)

    if (historyObj[tokenId].length > 20)
      historyObj[tokenId] = historyObj[tokenId].splice(0, 20)

    respond({})
    return
  }

  if (method == 'haveSyncBrowser') {

    const historyObj = settings.get('history')

    const tokenId = tokens[reqToken]

    respond({ value: !!(historyObj[tokenId] && historyObj[tokenId]) })

    return

  }

  if (method == 'syncBrowser') {

    // return last history item

    const historyObj = settings.get('history')

    const tokenId = tokens[reqToken]

    if (historyObj[tokenId] && historyObj[tokenId].length)
      respond(historyObj[tokenId][0])
    else
      page500('No History Items')

    return
  }

  if (method == 'historyList') {

    // return history items

    const historyObj = settings.get('history')

    const tokenId = tokens[reqToken]

    if (historyObj[tokenId] && historyObj[tokenId].length) {
       respond(historyObj[tokenId].map(el => {
        for (let key in el)
          if (['undefined', 'false'].includes(el[key]))
            el[key] = false
        return el
      }))
    } else
      page500('No History Items')

    return
  }

  if (method == 'removeHistoryItem') {

    const historyObj = settings.get('history')

    const tokenId = tokens[reqToken]

    historyObj[tokenId].splice(JSON.parse(urlParsed.query.id), 1)

    settings.set('history', historyObj)

    respond({})

    return

  }

  if (uri.startsWith('/subUpload')) {

    var form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {
        var oldpath = files.filetoupload.path
        var subType = files.filetoupload.name.split('.').pop()
        if (subType == 'vtt') {
          respond(oldpath)
        } else {
          fs.readFile(oldpath, 'utf8', function (err, sub) {
            if (err) {
              page500('Unknown Error')
              return
            }

            var srt = subsrt.convert(sub, { format: 'vtt' })

            var newpath = path.join(TMP, Date.now() + '.vtt')
            
            fs.writeFile(newpath, srt, function(err) {
                if(err) {
                    page500('Unknown Error')
                    return
                }

                respond(newpath)
            })
          })
        }
    })

    return
  }

  if (uri.startsWith('/srt2vtt/subtitle.vtt') && urlParsed.query && urlParsed.query.from) {
     var getSub = function(subUrl) {

      if (subUrl.startsWith('http')) {
        const ua = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
        const headOpts = {
          'user-agent': ua,
  //        cookie: subtitles.osCookie,
          referer: subUrl
        }
        needle.get(subUrl, { headers: headOpts, follow_max: 10, follow_set_referer: true, follow_set_cookies: true })
              .pipe(srt2vtt())
              .pipe(resp, { end: true })

      } else {

        var readStream = fs.createReadStream(subUrl)

        readStream.on('open', function () {
          readStream.pipe(resp, { end: true });
        })

      }
    }
    getSub(atob(urlParsed.query.from))
    return
  }

  if (method == 'getSubs' && urlParsed.query.infohash && urlParsed.query.id) {


    const subStart = (fileLoc, fileSize, torrentHash, isFinished) => {
            const subQuery = {}
            subQuery.filepath = fileLoc
            subQuery.torrentHash = torrentHash
            subQuery.byteLength = fileSize
            subQuery.isFinished = isFinished
              subQuery.cb = subs => {
                if (!subs) {
                  page500('No subtitles found')
                } else {
                  const orderedSubs = []
                  _.each(subs, (el, ij) => {
                    orderedSubs.push({
                      label: ij.split('[lg]')[0],
                      sublang: ij.split('[lg]')[1],
                      src: el,
                      ext: el.split('.').pop()
                    })
                  })
                  respond(orderedSubs.map((subEl) => {
                    if (subEl.ext == 'srt')
                      subEl.src = getReqUrl(req)+'/srt2vtt/subtitle.vtt?token='+reqToken+'&from='+btoa(subEl.src)
                    return subEl
                  }))
                }
            }

            subtitles.fetchSubs(subQuery);
    }

    if (!isNaN(urlParsed.query.infohash)) {
      // local file
      const loc = local.get(urlParsed.query.infohash)
      if (loc) {
        if (loc.location && !loc.isDirectory) {
            const stats = fs.statSync(loc.location)
            subStart(loc.location, stats.size, null, true)
        } else if (loc.files && loc.files.length) {
          const fl = loc.files[urlParsed.query.id]
          if (fl && fl.location) {
            const stats = fs.statSync(fl.location)
            subStart(fl.location, stats.size, null, true)
          }
        }
      }
    } else {
      streams.torrentData(urlParsed.query.infohash, (data, pieceBank) => {
        if (!data) {
          page500('Could not get torrent info 1')
        } else if (data.files && data.files.length) {
          let foundFile
          data.files.some((file) => {
            if (file.fileID == urlParsed.query.id) {
              foundFile = file
              return
            }
          })
          if (foundFile) {
            subStart(path.join(data.path, foundFile.path), foundFile.length, urlParsed.query.infohash, !!(pieceBank.filePercent(foundFile.offset, foundFile.length) >= 1))
          } else {
            page500('Could not get torrent info 3')
          }
        } else {
          page500('Could not get torrent info 2')

        }
      }, true)
    }
    return
  }

  if (method == 'speedUp' && urlParsed.query.id) {
    streams.speedUp(urlParsed.query.id)
    respond({})
    return
  }

  if (method == 'speedPulsing' && urlParsed.query.id) {
    streams.setPulse(urlParsed.query.id, urlParsed.query.max ? parseInt(urlParsed.query.max) : false)
    respond({})
    return
  }

  if (method == 'forceDownload' && urlParsed.query.id) {
    streams.isForced(urlParsed.query.id, (forced) => {
      streams.forceDownload(urlParsed.query.id, !forced)
    })
    respond({})
    return
  }

  if (method == 'toggleStateFile' && urlParsed.query.id && urlParsed.query.infoHash) {
    streams.toggleStateFile(urlParsed.query.infoHash, urlParsed.query.id)
    respond({})
    return
  }

  if (method == 'deleteAllPaused') {
    streams.deleteAllPaused()
    respond({})
    return
  }

  if (isMaster) {

    if (method == 'jackettLink') {
      shell.openExternal('https://github.com/jaruba/PowderWeb/wiki/Enable-Jackett')
      respond({})
      return
    }

    if (method == 'donateLink') {
      shell.openExternal('https://powder.media/donate')
      respond({})
      return
    }

    if (method == 'homeLink') {
      shell.openExternal('https://web.powder.media/')
      respond({})
      return
    }

    if (method == 'sopGuideLink') {
      shell.openExternal('https://github.com/jaruba/PowderWeb/wiki/Enable-Sopcast')
      respond({})
      return
    }

    if (method == 'openInBrowser') {
      const isSSL = config.get('webServerSSL') || false
      opn('http' + (isSSL ? 's': '') + '://localhost:' + serverPort + '/auth?token=' + masterKey)
      respond({})
      return
    }

    if (method == 'toggleMaximize') {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
      respond({})
      return
    }

    if (method == 'addLocal') {
      const loc = dialog.showOpenDialog({filters: { name: 'media', extensions: supported.ext.allMedia.map(el => { return el.replace('.','') })}, properties: ['openFile', 'openDirectory', 'createDirectory']})
      if (!loc || !loc.length) {
        respond({})
      } else {
        local.add(loc[0], (pid) => { respond({ pid }) }, (errMsg) => { page500(errMsg) })
      }
      return
    }

    if (method == 'minimize') {
      mainWindow.minimize()
      respond({})
      return
    }

    if (method == 'closeWindow') {
      mainWindow.loadURL( 'about:blank' );
      mainWindow.close()
      respond({})
      return
    }

    if (method == 'downloadFile' && urlParsed.query.file) {
      // this is for subtitles, because we can't download files in electron
      // so we download the subtitle programmatically and open the temp download folder
      helpers.downloadFile(atob(urlParsed.query.file), (filePath, dirPath) => {
        shell.showItemInFolder(filePath)
        respond({})
      })
      return
    }

    if (method == 'selectFile') {
      respond({ value: dialog.showOpenDialog({properties: ['openFile']}) })
      return
    }

    if (method == 'selectFolder') {
      respond({ value: dialog.showOpenDialog({properties: ['openDirectory', 'createDirectory']}) })
      return
    }

    if (method == 'associateMagnetLink') {
      register.link('magnet')
      respond({})
      return
    }

    if (method == 'associateTorrentFile') {
      register.torrent()
      respond({})
      return
    }

    if (method == 'associateAce') {
      register.link('acestream')
      respond({})
      return
    }

    if (method == 'associateSop') {
      register.link('sop')
      respond({})
      return
    }

    if (method == 'exec' && urlParsed.query.id && urlParsed.query.infoHash) {
      streams.getFilePath(urlParsed.query.infoHash, urlParsed.query.id, (filePath) => {
        if (!filePath) {
          page500('Path to file could not be found')
        } else {
          shell.openItem(filePath)
          respond({})
        }
      })
      return
    }

    if (method == 'fileLoc' && urlParsed.query.id && urlParsed.query.infoHash) {
      streams.getFilePath(urlParsed.query.infoHash, urlParsed.query.id, (filePath) => {
        if (!filePath) {
          page500('Path to file could not be found')
        } else {
          shell.showItemInFolder(filePath)
          respond({})
        }
      })
      return
    }

    if (method == 'localFileLoc' && urlParsed.query.pid) {
      const loc = local.get(urlParsed.query.pid)
      if (loc) {
        if (loc.location) {
          shell.showItemInFolder(loc.location)
        } else if (loc.files && loc.files.length) {
          const fl = loc.files[urlParsed.query.flId || 0]
          if (fl && fl.location) {
            shell.showItemInFolder(fl.location)
          } else {
            page500('Unknown Error Occurred')
         }
        } else {
         page500('Unknown Error Occurred')
        }
      } else {
        page500('Unknown Error Occurred')
      }
      return
    }

    if (method == 'localDirLoc' && urlParsed.query.pid) {
      const loc = local.get(urlParsed.query.pid)
      if (loc && loc.location) {
        shell.openItem(loc.location)
      }
      return
    }

    if (method == 'torrentLoc' && urlParsed.query.infoHash) {
      streams.getPath(urlParsed.query.infoHash, (folderPath) => {
        if (!folderPath) {
          page500('Path to folder could not be found')
        } else {
          shell.openItem(folderPath)
          respond({})
        }
      })
      return
    }

    if (method == 'openDefaultFolder') {
      if (config.get('downloadFolder'))
        shell.openItem(config.get('downloadFolder'))
      else
        shell.openItem(path.join(app.getPath('temp'), 'PowderWeb'))
      respond({})
      return
    }

    if (method == 'resetSettings') {
      defaults.reset()
      respond({})
      return
    }

    if (method == 'runPlaylist' && urlParsed.query.infoHash) {
      const thisTorrentId = streams.getTorrentId(urlParsed.query.infoHash)
      if (thisTorrentId) {
        const thisOrganizedFiles = streams.getOrganizedFiles(thisTorrentId)

        if (thisOrganizedFiles) {
          runPlaylist(thisTorrentId, thisOrganizedFiles)
          respond({})
        } else {
          page500('Could not get torrent files')
        }
      } else {
        page500('Torrent not running')
      }
      return
    }

    if (method == 'runAcePlaylist' && urlParsed.query.pid) {
      runAcePlaylist(urlParsed.query.pid)
      respond({})
      return
    }

    if (method == 'runSopPlaylist' && urlParsed.query.pid) {
      runSopPlaylist(urlParsed.query.pid)
      respond({})
      return
    }

    if (method == 'runLocalPlaylist' && urlParsed.query.pid) {
      runLocalPlaylist(urlParsed.query.pid)
      respond({})
      return
    }

    if (method == 'runYtdlPlaylist' && urlParsed.query.pid) {
      runYtdlPlaylist(urlParsed.query.pid)
      respond({})
      return
    }

  }

  if (method == 'isListening' && urlParsed.query.utime) {
    respond({ value: streams.isListening(urlParsed.query.utime) })
    return
  }

  if (method == 'update') {
    if (urlParsed.query && urlParsed.query.id) {
      const infoItem = streams.getUpdate(urlParsed.query.id)
      if (infoItem)
        respond(infoItem)
      else
        page404()
    } else {
      respond(streams.getUpdate())
    }
    return
  }

  if (method == 'cancel' && urlParsed.query.infohash) {
    streams.cancelByInfohash(urlParsed.query.infohash, () => {}, !!(urlParsed.query.force), !!(urlParsed.query.noDelete))
    respond({})
    return
  }

  if (method == 'search') {
    if (urlParsed.query.query) {
      if (jackettApi.haveJackett()) {
        const utime = Date.now()
        jackettResponses[utime] = []
        respond({ value: utime })
        jackettApi.search(urlParsed.query.query, { type: urlParsed.query.type }, (results) => {
          if (jackettResponses[utime])
            jackettResponses[utime].push(results)
        }, results => {
          if (jackettResponses[utime])
            jackettResponses[utime].push(results)
        })
      } else {
        return page500('no jackett')
      }

      return
    } else if (urlParsed.query.utime) {
      const utime = parseInt(urlParsed.query.utime)
      if (jackettResponses[utime]) {
        if (jackettResponses[utime].length) {
          const ended = jackettResponses[utime][0].ended
          respond(jackettResponses[utime][0])
          if (!ended)
            jackettResponses[utime].shift()
          else
            delete jackettResponses[utime]
        } else {
          respond({ ended: false, results: [] })
        }
      } else
        page500('No such Jackett response ID')

      return
    }
  }

  return page404()

}).listen(port, () => { })

mainServer.on('connection', function (socket) {
    socket.setTimeout(Number.MAX_SAFE_INTEGER)
})


// create peerflix proxy

var proxy = require('http-proxy').createProxyServer({
    prependPath: false,
    timeout: Number.MAX_SAFE_INTEGER,
    proxyTimeout: Number.MAX_SAFE_INTEGER
})

proxy.on('error', function(e) {
  if (e) {
    console.log('http proxy error')
    console.log(e)
  }
})

var srv = http.createServer(function (req, res) {
  req.setTimeout(Number.MAX_SAFE_INTEGER)
  const urlParsed = url.parse(req.url, true)
  let uri = urlParsed.pathname

//  console.log('REQUEST: ' + req.url)

  let reqToken

  if (req.headers && req.headers.authorization)
    reqToken = req.headers.authorization
  else if (urlParsed.query && urlParsed.query.token)
    reqToken = urlParsed.query.token
  else if (uri.startsWith('/api/')) {
    // vlc 3+ is bugged and breaks if
    // we use a token in the get vars
    const tokenParts = uri.split('/')
    reqToken = tokenParts[2]
    uri = uri.replace(reqToken+'/','')
  } else if (uri.startsWith('/hls/')) {
    const tokenParts = uri.split('/')
    reqToken = tokenParts[3]
    uri = uri.replace(reqToken+'/','')
  }

  const embedToken = config.get('embedToken')

  if (!req.url.startsWith('/ace/r/') && !req.url.startsWith('/content/') && !reqToken && !tokens[reqToken] && embedToken != reqToken) {
    res.writeHead(500, { "Content-Type": "text/plain" })
    res.write("Invalid access token\n")
    res.end()
    return
  }

  const getParams = (uri) => {
    const methods = ['web', 'api', 'meta', 'ace', 'hls', 'sop', 'ytdl', 'local']
    let cleanUri = uri
    methods.forEach(method => { cleanUri = cleanUri.replace('/' + method + '/', '') })
    const parts = cleanUri.split('/')
    let returnObj = {}
    returnObj.infohash = parts[0]
    returnObj.fileId = parts[1]
    if (parts[2]) {
      const moreParts = parts[2].split('.')
      if (moreParts[0] == 'audio') {
        returnObj.isAudio = true
        returnObj.videoContainer = parts[2].split('.').pop()
        returnObj.needsAudio = urlParsed.query.needsAudio
        returnObj.forAudio = urlParsed.query.forAudio
        returnObj.audio = urlParsed.query.a ? audioPresets.codecMap[urlParsed.query.a] : false
        returnObj.copyts = urlParsed.query.copyts
        returnObj.forceTranscode = urlParsed.query.forceTranscode
        returnObj.isLocal = urlParsed.query.isLocal
        returnObj.isYtdl = urlParsed.query.isYtdl
      } else {
        returnObj.videoQuality = moreParts[0]
        returnObj.videoContainer = parts[2].split('.').pop()
        returnObj.needsVideo = urlParsed.query.needsVideo
        returnObj.needsAudio = urlParsed.query.needsAudio
        returnObj.forAudio = urlParsed.query.forAudio
        returnObj.maxHeight = urlParsed.query.maxHeight
        returnObj.maxWidth = urlParsed.query.maxWidth
        returnObj.audio = urlParsed.query.a ? videoPresets.codecMap[urlParsed.query.a] : false
        returnObj.video = urlParsed.query.v ? videoPresets.codecMap[urlParsed.query.v] : false
        returnObj.copyts = urlParsed.query.copyts
        returnObj.forceTranscode = urlParsed.query.forceTranscode
        returnObj.useMatroska = urlParsed.query.useMatroska
        returnObj.audioDelay = parseFloat(urlParsed.query.audioDelay)
        returnObj.isLocal = urlParsed.query.isLocal
        returnObj.isYtdl = urlParsed.query.isYtdl
      }
    }
    return returnObj
  }

  const params = getParams(uri)

  let peerflixUrl

  streams.getPortFor(params.infohash, true, enginePort => {

    const useIp = (process.platform == 'linux')

    if (uri.startsWith('/ytdl/')) {

      if (params.infohash.startsWith('http')) {

        const ytdlObj = youtube.get(params.infohash)

        if (ytdlObj && ytdlObj.extracted) {

          const urlParsed = require('url').parse(ytdlObj.extracted)

          var configProxy = { target: ytdlObj.extracted }

          configProxy.headers = {
              host: urlParsed.host,
              pathname: urlParsed.pathname,
              referer: ytdlObj.originalURL,
              agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/610.0.3239.132 Safari/537.36'
          }

          if (urlParsed.protocol == 'https:')
              configProxy.agent = require('https').globalAgent

          req.headers['host'] = configProxy.headers.host

          req.headers['referer'] = ytdlObj.originalURL
          req.headers['user-agent'] = configProxy.headers.agent

          res.setHeader('Access-Control-Allow-Origin', '*')

          req.url = ytdlObj.extracted

          proxy.web(req, res, configProxy);

        }
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" })
        res.write("Invalid Resource\n")
        res.end()
      }

      return

    } else if (uri.startsWith('/local/')) {

      const loc = local.get(params.infohash)

      const serveFile = (fileLoc) => {
        if (req.method === 'OPTIONS' && req.headers['access-control-request-headers']) {
          res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
          res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
          res.setHeader(
              'Access-Control-Allow-Headers',
              req.headers['access-control-request-headers'])
          res.setHeader('Access-Control-Max-Age', '1728000')

          res.end()
          return
        }

        if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)

        var range = req.headers.range
        var fileLength = fs.lstatSync(fileLoc).size
        range = range && rangeParser(fileLength, range)[0]

        res.setHeader('Accept-Ranges', 'bytes')

        const parts = fileLoc.split('.')

        const ext = parts[parts.length-1]

        res.setHeader('Content-Type', supported.contentType(ext))

        if (!range) {
          res.setHeader('Content-Length', fileLength)
          if (req.method === 'HEAD') return res.end()

          pump(fs.createReadStream(fileLoc), res)

          return
        }

        res.statusCode = 206
        res.setHeader('Content-Length', range.end - range.start + 1)
        res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fileLength)

        if (req.method === 'HEAD') return res.end()
        
        pump(fs.createReadStream(fileLoc, range), res)
      }

      if (loc) {

        if (loc.location && !loc.isDirectory && fs.existsSync(loc.location)) {
          serveFile(loc.location)
          return
        } else if (loc.files && loc.files.length) {
          loc.files.some((fl, idx) => {
            if (idx == params.fileId) {
              if (fl.location && fs.existsSync(fl.location)) {
                serveFile(fl.location)
              } else {
                res.writeHead(500, { "Content-Type": "text/plain" })
                res.write("Invalid Resource\n")
                res.end()
              }
              return true
            }
          })
          return
        }
        res.writeHead(500, { "Content-Type": "text/plain" })
        res.write("Invalid Resource\n")
        res.end()
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" })
        res.write("Invalid Resource ID\n")
        res.end()
      }
      return
    }

    if (params.isYtdl || (uri.startsWith('/meta') && params.infohash.startsWith('http'))) {
      peerflixUrl = 'http://' + (useIp ? '127.0.0.1' : 'localhost') + ':'+peerflixProxy+'/ytdl/'+params.infohash+'/'+params.fileId+'?token='+reqToken
    } else if (params.isLocal || (uri.startsWith('/meta') && (!isNaN(params.infohash) || params.infohash.startsWith('http')))) {
      peerflixUrl = 'http://' + (useIp ? '127.0.0.1' : 'localhost') + ':'+peerflixProxy+'/local/'+params.infohash+'/'+params.fileId+'?token='+reqToken
    } else if (enginePort)
      peerflixUrl = 'http://' + (useIp ? '127.0.0.1' : 'localhost') + ':'+enginePort+'/'+params.fileId

      console.log('peerflix url: '+ peerflixUrl)

    if (uri.startsWith('/web/')) {
      // ffmpeg proxy

      let videoParams
      let sizeParams

      if (params.isAudio) {

        videoParams = audioPresets[params.videoContainer]

      } else {

        videoParams = videoPresets[params.videoContainer]
        sizeParams = videoPresets.quality[params.videoQuality]

      }

      res.setHeader('content-type', videoParams.contentType)

      let start = false;

      if (urlParsed.query) {
        if (typeof urlParsed.query.start != 'undefined' && urlParsed.query.start != null) {
          start = parseFloat(urlParsed.query.start);
        }
        if (urlParsed.query.quality) {
          
        }
      }

      let outputOpts = []

      let resized = false

      if (!params.isAudio) {
        resized = params.needsVideo > -1 && (params.videoQuality == params.maxHeight+'p' || (sizeParams || {}).resolution == params.maxWidth+'x?') ? false : true
      }

      if (!params.videoContainer)
        params.videoContainer = urlParsed.pathname.split('.').pop()

  //    if (params.needsVideo > -1 && !resized)
      if (!params.isAudio) {
        outputOpts.unshift('-map 0:v:'+(params.needsVideo > -1 ? params.needsVideo : 0))
      }

      outputOpts.unshift('-map ' + (params.audioDelay ? '1' : '0') + ':a:'+(params.forAudio > -1 ? params.forAudio : params.needsAudio > -1 ? params.needsAudio : 0))

      const chromeProfile = (params.useMatroska > -1 && params.videoContainer == 'mp4')

      if (!params.isAudio) {
        outputOpts = outputOpts.concat(videoParams[(chromeProfile ? 'chrome' : 'output') + 'Options'])

        if (!params.audioDelay && (params.copyts > -1 || chromeProfile)) {
          outputOpts.push('-copyts')
        }
      }


      let shouldAudio = false

      if (params.forceTranscode > -1 || params.forAudio > -1 || params.needsAudio == -1) {
        shouldAudio = true
      }

      if (params.isAudio) {

        const whichAudio = shouldAudio ? (params.audio ? params.audio : videoParams.codecs.audio) : 'copy'

        if (['mp4', 'mp3', 'oga'].indexOf(params.videoContainer) > -1) {

          var command = ffmpeg(peerflixUrl)

          if(start) {
            command.seekInput(convertSecToTime(start))
          }

          command.format(params.videoContainer == 'oga' ? 'ogg' : params.videoContainer)

          command
          .addOptions('-acodec ' + whichAudio)
          .addOptions('-ac 2')
          .outputOptions(outputOpts)
          .on('error', function(err) {
            console.log('an error happened: ' + err.message);
          })


          command.pipe(res, { end: true });

        } else {
          page404()
        }
        return
      }

      let shouldVideo = false

      if (params.forceTranscode > -1) {
        // if forced transcoding
        shouldVideo = true
      } else if (params.needsVideo == -1) {
        // if needs transcoding
        shouldVideo = true
      } else if (resized) {
        // it's resized, needs transcoding
        shouldVideo = true
      } else if (shouldAudio) {
        // if it doesn't need audio encoding either
        shouldVideo = true
      }

      if (params.videoContainer == 'ts') {

        req.url += '&shouldVideo=' + (shouldVideo ? '1' : '-1') + '&shouldAudio=' + (shouldAudio ? '1' : '-1')

        hlsVod.segment(ffmpegPath, peerflixUrl, req, res, urlParsed.query.targetWidth)

        // transcode hls to hdd

  //      req.url = 'http://localhost:4040/hls/' + req.url.split('/').pop()

  //      proxy.web(req, res, { target: req.url });

        return

      } else if (params.videoContainer == 'm3u8') {

        req.url = req.url + '&ab=' + sizeParams.bitrate.audio + '&vb=' + sizeParams.bitrate.video + '&resized=' + resized + '&audio=' + params.audio + '&video=' + params.video + '&targetWidth=' + parseInt(sizeParams.resolution) + '&audioDelay=' + params.audioDelay

        hlsVod.playlist(ffprobePath, peerflixUrl, req, res, params.infohash, parseInt(sizeParams.resolution), urlParsed.query.start || 0)

        // transcode hls to hdd

        // req.url = 'http://localhost:4040/hls/'+enginePort+'-'+params.fileId+(start ? '-' + encodeURIComponent(start) : '')+'/'+parseInt(sizeParams.resolution)+'.m3u8' + urlParsed.search + '&ab=' + sizeParams.bitrate.audio + '&vb=' + sizeParams.bitrate.video + '&resized=' + resized + '&audio=' + params.audio + '&video=' + params.video

        // proxy.web(req, res, { target: req.url });

        return

      } else {

        const whichVideo = shouldVideo ? (params.video ? params.video : videoParams.codecs.video) : 'copy'
        const whichAudio = shouldAudio ? (params.audio ? params.audio : videoParams.codecs.audio) : 'copy'

        if (params.videoContainer == 'webm') {

          var command = ffmpeg(peerflixUrl)

          if (params.audioDelay) {
            if (start)
              command.addOptions(['-ss '+convertSecToTime(start)])
            command.addOptions(['-itsoffset '+params.audioDelay, '-i '+peerflixUrl])
          }

          if(start) {
            command.seekInput(convertSecToTime(start))
          }

          command.format('webm')

          if (resized) {
            command.addOptions(['-filter:v scale=w='+sizeParams.resolution.split('x')[0]+':h=trunc(ow/a/2)*2'])
  //          command.size(sizeParams.resolution)
          }

          command
          .addOptions('-vcodec ' + whichVideo)
          .addOptions('-b:v ' + ('' + sizeParams.bitrate.video).replace(/k?$/, 'k'))
          .addOptions('-acodec ' + whichAudio)
          .addOptions('-b:a ' + ('' + sizeParams.bitrate.audio).replace(/k?$/, 'k'))
          .addOptions('-ac 2')
          // .videoCodec(whichVideo)
          // .videoBitrate(sizeParams.bitrate.video)
          // .audioCodec(whichAudio)
          // .audioBitrate(sizeParams.bitrate.audio)
          // .audioChannels(2)
  //        .on('end', function() {
  //          console.log('file has been converted succesfully');
  //        })
          // .on('start', function(cmdLine) {
          //   console.log("START START START START")
          //   console.log(cmdLine)
          // })
          .outputOptions(outputOpts)
          .on('error', function(err) {
            console.log('an error happened: ' + err.message);
          })

        } else if (params.videoContainer == 'mp4') {

          var command = ffmpeg(peerflixUrl)

          if (params.audioDelay) {
            if (start)
              command.addOptions(['-ss '+convertSecToTime(start)])
            command.addOptions(['-itsoffset '+params.audioDelay, '-i '+peerflixUrl])
          }

  console.log('start is: '+start)
  console.log('converted time is: '+convertSecToTime(start))
          if(start)
            command.seekInput(convertSecToTime(start) || 0)

  //      command.format('mp4')
          if (resized && ((sizeParams || {}).resolution || '').length) {
  //           command.size(sizeParams.resolution)
            command.addOptions(['-filter:v scale=w='+sizeParams.resolution.split('x')[0]+':h=trunc(ow/a/2)*2'])
          }

          command
          .addOptions('-vcodec ' + whichVideo)
          .addOptions('-acodec ' + whichAudio)
  //        .addOptions('-acodec libvo_aacenc')
          .addOptions('-ac 2')
          .on('start', function(cmdLine) {
             console.log("START START START START")
             console.log(cmdLine)
          })
    //        .on('end', function() {
    //          console.log('file has been converted succesfully');
    //        })
            .outputOptions(outputOpts)
            .on('error', function(err) {
              console.log('an error happened: ' + err.message);
            })

          } else if (params.videoContainer == 'ogv') {

            var command = ffmpeg(peerflixUrl)

            if (params.audioDelay) {
              if (start)
                command.addOptions(['-ss '+convertSecToTime(start)])
              command.addOptions(['-itsoffset '+params.audioDelay, '-i '+peerflixUrl])
            }

            if(start)
              command.seekInput(convertSecToTime(start))

            command.format('ogg')

            if (resized) {
              command.addOptions(['-filter:v scale=w='+sizeParams.resolution.split('x')[0]+':h=trunc(ow/a/2)*2'])
    //          command.size(sizeParams.resolution)
            }

            command
            .addOptions('-vcodec ' + whichVideo)
            .addOptions('-acodec ' + whichAudio)
            .addOptions('-ac 2')
    //        .on('end', function() {
    //          console.log('file has been converted succesfully');
    //        })
            .outputOptions(outputOpts)
            .on('error', function(err) {
              console.log('an error happened: ' + err.message);
            })

          }
        }

        if (command)
          command.pipe(res, { end: true });
        else
          res.end()

      } else if (uri.startsWith('/meta')) {
        var command = ffmpeg(peerflixUrl)
        .ffprobe(0, function(err, data) {
          if (!err && data) {
            res.writeHead(200, {});
            res.write(JSON.stringify(data))
            res.end()
          } else {
            res.writeHead(500, { "Content-Type": "text/plain" })
            res.write((err && err.message ? err.message : "Cannot fetch video metadata") + "\n")
            res.end()
          }
        })
      } else if (uri.startsWith('/ace/') || uri.startsWith('/content/')) {

        if (req.url.startsWith('/ace/r/') || req.url.startsWith('/content/')) {
          req.url = 'http://127.0.0.1:6878' + req.url
          proxy.web(req, res, { target: req.url });
        } else {

  //      console.log('ace request')

          req.url = acestream.streamLink(params.infohash)

  //      console.log('redirect to: ' + req.url)

          proxy.web(req, res, { target: req.url });
        }

      } else if (uri.startsWith('/sop/')) {

        req.url = sop.streamLink(params.infohash)

  //      console.log('redirect to: ' + req.url)

        proxy.web(req, res, { target: req.url });

      } else if (uri.startsWith('/hls/')) {

        const aceHlsPort = hlsLink.port(params.infohash)

        if (!aceHlsPort) {
          res.writeHead(404, { "Content-Type": "text/plain" })
          res.write("404 Not Found\n")
          res.end()
          return
        }

        req.url = 'http://127.0.0.1:' + aceHlsPort + '/' + params.fileId

        proxy.web(req, res, { target: req.url });

      } else {

        // peerflix proxy

        req.url = peerflixUrl || (getReqUrl(req) + '/404')

        proxy.web(req, res, { target: req.url });

      }
    })
  })

  srv.listen(peerflixProxy)

  srv.on('error', function(e) {
    console.log('http proxy error')
    console.log(e)
  })

  srv.on('connection', function(socket) {
    socket.setTimeout(Number.MAX_SAFE_INTEGER);
  })

  srv.on('listening',function() { })

  if (process.env.NODE_ENV !== 'development') {
    // create web server

    var webProxy = require('http-proxy').createProxyServer({
        timeout: Number.MAX_SAFE_INTEGER,
        proxyTimeout: Number.MAX_SAFE_INTEGER
    })

    const proxyLogic = [{
      context: ["/playlist.m3u", "/getplaylist.m3u", "/getaceplaylist.m3u", "/getsopplaylist.m3u", "/getlocalplaylist.m3u", "/getytdlplaylist.m3u", "/srt2vtt/subtitle.vtt", "/404", "/actions", "/subUpload"],
      target: "http://localhost:" + port
    }, {
      context: ["/api/", "/web/", "/meta/", "/hls/", "/ace/", "/content/", "/sop/", "/local/", "/ytdl/"],
      target: "http://localhost:" + peerflixProxy
    }]

    const serverLogic = (req, res) => {

      req.setTimeout(Number.MAX_SAFE_INTEGER)
      const urlParsed = url.parse(req.url, true)
      let uri = urlParsed.pathname

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Request-Method', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      res.setHeader('Access-Control-Allow-Headers', '*');

      const foundProxy = proxyLogic.some((prx) => {
        return prx.context.some((ctx) => {
          if (uri.startsWith(ctx)) {
            webProxy.web(req, res, { target: prx.target });
            return true
          }
        })
      })

      const indexFile = '/index.html'

      if (!foundProxy) {

        if (!uri || uri == '/')
          uri = indexFile

        const routes = ['auth', 'torrent', 'embed']

        const isRoute = routes.some((el) => {
          if (uri.startsWith('/' + el))
            return true
        })

        if (isRoute)
          uri = indexFile

        let filePath = path.join(__dirname, '../dist', uri.substr(1));

        const extname = path.extname(filePath)

        let contentType = 'text/html';

        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;      
            case '.jpg':
                contentType = 'image/jpg';
                break;
            case '.ico':
                contentType = 'image/x-icon';
                break;
        }

        fs.readFile(filePath, (error, content) => {
          if (error) {
              if(error.code == 'ENOENT'){
                  res.writeHead(404);
                  res.end('404 File Not Found\n');
                  res.end(); 
              }
              else {
                  res.writeHead(500);
                  res.end('Sorry, check with the developers for error: '+error.code+' ..\n');
                  res.end(); 
              }
          } else {
              res.writeHead(200, { 'Content-Type': contentType });
              res.end(content, 'utf-8');
          }
        })
      }

    }

    const useSSL = config.get('webServerSSL') || false

    let mainSrv

    if (useSSL) {
      const sslCert = sslUtil.generate()
      mainSrv = https.createServer({
        key: sslCert,
        cert: sslCert
      }, serverLogic)
    } else {
      mainSrv =http.createServer(serverLogic)
    }

    mainSrv.listen(serverPort)

    mainSrv.on('error', function(e) {
      console.log('web server error')
      console.log(e)
    })

    mainSrv.on('connection', function(socket) {
      socket.setTimeout(Number.MAX_SAFE_INTEGER);
    })

    mainSrv.on('listening', function() { serverPort = mainSrv.address().port })

  }
}

if (process.env.PWFRONTPORT && process.env.PWBACKPORT) {
  initServer()
}

let mainWindow

module.exports = {
  masterKey,
  argsKey,
  isSSL: config.get('webServerSSL') || false,
  port: () => { return serverPort },
  embedKey: config.get('embedToken') || '',
  setMainWindow: mWindow => { mainWindow = mWindow },
  init: function(frontPort, backPort) {
    port = frontPort
    peerflixProxy = backPort
    initServer()
  },
  passArgs: (args) => {
    clArgs.process(Array.isArray(args) ? args : [args], argsKey)
  }
}

