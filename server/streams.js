
const { app } = require('electron')
const createTorrent = require('./utils/torrent')
const config = require('./utils/config')
const parser = require('./utils/parser')
const helpers = require('./utils/misc')
let addresses = require('./utils/addressbook')
let uploadedBook = require('./utils/uploadedbook')
let completedBook = require('./utils/completedbook')
let fastresumebook = require('./utils/fastresumebook')
let streams = {}
let shouldDestroy = {}
let canceled = {}
const path = require('path')
const pUrl = require('url')
const _ = require('lodash')
const fs = require('fs')
const os = require('os')
const ip = require('my-local-ip')
const parseTorrent = require('parse-torrent')
const organizer = require('./utils/file_organizer')
const isTorrentString = require('./utils/isTorrentString')
const checksum = require('checksum')
const async = require('async')
const rimraf = require('rimraf')
const notifier = require('node-notifier')
const childProcess = require('child_process')
const supported = require('./utils/isSupported')
const subAutoDownload = require('./utils/subAutoDownload')

const openerDir = path.join(app.getPath('appData'), 'PowderWeb', 'openers')
const tempDir = path.join(os.tmpDir(), 'PowderWeb', 'torrent-stream')
const fastResumeDir = path.join(app.getPath('appData'), 'PowderWeb', 'fastresume')

let loading = {}

const readableSize = (fileSizeInBytes) => {
    
    if (!fileSizeInBytes) return '0.0 kB';
    
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    
    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

const engineExists = (utime, cb, elseCb) => {
    if (streams[utime] && streams[utime].engine)
        cb(streams[utime].engine, utime)
    else
        elseCb && elseCb()
}

const isCanceled = (utime, cb, cancelCb) => {
    if (canceled[utime] || !streams[utime])
        cancelCb && cancelCb()
    else
        cb && cb()
}

const isRedirectToMagnet = (url, cb) => {
    var http = require(url.startsWith('http:') ? 'http' : 'https');
    var parsedUrl = require('url').parse(url)

    if (parsedUrl.host.includes(':'))
        parsedUrl.host = parsedUrl.host.split(':')[0]
    var options = {method: 'GET', host: parsedUrl.host, port: parsedUrl.port, path: parsedUrl.path, headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36', 'Referer': url}};
    var req = http.request(options, function(res) {
        if (!cb) return
        if (res && res.headers && res.headers.location) {
            cb && cb(isTorrentString.isMagnetLink(res.headers.location), res.headers.location)
        } else {
            cb && cb(false)
        }
        cb = false
      }
    );
    req.end();
}

const basicTorrentData = (torrent, cb) => {
    torrent = Buffer.isBuffer(torrent || '') ? torrent.toString() : torrent
    console.log('basic torrent data')
    console.log(torrent)
    if (!torrent || !torrent.startsWith) {
        cb(new Error('Unknown Error'))
        return
    }
    if (isTorrentString.isMagnetLink(torrent)) {
        // magnet link
        cb(null, torrent, parseTorrent(torrent))
    } else if (isTorrentString.isTorrentLink(torrent)) {
        isRedirectToMagnet(torrent, (isMagnet, torrentUrl) => {
            if (!isMagnet) {
                // remote .torrent
                parseTorrent.remote(torrent, (err, parsed) => {
                    if (parsed && parsed.info && parsed.info.private) {
                        helpers.downloadFile(torrentUrl || torrent, function(fileLoc) {
                            cb(err, fileLoc || torrentUrl || torrent, parsed)
                        }, (parsed.infoHash || Date.now()) + '.torrent', openerDir)
                    } else {
                        cb(err, parsed ? parseTorrent.toMagnetURI(parsed) : torrent, parsed)
                    }
                })
            } else {
                basicTorrentData(torrentUrl, cb)
            }
        })
    } else if (isTorrentString.isTorrentPath(torrent)) {
        // local .torrent
        let parsed

        try {
            parsed = parseTorrent(fs.readFileSync(torrent))
        } catch (e) { }

        if (parsed) {
            if (parsed.info && parsed.info.private) {
                cb(null, torrent, parsed)
            } else {
                cb(null, parseTorrent.toMagnetURI(parsed), parsed)
            }
        } else {
            cb(new Error('Could not read torrent file'))
        }
    } else {
        cb(new Error('Unsupported source'))
    }
}

const closeAll = (cb) => {

    if (updateInterval)
        clearInterval(updateInterval)

    updateInterval = false

    if (concurrencyInterval)
        clearInterval(concurrencyInterval)

    concurrencyInterval = false

    let ticks = _.size(streams)

    if (!ticks)
        return cb()

    const closeTimeout = setTimeout(() => {
        cb && cb()
        cb = false
    }, 30000) // 30 sec timeout

    _.each(streams, (el, ij) => {
        cancelTorrent(ij, () => {
            ticks--
            if (!ticks) {
                clearTimeout(closeTimeout)
                cb && cb()
            }
        }, false, true)
    })

}

let updateInterval = setInterval(() => {

    let results = []

    _.each(streams, (el, ij) => {
        if (streams[ij] && streams[ij].engine)
            results.push(torrentObj(parseInt(ij), null, streams[ij].engine))
    })

    if (results.length)
        addresses.updateList(results)

}, 1000)

const removeList = {}

// remove torrents one by one to ensure data is deleted properly
const removeQueue = async.queue((task, cb) => {
    if (task.iHash && removeList[task.iHash]) {
        let finished = false
        let timeOut = setTimeout(() => {
            if (finished) return
            finished = true
            cb()
        }, 10000)
        const removeNext = () => {
            if (removeList[task.iHash].cb)
                removeList[task.iHash].cb()
            delete removeList[task.iHash]
            if (finished) return
            finished = true
            clearTimeout(timeOut)
            cb()
        }
        if (removeList[task.iHash].engine) {
            // if torrent running
            removeList[task.iHash].engine.kill(removeNext)
        } else if (removeList[task.iHash].folderPath) {
            // if torrent not running
            rimraf(removeList[task.iHash].folderPath, { maxBusyTries: 100 }, removeNext)
        } else
            removeNext()
    } else
        cb()
}, 1)

const completelyRemove = (iHash, engine, cb) => {

    actions.getPath(iHash, (folderPath) => {

        iHash = iHash || engine.infoHash

        addresses.remove(iHash)
        uploadedBook.remove(iHash)
        completedBook.remove(iHash)

        const appDataTorrentFilePath = path.join(openerDir, iHash + '.torrent')

        if (fs.existsSync(appDataTorrentFilePath)) {
            fs.unlink(appDataTorrentFilePath, () => {})
        }

        const appDataMagnetLink = path.join(openerDir, iHash + '.magnet')

        if (fs.existsSync(appDataMagnetLink)) {
            fs.unlink(appDataMagnetLink, () => {})
        }

        const appDataFastResume = path.join(fastResumeDir, iHash + '.fastresume')

        if (fs.existsSync(appDataFastResume)) {
            fs.unlink(appDataFastResume, () => {})
            fastresumebook.remove(iHash)
        }

        removeList[iHash] = { engine, folderPath, cb }
        removeQueue.push({ iHash })
    })
}

const cancelTorrent = (utime, cb, force, noDelete) => {

    engineExists(utime, (engine, ij) => {

//        if (!noDelete && (force || config.get('removeLogic') == 1)) {
        if (config.get('removeLogic') == 1 || (!noDelete && force)) {

            completelyRemove(engine.infoHash, engine, cb)

        } else if (noDelete || config.get('removeLogic') == 2) {

            const lastUploaded = uploadedBook.get(engine.infoHash) + (engine.swarm && engine.swarm.uploaded ? engine.swarm.uploaded : 0)

            uploadedBook.add(engine.infoHash, lastUploaded)

            const iHash = engine.infoHash
            const appDataFastResume = path.join(fastResumeDir, iHash + '.fastresume')

            engine.softKill(() => {
                if (fs.existsSync(appDataFastResume)) {
                    checksum.file(appDataFastResume, function (err, sum) {
                       if (!err && sum) {
                           fastresumebook.add({ pid: iHash, sum })
                       }
                    })
                }
                cb()
            })

        }

        if (streams[ij].forceInterval) {
            clearInterval(streams[ij].forceInterval)
            delete streams[ij].forceInterval
        }

        delete streams[ij]

    }, () => {
        canceled[utime] = true
        cb()
    })
}

var torrentObj = (utime, torrent, engine) => {

    let obj = {
        opener: typeof torrent === 'string' ? torrent : '',
        utime: utime || 0,
        infoHash: engine.infoHash || false,
        name: engine.torrent && engine.torrent.name ? engine.torrent.name : engine.name ? engine.name : '',
        totalSize: engine.total && engine.total.length ? engine.total.length : engine.length ? engine.length : 0,
        path: engine.path || false
    }

    if (engine.swarm) {
        obj.downloaded = engine.swarm.downloaded || 0
        obj.downloadSpeed = engine.swarm.downloadSpeed || 0
        obj.uploaded = engine.swarm.uploaded || 0
        obj.uploadSpeed = engine.swarm.uploadSpeed || 0
        obj.uploadedStart = uploadedBook.get(engine.infoHash)
        obj.peers = engine.swarm.wires && engine.swarm.wires.length ? engine.swarm.wires.length : 0
    } else
        obj.downloaded = obj.downloadSpeed = obj.uploaded = obj.uploadSpeed = obj.uploadedStart = obj.peers = 0

    return obj

}

let checkConcurrency = () => {

    const maxConcurrency = config.get('maxConcurrency')

    const streamsSize = _.size(streams)

    if (streamsSize > maxConcurrency) {
        let killStreams = maxConcurrency - streamsSize
        _.some(streams, (el, ij) => {
            if (!killStreams) return true
            if (streams[ij] && streams[ij].engine) {
                let engine = streams[ij].engine
                var olderThenFourHours = (Date.now() - ij > 14400000)
                if (olderThenFourHours && engine && engine.swarm && engine.swarm.wires && engine.swarm.wires.length <= 1) {
                    cancelTorrent(ij, () => {}, null, true)
                    killStreams--
                }
            }
        })
    }

}

const initConcurrency = () => {

    const maxConcurrency = config.get('maxConcurrency')

    if (!maxConcurrency || maxConcurrency < 0) return

    const streamsSize = _.size(streams)

    if (streamsSize < maxConcurrency) {
        let startStreams = maxConcurrency - streamsSize

        const allTors = actions.getAll()
        const torsArr = []

        if (!_.size(allTors)) return

        _.each(allTors, (el, ij) => {
            torsArr.push(el)
        })

        const sortedArr = _.orderBy(torsArr, ['utime'], ['desc'])

        _.some(sortedArr, (el, ij) => {

            if (!startStreams) return true

            startStreams--

            actions.new(el.infoHash,

              torrentObj => { },

              (engine, organizedFiles) => { },

              (engine, organizedFiles) => { },

              (err) => { },

            true)
        })
    }
}

// make sure concurrency is kept every 30 minutes
let concurrencyInterval = setInterval(checkConcurrency, 1800000)

const actions = {

    closeAll: closeAll,

    isRedirectToMagnet,

    whenComplete: (engine, isMaster) => {

        if (isMaster) {
          const shouldNotify = config.get('torrentNotifs')

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

        if (config.get('downloadSubs') && config.get('subLangs') != 'all') {
          // schedule auto-downloading of subtitles
          actions.getAllVideos(engine.infoHash, files => {
            subAutoDownload({ torrentHash: engine.infoHash, files })
          })
        }

        // execute user set commands at end of download
        // (yes, not only in isMaster case)

        const userCommands = config.get('userCommands')

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

              const commandProc = childProcess.spawn(firstPart, currentCommand, {
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

          actions.getPath(engine.infoHash, (folderPath) => {
            runCommands(allCommands, folderPath)
          })

        }
    },

    speedUp: (torrentId) => {

        _.each(streams, (el, ij) => {
            if (ij != torrentId && streams[ij] && streams[ij].engine) {
                let engine = streams[ij].engine
                cancelTorrent(ij, () => {}, null, true)
            }
        })

    },

    deleteAllPaused: () => {
        let allTorrents = addresses.getAll(streams)

        _.each(allTorrents, (el, ij) => {
            if (!el.running) {
                completelyRemove(el.infoHash, null, () => {})
            }
        })
    },

    new: (torrent, idCb, readyCb, listeningCb, errCb, resume, isMaster) => {

        if (resume && torrent && torrent.length == 40) {
            // get opener from fs
            const appDataTorrentFilePath = path.join(openerDir, torrent + '.torrent')

            if (fs.existsSync(appDataTorrentFilePath)) {
                torrent = appDataTorrentFilePath
            } else {

                const appDataMagnetLink = path.join(openerDir, torrent + '.magnet')

                if (fs.existsSync(appDataMagnetLink)) {
                    torrent = fs.readFileSync(appDataMagnetLink)
                } else {
                    torrent = addresses.get(torrent).opener
                }

            }
        }

        basicTorrentData(torrent, (err, newOpener, torrentData) => {

            if (err) {
                errCb && errCb(err)
                return
            }

            if (newOpener)
                torrent = newOpener

            // save magnet opener
            const magnetPath = path.join(openerDir, torrentData.infoHash+'.magnet')

            if (!fs.existsSync(magnetPath)) {

                fs.writeFile(magnetPath, torrent, function(err) {
                    if (err) {
                        return console.log(err);
                    }
                })

            }

            const utime = Date.now()

            // keep these 2 as separate object responses because the object gets morphed in addresses.add()

            var added = addresses.add(torrentObj(utime, torrent, torrentData))

            // don't handle "torrent already added" as an error
            // just play the damned thing anyway as that's what users expect

//            if (!added && !resume) {
//                errCb(new Error('Torrent already exists'))
//                return
//            } else {
                const streamerId = actions.getTorrentId(torrentData.infoHash)
                if (streamerId !== false) {
                    const streamer = streams[streamerId]
                    idCb(torrentObj(streamerId, torrent, torrentData))
                    readyCb && readyCb(streamer.engine, streamer.organizedFiles)
                    listeningCb && listeningCb(streamer.engine, streamer.organizedFiles)
                    return
                } else {
                    idCb(torrentObj(utime, torrent, torrentData))
                }
//            }

            if (isMaster) {
              const shouldNotify = config.get('torrentNotifs')

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

            canceled[utime] = false
            streams[utime] = {}

            checkConcurrency()

            const remover = () => {
                delete canceled[utime]
                if (streams[utime]) {
                    if (streams[utime].forceInterval) {
                        clearInterval(streams[utime].forceInterval)
                        delete streams[utime].forceInterval
                    }
                    delete streams[utime]
                }
                completelyRemove(torrentData.infoHash, null, () => {})
            }

            const fail = (err) => {
                if (err && err.message)
                    errCb(err)
                else
                    errCb(new Error('Unknown error occured'))
            }

            const startTorrent = () => {
                createTorrent(torrent).then((result) => {

                    let worker = result.worker
                    let engine = result.engine

                    streams[utime].worker = worker

                    let filesOrganized = false
                    let delayListening = false

                    engine.on('listening', () => {

                        // save torrent file for this torrent
                        const torrentFilePath = path.join(tempDir, torrentData.infoHash + '.torrent')
                        const appDataTorrentFilePath = path.join(openerDir, torrentData.infoHash + '.torrent')

                        if (fs.existsSync(torrentFilePath) && !fs.existsSync(appDataTorrentFilePath)) {
                            fs.createReadStream(torrentFilePath).pipe(fs.createWriteStream(appDataTorrentFilePath))
                        }

                        isCanceled(utime, () => {
                            streams[utime].amListening = true
                            streams[utime].engine.streamPort = engine.server.address().port
                            if (!filesOrganized) {
                                delayListening = true
                            } else {
                                listeningCb && listeningCb(engine, streams[utime].organizedFiles)
                            }


                        }, () => {
                            remover()
                        })

                    })

                    // listen for complete event, but only if it did not complete in the past also
                    engine.on('complete', () => {
                        // complete actions should only be triggered once
                        if (!completedBook.get(engine.infoHash)) {
                            completedBook.add(engine.infoHash)
                            actions.whenComplete(engine, isMaster)
                        }
                    })

                    engine.on('ready', () => {
                        isCanceled(utime, () => {
                            delete canceled[utime]
                            let newAddress = torrentObj(utime, torrent, engine)
                            const address = addresses.get(newAddress.infoHash)
                            if (address) {
                                if (address.pulsing) {
                                    newAddress.pulsing = address.pulsing
                                    actions.setPulse(utime, address.pulsing)
                                }
                                if (address.forced) {
                                    newAddress.forced = address.forced
                                    actions.forceDownload(utime, address.forced)
                                }
                            } else {
                                if (config.get('speedLimit')) {
                                    newAddress.pulsing = config.get('speedLimit')
                                    actions.setPulse(utime, newAddress.pulsing)
                                }
                                if (config.get('forceDownload')) {
                                    newAddress.forced = config.get('forceDownload')
                                    actions.forceDownload(utime, newAddress.forced)
                                }
                            }
                            addresses.update(newAddress)
                            streams[utime].engine = engine
                            organizer(engine).then(files => {
                                filesOrganized = true
                                streams[utime].organizedFiles = files
                                readyCb && readyCb(engine, files)
                                if (delayListening) {
                                    listeningCb && listeningCb(engine, files)
                                }
                            }).catch(fail)
                        }, () => {
                            worker.peerSocket.emit('engineDestroy')
                            remover()
                        })
                    })
                }).catch(fail)
            }

            if (torrentData && torrentData.infoHash) {

                const iHash = torrentData.infoHash
                const appDataFastResume = path.join(fastResumeDir, iHash + '.fastresume')

                const removeFastResume = () => {
                    fs.unlink(appDataFastResume, () => {
                        startTorrent()
                    })
                }

                if (fs.existsSync(appDataFastResume)) {
                    checksum.file(appDataFastResume, function (err, sum) {
                       if (!err && sum) {
                           const fastBook = fastresumebook.get(iHash)

                           if (fastBook && fastBook.sum) {
                            if (fastBook.sum == sum) {
                                // checksum of fast resume file correct, continue
                                startTorrent()
                            } else {
                                // checksum incorrect, remove
                                removeFastResume()
                            }
                           } else {
                               // checksum incorrect, remove
                               removeFastResume()
                           }
                       } else {
                           // cannot get checksum of file, presume incorrect, remove
                           removeFastResume()
                       }
                    })
                } else {
                    startTorrent()
                }
            } else {
                startTorrent()
            }
        })
    },

    cancel: cancelTorrent,

    cancelByInfohash(infohash, cb, force, noDelete) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            cancelTorrent(streamerId, cb, force, noDelete)
        } else {
            if (config.get('removeLogic') == 1 || (!noDelete && force)) {
                completelyRemove(infohash, null, cb)
            } else {
                // do nothing
                cb()
            }
        }

    },

    startThen(infohash, cb) {

        loading[infohash] = true

        actions.new(infohash,

            torrentObj => { },

            (engine, organizedFiles) => { },

            (engine, organizedFiles) => {

                delete loading[infohash]

                cb(true, engine, organizedFiles)

            },

            (err) => {

                delete loading[infohash]

                cb(false)

            }, true)
    },

    getPortFor(infohash, forceStart, cb) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            cb(streams[streamerId].engine.streamPort)
        } else if (!forceStart) {
            cb(0)
        } else {

            actions.startThen(infohash, running => {
                if (!running) {
                    cb(0)
                    return
                }

                actions.getPortFor(infohash, false, cb)
            })

        }
    },

    isListening(utime) {
        return streams[utime].amListening || false
    },

    getEngine(utime) {
        return streams[utime] ? streams[utime].engine : false
    },

    getOrganizedFiles(utime) {
        return streams[utime] ? streams[utime].organizedFiles : false
    },

    getUtime(infoHash) {
        let foundUtime = false
        _.some(streams, (el, ij) => {
            if (el.engine && el.engine.infoHash == infoHash) {
                foundUtime = ij
                return true
            }
        })
        return foundUtime
    },

    getUpdate(utime) {
        if (utime) {
            if (streams[utime] && streams[utime].engine && streams[utime].engine.infoHash) {
                return addresses.get(streams[utime].engine.infoHash)
            } else {
                return false
            }
        } else {
            let results = []
            _.each(streams, el => {
                if (el && el.engine && el.engine.infoHash) {
                    results.push(el.engine.infoHash)
                }
            })
            return addresses.getList(results)
        }
    },

    setPulse(utime, pulse, cb) {
        engineExists(utime, engine => {
            if (!pulse) {
                engine.flood()
                let address = addresses.get(engine.infoHash)
                address.pulsing = false
                addresses.update(address)
            } else {
                actions.forceDownload(utime, false, () => {
                    engine.setPulse(pulse *1000)
                    let address = addresses.get(engine.infoHash)
                    address.pulsing = pulse
                    address.forced = false
                    addresses.update(address)
                })
            }
            cb && cb()
        })
    },

    isForced(utime, cb) {
        engineExists(utime, engine => {
            const address = addresses.get(engine.infoHash)
            cb(address && address.forced ? true : false)
        }, () => {
            cb(false)
        })
    },

    forceDownload(utime, should, cb) {
        engineExists(utime, engine => {
            if (should) {
                actions.setPulse(utime, false, () => {
                    engine.discover()
                    let address = addresses.get(engine.infoHash)
                    address.forced = true
                    address.pulsing = false
                    addresses.update(address)
                    const forceInterval = setInterval(() => {
                        engineExists(utime, engine => {
                            const progress = engine.torrent.pieces.downloaded / engine.torrent.pieces.length;
                            if (progress < 1)
                                engine.discover()
                            else {
                                clearInterval(forceInterval)
                                delete streams[utime].forceInterval
                            }
                            cb && cb()
                        }, () => {
                            clearInterval(forceInterval)
                            delete streams[utime].forceInterval
                            cb && cb()
                        })
                    }, 120000) // 2 minutes
                    streams[utime].forceInterval = forceInterval
                })
            } else {
                if (streams[utime].forceInterval) {
                    clearInterval(streams[utime].forceInterval)
                    delete streams[utime].forceInterval
                    let address = addresses.get(engine.infoHash)
                    address.forced = false
                    addresses.update(address)
                }
                cb && cb()
            }
        })
    },

    toggleStateFile(infohash, fileId) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            const streamer = streams[streamerId]
            const engine = streamer.engine
            if (engine.files && engine.files.length) {
                const file = streamer.engine.files[fileId]
                if (file) {
                    if (file.selected) {
                        engine.deselectFile(fileId)
                    } else {
                        engine.selectFile(fileId)
                    }
                }
            }
        }
    },

    createPlaylist(utime, files, token, fileId, cb, requestHost) {

        const useFilename = config.get('useFilenameStream')

        const engine = streams[utime].engine
        const enginePort = engine.streamPort || engine.server.port || engine.server.address().port

        let newM3U = "#EXTM3U";

        const altHost = 'http://' + ip() + ':' + enginePort

        files.ordered.some((file) => {
            if (fileId !== false) {
                if (file.id == fileId) {
                    const title = parser(file.name).name()
                    const uri = (requestHost || altHost) + '/api/' + token + '/' + engine.infoHash + '/' + (useFilename ? encodeURIComponent(file.name) : file.id)
                    newM3U += os.EOL+"#EXTINF:0,"+title+os.EOL+uri
                    return true
                }
            } else {
                const title = parser(file.name).name()
                const uri = (requestHost || altHost) + '/api/' + token + '/' + engine.infoHash + '/' + (useFilename ? encodeURIComponent(file.name) : file.id)
                newM3U += os.EOL+"#EXTINF:0,"+title+os.EOL+uri
            }
        })

        cb(newM3U)

    },

    getAll() {
        return addresses.getAll(streams)
    },

    haveTorrent(infoHash) {
        return addresses.get(infoHash)
    },

    torrentData(infohash, cb, defaultFiles) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            const streamer = streams[streamerId]
            const engine = streamer.engine
            const address = addresses.get(engine.infoHash)
            const isFinished = (engine.torrent.pieces.length == engine.torrent.pieces.downloaded)
            const orderedFiles = streamer.organizedFiles && streamer.organizedFiles.ordered ? streamer.organizedFiles.ordered : false
            cb({
                name: engine.torrent.name,
                infoHash: engine.infoHash,
                swarm: engine.swarm,
                total: engine.total,
                isFinished,
                opener: address.opener || '',
                uploadedStart: uploadedBook.get(engine.infoHash) || 0,
                files: defaultFiles ? engine.files : (orderedFiles || engine.files).map(el => {
                    const file = engine.files[el.id || el.fileID]
                    el.progress = isFinished ? 100 : Math.round(engine.torrent.pieces.bank.filePercent(file.offset, file.length) * 100)
                    if (el.progress > 100)
                        el.progress = 100
                    el.downloaded = isFinished ? file.length : readableSize(Math.round(file.length * el.progress))
                    el.selected = file.selected
                    return el
                }),
                path: defaultFiles ? engine.path : false
            }, defaultFiles ? engine.torrent.pieces.bank : null)
        } else if (!loading[infohash]) {
            actions.startThen(infohash, running => {
                if (!running) {
                    cb(false)
                    return
                }

                actions.torrentData(infohash, cb, defaultFiles)
            })
        } else
            cb(false)
    },

    getAllVideos(infohash, cb) {
        actions.getAllFilePaths(infohash, files => {
            if ((files || []).length)
                cb(files.filter(el => !!supported.is(el, 'video')))
            else
                cb([])
        })
    },

    getAllFilePaths(infohash, cb) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            const engine = streams[streamerId].engine
            const filePaths = []
            _.forEach(engine.files, (file) => {
                filePaths.push(path.join(engine.path, file.path))
            })
            cb(filePaths)
        } else {
            cb([])
        }
    },

    getFilePath(infohash, fileID, cb) {

        const streamerId = actions.getTorrentId(infohash)

        if (streamerId !== false) {
            const engine = streams[streamerId].engine
            let filePath = false
            _.some(engine.files, (file) => {
                if (file.fileID == fileID) {
                    filePath = path.join(engine.path, file.path)
                    return true
                }
            })
            cb(filePath)
        } else {
            cb(false)
        }
    },

    getPath(infohash, cb) {
        const address = addresses.get(infohash)
        if (address && address.path) {
            cb(address.path)
        } else {
            cb(false)
        }
    },

    getTorrentId(infohash) {
        let thisTorrentId = false

        _.some(streams, (el, ij) => {
            if (el.engine && el.engine.infoHash == infohash) {
                thisTorrentId = ij
                return true
            }
        })

        return thisTorrentId
    },

    toInfoHash(str, cb) {
        if (str) {

            if (isTorrentString.isInfoHash(str)) {

                cb(str)

            } else if (isTorrentString.isMagnetLink(str)) {

                const parsed = parseTorrent(str)

                if (parsed && parsed.infoHash) {
                    cb(parsedInfohash)
                } else {
                    cb(false)
                }

            } else if (isTorrentString.isTorrentPath(str)) {

                const parsed = parseTorrent(fs.readFileSync(str))

                if (parsed && parsed.infoHash) {
                    cb(parsed.infohash)
                } else {
                    cb(false)
                }

            }

        } else {
            cb(false)
        }
    }
}

initConcurrency()

module.exports = actions
