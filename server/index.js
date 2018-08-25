
const { app, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('easy-ffmpeg')
var dir = path.join(app.getPath('appData'), 'PowderWeb');

const openerDir = path.join(dir, 'openers')

const fastResumeDir = path.join(dir, 'fastresume')

const hlsVod = require('../node_modules/hls-vod/hls-vod.js')

//hlsVod(ffmpeg)

var transcoderPath = ffmpeg()

let ffmpegPath
let ffprobePath

transcoderPath._getFfmpegPath(function(err, ffpath) { ffmpegPath = ffpath })
transcoderPath._getFfprobePath(function(err, ffpath) { ffprobePath = ffpath })

const videoPresets = require('./presets/videoPresets')

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
const childProcess = require('child_process')
const settings = require('electron-settings')
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

const srt2vtt = require('srt-to-vtt')

const opn = require('opn')

const helpers = require('./utils/misc')

const jackettApi = require('./jackett')

const masterKey = uniqueString()

const argsKey = uniqueString()

const qrCode = require('./utils/qrcode')

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

let serverPort = settings.get('webServerPort') || 3000

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

  const embedToken = settings.get('embedToken')

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
    respond({ value: (_.size(settings.get('users')) < settings.get('maxUsers')) })
    return
  }

  if (method == 'signup' && urlParsed.query.value) {
    if (settings.get('maxUsers') && _.size(settings.get('users')) >= settings.get('maxUsers')) {
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

  if (isEmbed && ['embedStart', 'torrentData', 'getSubs', 'updateHistory'].indexOf(method) == -1 && !uri.startsWith('/srt2vtt/subtitle.vtt'))
    return page500('Invalid access token')

  if (method == 'settings') {
    _.forEach(urlParsed.query, (el, ij) => {
      if (ij == 'token' || ij == 'method') return
      if (el == 'true') el = true
      else if (el == 'false') el = false
      else if (!isNaN(el)) el = parseInt(el)
      settings.set(ij, el)
    })
    respond({})
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
      const sets = settings.getAll()
      delete sets.addressbook
      delete sets.history
      delete sets.users
      respond(sets)
    } else {
      respond({ value: settings.get(urlParsed.query.for) })
    }
    return
  }

  const runPlaylist = (torrentId, organizedFiles) => {
    if (organizedFiles) {

      if (organizedFiles.streamable) {

        const reqUrl = getReqUrl(req)

        // create playlist of streams

        if (settings.get('extPlayer')) {

          // open with selected external player

          const playlist = reqUrl + '/playlist.m3u?id=' + torrentId + '&token=' + reqToken

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
          }, reqUrl)
        }

      }
    }
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

  if (method == 'new' && urlParsed.query && urlParsed.query.torrent) {

    let torrentId

    if (isMaster) {
      const shouldNotify = settings.get('torrentNotifs')

      if (shouldNotify) {
        notifier.notify({
            title: 'Powder Web',
            message: 'Torrent started downloading',
            icon: path.join(__dirname, '..', 'packaging', 'icons', 'powder-square.png'),
          }, (err, response) => {
            // Response is response from notification
          }
        )
      }
    }

    streams.new(urlParsed.query.torrent,

                torrentObj => {
                  torrentId = torrentObj.utime
                  respond(torrentObj)
                },

                (engine, organizedFiles) => {

                  // ready


                  engine.on('complete', () => {
                    if (isMaster) {
                      const shouldNotify = settings.get('torrentNotifs')

                      if (shouldNotify) {
                        notifier.notify({
                            title: 'Powder Web',
                            message: 'Torrent finished downloading',
                            icon: path.join(__dirname, '..', 'packaging', 'icons', 'powder-square.png'),
                            wait: true,
                          }, (err, response) => {
                            // Response is response from notification
                          }
                        )
                        notifier.on('click', (notifierObject, options) => {
                          streams.getPath(engine.infoHash, (folderPath) => {
                            if (folderPath) {
                              shell.openItem(folderPath)
                            }
                          })
                        })
                      }
                    }

                    // execute user set commands at end of download
                    // (yes, not only in isMaster case)

                    const userCommands = settings.get('userCommands')

                    if (userCommands) {

                      const newEnv = JSON.parse(JSON.stringify(process.env))

                      const nextCommand = (allCommands, folderPath) => {
                        allCommands.shift()
                        runCommands(allCommands, folderPath)
                      }

                      const runCommands = (allCommands, folderPath) => {

                        if (allCommands.length) {

                          let currentCommand = allCommands[0].trim()

                          if (currentCommand.includes('%folder%')) {
                            currentCommand.split('%folder%').join('"' + folderPath + '"')
                          }

                          currentCommand = currentCommand.split(' ')

                          const firstPart = currentCommand[0]

                          currentCommand.shift()

                          const commandProc = child.spawn(firstPart, currentCommand, {
                            env: newEnv
                          })

                          commandProc.stderr.on('data', () => {
                            nextCommand(allCommands, folderPath)
                          })

                          commandProc.on('exit', () => {
                            nextCommand(allCommands, folderPath)
                          })

                        }

                      }

                      let allCommands = []

                      if (userCommands.includes(';;')) {
                        allCommands = userCommands.split(';;')
                      } else {
                        allCommands = [userCommands]
                      }

                      streams.getPath(engine.infoHash, (folderPath) => {
                        runCommands(allCommands, folderPath)
                      })

                    }
                  })

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

                })

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
                  const filePath = path.join(app.getPath('appData'), 'playlist'+(Date.now())+'.m3u')
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

  if (method == 'updateHistory') {
    const historyObj = settings.get('history')
    const params = urlParsed.query

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

    if (historyObj[tokenId] && historyObj[tokenId].length)
      respond(historyObj[tokenId])
    else
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
          const subQuery = {}
          subQuery.filepath = path.join(data.path, foundFile.path)
          subQuery.torrentHash = urlParsed.query.infohash
          subQuery.byteLength = foundFile.length
          subQuery.isFinished = !!(pieceBank.filePercent(foundFile.offset, foundFile.length) >= 1)
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
        } else {
          page500('Could not get torrent info 3')
        }
      } else {
        page500('Could not get torrent info 2')

      }
    }, true)
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

  if (method == 'jackettLink') {
    shell.openExternal('https://github.com/Jackett/Jackett' + (urlParsed.query && urlParsed.query.anchor ? ('#'+urlParsed.query.anchor) : ''))
    respond({})
    return
  }

  if (isMaster) {

    if (method == 'openInBrowser') {
      const isSSL = settings.get('webServerSSL') || false
      opn('http' + (isSSL ? 's': '') + '://127.0.0.1:' + serverPort + '/auth?token=' + masterKey)
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

    if (method == 'minimize') {
      mainWindow.minimize()
      respond({})
      return
    }

    if (method == 'closeWindow') {
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
      register.magnet()
      respond({})
      return
    }

    if (method == 'associateTorrentFile') {
      register.torrent()
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
      if (settings.get('downloadFolder'))
        shell.openItem(settings.get('downloadFolder'))
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
  }

  const embedToken = settings.get('embedToken')

  if (!reqToken || !tokens[reqToken]) {
    res.writeHead(500, { "Content-Type": "text/plain" })
    res.write("Invalid access token\n")
    res.end()
    return
  }

  const getParams = (uri) => {
    const parts = uri.replace('/web/', '').replace('/api/', '').replace('/meta/', '').split('/')
    let returnObj = {}
    returnObj.infohash = parts[0]
    returnObj.fileId = parts[1]
    if (parts[2]) {
      const moreParts = parts[2].split('.')
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
    }
    return returnObj
  }

  const params = getParams(uri)

  let peerflixUrl

  const enginePort = streams.getPortFor(params.infohash)

  const useIp = (process.platform == 'linux')

  if (enginePort)
    peerflixUrl = 'http://' + (useIp ? '127.0.0.1' : 'localhost') + ':'+enginePort+'/'+params.fileId

  if (uri.startsWith('/web/')) {
    // ffmpeg proxy

    const videoParams = videoPresets[params.videoContainer]
    const sizeParams = videoPresets.quality[params.videoQuality]

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

    const resized = params.needsVideo > -1 && (params.videoQuality == params.maxHeight+'p' || sizeParams.resolution == params.maxWidth+'x?') ? false : true

    if (!params.videoContainer)
      params.videoContainer = urlParsed.pathname.split('.').pop()

//    if (params.needsVideo > -1 && !resized)
    outputOpts.unshift('-map 0:v:'+(params.needsVideo > -1 ? params.needsVideo : 0))
    outputOpts.unshift('-map ' + (params.audioDelay ? '1' : '0') + ':a:'+(params.forAudio > -1 ? params.forAudio : params.needsAudio > -1 ? params.needsAudio : 0))

    const chromeProfile = (params.useMatroska > -1 && params.videoContainer == 'mp4')

    if (chromeProfile)
      outputOpts = outputOpts.concat(videoParams.chromeOptions)
    else
      outputOpts = outputOpts.concat(videoParams.outputOptions)

    if (!params.audioDelay && (params.copyts > -1 || chromeProfile)) {
      outputOpts.push('-copyts')
    }


    let shouldAudio = false

    if (params.forceTranscode > -1 || params.forAudio > -1 || params.needsAudio == -1) {
      shouldAudio = true
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

        if(start)
          command.seekInput(convertSecToTime(start))

//      command.format('mp4')
        if (resized) {
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
    } else {

      // peerflix proxy

      req.url = peerflixUrl || (getReqUrl(req) + '/404')

      proxy.web(req, res, { target: req.url });

    }
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
      context: ["/playlist.m3u", "/getplaylist.m3u", "/srt2vtt/subtitle.vtt", "/404", "/actions", "/subUpload"],
      target: "http://localhost:" + port
    }, {
      context: ["/api/", "/web/", "/meta/"],
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

    const useSSL = settings.get('webServerSSL') || false

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
  isSSL: settings.get('webServerSSL') || false,
  port: () => { return serverPort },
  embedKey: settings.get('embedToken') || '',
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

