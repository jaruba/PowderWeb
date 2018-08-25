
const needle = require('needle')
const fs = require('fs')
const path = require('path')

const ffmpeg = require('easy-ffmpeg')

const http = require('http')
const pUrl = require('url')

const pump = require('pump')

const getPort = require('get-port')

const rangeParser = require('range-parser')

const rimraf = require('rimraf')

const acebook = require('./utils/acebook')

const _ = require('lodash')

const atob = require('./utils/atob')

let acestreamUsed = false

const streams = {}
const sockets = {}
const commands = {}
const servers = {}
const requests = {}
const lastTsFile = {}
const timerStart = {}
const timerGC = {}
const retries = {}
const timeouts = {}
let linuxProcess = null
let linuxPort = null

const cleanAceCache = () => {
	// This would of cleared old cache files from ace,
	// and it would of worked great if ace didn't lock it's cache files..
	// keeping it here ftm, maybe i'll get other ideas regarding it:

	// let cacheLoc

	// if (process.platform == 'darwin') {
	// 	cacheLoc = path.join(app.getPath("appData"), "PowderWeb", "acestream", "Contents/Resources/wineprefix/drive_c/_acestream_cache_")
	// } else if (process.platform = 'win32') {
	// 	cacheLoc = path.join((downloadLoc.split('\\')[0] || 'C:'), '_acestream_cache_')
	// }

	// if (cacheLoc && streams[pid] && streams[pid].infohash) {
	// 	// now clear ace cache too
	// 	fs.readdir(cacheLoc, (err, files) => {
	// 		if (!err && files && files.length) {
	// 			function indexFromFile(fl) {
	// 				let flIndex = -1

	// 				if (fl.startsWith('live.' + streams[pid].infohash + '.'))
	// 					flIndex = parseInt(fl.replace('live.' + streams[pid].infohash + '.', ''))
	// 				else if (fl.startsWith('hls.' + streams[pid].infohash + '.'))
	// 					flIndex = parseInt(fl.replace('hls.' + streams[pid].infohash + '.', ''))

	// 				return flIndex
	// 			}
	// 			let largestIndex = 0
	// 			files.forEach(file => {
	// 				const flIndex = indexFromFile(file)
	// 				if (flIndex > -1 && largestIndex < flIndex)
	// 					largestIndex = flIndex
	// 			})
	// 			if (largestIndex && largestIndex > 1) {
	// 				files.forEach(file => {
	// 					const flIndex = indexFromFile(file)
	// 					if (flIndex > -1 && flIndex < largestIndex -1) {
	// 						const rmFile = file
	// 						rimraf(path.join(cacheLoc, file), { maxBusyTries: 100 }, (err, data) => {
	// 							if (err && err.message)
	// 								console.log(err.message)
	// 							console.log('GC Removed Ace File: '+rmFile)
	// 						})
	// 					}
	// 				})
	// 			}
	// 		}
	// 	})
	// }
}

function transToFile(args, file, isHls, cb, pid) {

	var timestamp = new Date().getTime();
	var hlsFolder = 'hls-' + pid;

	try {
		fs.mkdirSync(path.join(TMP, hlsFolder));
	} catch(e) {}

	function log(msg) {
		console.log(msg)
	}

	var command = ffmpeg({ source: streams[pid].hlsLink || ace.streamLink(pid), timeout: false, logger: {debug: log, info: log, warn: log, error: log} });
	
	command.on('start', function(commandLine) {

//	   console.log('Spawned Ffmpeg with command: ', commandLine);
	   
	   cb && cb(null, path.join(TMP, hlsFolder));

	}).on('error', function(err) {
		if (err && err.msg) {
			if (err.msg.includes('Error opening filters!')) {
				// retry
				if (retries[pid] && retries[pid] > 0) {
					retries[pid]--
					// restart process without cb
					transToFile(args, file, isHls, null, pid)
				} else {
					console.log('Gave up Starting FFmpeg')
				}
			}
			console.log('Ffmpeg Error: '+err.message)
		}
//		cb(err.message);
	}).on('close', function(err,msg) {
		console.log('ffmpeg close')
		console.log(err)
		console.log(msg)
	}).on('exit', function(err, msg) {
		console.log('ffmpeg exit')
		console.log(err)
		console.log(msg)
	})
	.on('end', function(err, stdout, stderr) {
		console.log('Finished processing', err, stdout, stderr);
	})

	command.outputOptions(args);
	
	command.save(path.join(TMP, hlsFolder, 'out' + (isHls ? '.m3u8' : '')));
	
	commands[pid] = command
	
}

function hlsServer(filePath, cb, prebufTime, port, pid, ffmpegFlags, urlToTranscode) {
  const server = http.createServer();

  requests[pid] = {}

  const connections = {}

  server.on('connection', function(conn) {
    const key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn
    conn.on('close', function() {
      delete connections[key]
    })
  })

  server.destroy = function(cb) {
    server.close(cb)
    for (var key in connections)
      connections[key].destroy()
  }

  servers[pid] = server

  server.on('request', function (request, response) {

	var u = pUrl.parse(request.url);
    var file = path.join(filePath, u.pathname.substr(1));

    if (u.pathname.endsWith('.ts')) {
	    requests[pid][u.pathname.substr(1)] = Date.now()
	    lastTsFile[pid] = parseInt(u.pathname.substr(1).replace('out','').replace('.ts',''))
    }

//	console.log('http request: ', file);

    if (request.method === 'OPTIONS' && request.headers['access-control-request-headers']) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin)
      response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      response.setHeader(
          'Access-Control-Allow-Headers',
          request.headers['access-control-request-headers'])
      response.setHeader('Access-Control-Max-Age', '1728000')

      response.end()
      return
    }

    if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin)

    if (u.pathname === '/favicon.ico' || !fs.existsSync(file)) {
      response.statusCode = 404
      response.end()
      return
    }

    var range = request.headers.range
	var fileLength = fs.lstatSync(file).size;
    range = range && rangeParser(fileLength, range)[0]
    response.setHeader('Accept-Ranges', 'bytes')
	if (file.endsWith('.m3u8')) {
//		response.setHeader('Content-Type', 'application/x-mpegURL')
        response.setHeader('Content-Type', 'application/vnd.apple.mpegurl')
	} else {
	    response.setHeader('Content-Type', 'video/MP2T')
	}

    if (!range) {
      response.setHeader('Content-Length', fileLength)
      if (request.method === 'HEAD') return response.end()

      pump(fs.createReadStream(file), response);

      return
    }

    response.statusCode = 206
    response.setHeader('Content-Length', range.end - range.start + 1)
    response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fileLength)
    if (request.method === 'HEAD') return response.end()
	  
    pump(fs.createReadStream(file, range), response);
  })

  server.on('connection', function (socket) {
    socket.setTimeout(Number.MAX_SAFE_INTEGER)
  })
  
  server.on('listening', function () {

	var streamer = 'http://127.0.0.1:' + server.address().port + '/out.m3u8';

//	console.log('Streaming URL: ', streamer);

	let startTime = Date.now()

	var checkForFile = function() {
		delete timerStart[pid]
		fs.readdir(filePath, (err, files) => {
			if (err == null && files && files.length > 2) {
				if (timeouts[pid]) {
					clearTimeout(timeouts[pid])
					delete timeouts[pid]
				}
				cb(null, server, streamer)
			} else {
				timerStart[pid] = setTimeout(checkForFile, prebufTime || 2000)
			}
		})
	}

	timeouts[pid] = setTimeout(() => {
		delete timeouts[pid]
		if (streams[pid] && !streams[pid].transcodeLink) {
			streams[pid].status = 'Torrent failed to load in Web Player. Please try again later or try downloading the playlist.'
			ace.close(pid, () => {})
		}
	}, 300000) // 5 min timeout
	
	timerStart[pid] = setTimeout(checkForFile, prebufTime || 2000);

	var gc = function() {

		delete timerGC[pid]

		const lastTs = lastTsFile[pid]
		const lastTsFiles = ['out'+(lastTs-3)+'.ts', 'out'+(lastTs-2)+'.ts', 'out'+(lastTs-1)+'.ts', 'out'+lastTs+'.ts']
		if (requests[pid] && _.size(requests[pid]) > 20) {
			// garbace cleaning old ts files
			for (var key in requests[pid]) {
				if (lastTsFiles.indexOf(key) == -1) {
					const tsIndex = parseInt(key.replace('out', '').replace('.ts', ''))
					if (requests[pid][key] && requests[pid][key] < Date.now() - 180000) {
						if (tsIndex < lastTs) {
							// remove ts files that have not been requested in the last 3 min and are not the last 4 ts files requested
							const flPath = path.join(filePath, key)
							const rmKey = key
							rimraf(flPath, { maxBusyTries: 100 }, (err, data) => {
//								console.log('GC Removed HLS TS: '+rmKey)
								delete requests[pid][key]
							})
						}
					}
				}
			}
		}

		if (filePath) {
			// remove old, unrequested ts files too
			fs.readdir(filePath, (err, files) => {
				if (!err && files && files.length) {
					files.forEach(file => {
						if (file.endsWith('.ts')) {
							const tsIndex = parseInt(file.replace('out', '').replace('.ts', ''))
							if (!requests[pid][file] && tsIndex < lastTs - 10) {
								const flPath = path.join(filePath, file)
								const rmKey = file
								rimraf(flPath, { maxBusyTries: 100 }, (err, data) => {
//									console.log('GC Removed HLS TS: '+rmKey)
								})
							}
						}
					})
				}
			})
		}

//		cleanAceCache()

		timerGC[pid] = setTimeout(gc, 120000); // every 2 minutes
	}

	timerGC[pid] = setTimeout(gc, 120000); // every 2 minutes

  });

  console.log('starting hls server with port: ' + port);

  server.listen(port || null);
}

const connect = async (torrentHash, serverPort, peerflixProxy, reqToken, playlistCb, requestHost) => {

	acestreamUsed = true

	// for linux compatibility
	if (requestHost)
		requestHost = requestHost.replace('/localhost:', '/127.0.0.1:')

	if (streams[torrentHash] && streams[torrentHash].running) {
		// stream already running
		if (playlistCb) {

			// does not need transcoding

			let newM3U = "#EXTM3U";

			const altHost = 'http://127.0.0.1:' + peerflixProxy

			let uri

			if (!requestHost || requestHost.includes('/127.0.0.1:')) {
				// just use ace's link directly, it's better on linux for some reason
				uri = ace.streamLink(torrentHash)
			} else {
				uri = (requestHost || altHost) + '/ace/' + torrentHash + '/0?token=' + reqToken
			}

			newM3U += os.EOL+"#EXTINF:0,"+streams[torrentHash].name+os.EOL+uri

			playlistCb(newM3U)

		} else {
			// needs transcoding
			if (!streams[torrentHash].transcodeLink) {

				if (commands[torrentHash]) {
					commands[torrentHash].kill('SIGINT')
					delete commands[torrentHash]
				}

				if (timeouts[torrentHash]) {
					clearTimeout(timeouts[torrentHash])
					delete timeouts[torrentHash]
				}

				if (timerStart[torrentHash]) {
					clearTimeout(timerStart[torrentHash])
					delete timerStart[torrentHash]
				}

				if (servers[torrentHash]) {
					// stop transcoding server
					servers[torrentHash].destroy(() => {})
					delete servers[torrentHash]
				}

				// should start transcoding server
				let ffmpegFlags = [
					'-c:v', 'libx264', // libx264 || copy
					'-c:a', 'aac', // aac || copy
					'-strict', '-2',
					'-vbsf', 'h264_mp4toannexb',
					'-pix_fmt', 'yuv420p',
					'-copyts',
					'-mpegts_copyts', '1',
					'-preset', 'veryfast',
					'-hls_list_size', '0',
	//				"-hls_playlist_type", "vod",
				];

				getPort({ port: 12859 }).then((port) => {
					transToFile(ffmpegFlags, streams[torrentHash].directLink, true, function(err, filePath) {
						hlsServer(filePath, function(err, server, url) {
//							console.log('http://127.0.0.1:3000/embed?url='+encodeURIComponent(url))
							streams[torrentHash].transcodeLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/ace-hls/' + streams[torrentHash].pid + '/' + reqToken + '/out.m3u8'
							acebook.add(streams[torrentHash])
						}, 2000, port, streams[torrentHash].pid, ffmpegFlags, streams[torrentHash].directLink);
					}, streams[torrentHash].pid)
				})
			} else {
				// do nothing, handled on UI side
			}
		}
		return
	}
	retries[torrentHash] = 3
	streams[torrentHash] = {
		utime: Date.now(),
		pid: torrentHash,
		status: 'Starting Download',
		running: true,
		isLive: true,
	}

		console.log('ace version: ', aceVersion)

		const productKey = atob('bjUxTHZRb1RsSnpOR2FGeHNlUkstdXZudlgtc0Q0Vm01QXh3bWM0VWNvRC1qcnV4bUtzdUphSDBlVmdF')

		const net = require('net');

		const sha1 = require('sha1')

		// create a Socket connection
		const socket = net.createConnection(serverPort, '127.0.0.1', function() {

			sockets[torrentHash] = socket

			socket.on('close', function() {
				console.log('telnet close')
			})

			const messageCb = function(msg) {
//				console.log(msg)
				streams[torrentHash].status = msg
			}

			let ready = false
			let lastPrebuf = -1
			let lastBuf = -1

// for debuging:

//			socket.writeTo = socket.write

//			socket.write = function(msg) {
//				console.log('SEND', msg)
//				socket.writeTo(msg)
//			}

			const handleLiveSeek = (line) => {

				if (line.startsWith("EVENT livepos")) {
					ready = true

					const lastTime = parseInt(line.split(" ")[2].split("=")[1])
					const firstTime = parseInt(line.split(" ")[3].split("=")[1])

					if (firstTime) {
						socket.write("LIVESEEK " + firstTime + "\r\n")
					} else {
						const toTime = lastTime < 1500 ? lastTime : lastTime - 1500
						socket.write("LIVESEEK " + toTime + "\r\n")
					}

					return
				}

			}

			socket.on("data", (buffer) => {

				const tData = buffer.toString("utf8")

				let dataLines = []

				if (tData.includes('\r\n')) {
					dataLines = tData.split('\r\n')
				}

				if (!ready && !tData.startsWith('EVENT') && (dataLines && dataLines.length > 1 && dataLines[1].startsWith('EVENT'))) {
					handleLiveSeek(dataLines[1])
				}

//				console.log("PRINT", tData)

				if (tData.startsWith("START")) {
					const startLink = tData.split(" ")[1]
					if (ready || (!ready && startLink.includes('/hls/'))) {
						ready = true
//						const streamLink = tData.split(" ")[1]
						const streamLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/ace/' + streams[torrentHash].pid + '/0?token=' + reqToken
						streams[torrentHash].directLink = streamLink
						if (startLink.includes('/hls/')) {
							streams[torrentHash].hlsLink = startLink
						}

						acebook.add(streams[torrentHash])

						if (playlistCb) {

							let newM3U = "#EXTM3U";

							const altHost = 'http://127.0.0.1:' + peerflixProxy

							let uri

							if (!requestHost || requestHost.includes('/127.0.0.1:')) {
								// just use ace's link directly, it's better on linux for some reason
								uri = ace.streamLink(torrentHash)
							} else {
								uri = (requestHost || altHost) + '/ace/' + torrentHash + '/0?token=' + reqToken
							}

							newM3U += os.EOL+"#EXTINF:0,"+streams[torrentHash].name+os.EOL+uri

							playlistCb(newM3U)


							return
						}

						let ffmpegFlags = [
							'-c:v', 'libx264', // libx264 || copy
							'-c:a', 'aac', // aac || copy
							'-strict', '-2',
							'-vbsf', 'h264_mp4toannexb',
							'-pix_fmt', 'yuv420p',
							'-copyts',
							'-mpegts_copyts', '1',
							'-preset', 'veryfast',
							'-hls_list_size', '0',
			//				"-hls_playlist_type", "vod",
						];

						getPort({ port: 12859 }).then((port) => {
							transToFile(ffmpegFlags, streamLink, true, function(err, filePath) {
								hlsServer(filePath, function(err, server, url) {
//									console.log('http://127.0.0.1:3000/embed?url='+encodeURIComponent(url))
									streams[torrentHash].transcodeLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/ace-hls/' + streams[torrentHash].pid + '/' + reqToken + '/out.m3u8'
									acebook.add(streams[torrentHash])
								}, 2000, port, streams[torrentHash].pid, ffmpegFlags, streamLink);
							}, streams[torrentHash].pid)
						})

						return
					}
				} else {
					if (tData.startsWith("RESUME")) {
						// ????????
						return
					}
					if (tData.startsWith("STATUS")) {
						if (tData.startsWith("STATUS main:err;")) {
							const data = tData.split(" ").slice(1).join(" ").split(";")[2]
							console.warn("[acestream-api] Error:", data)
							messageCb('Error: ' + data)
							return
						}
						if (tData.startsWith("STATUS main:prebuf;")) {
							const percent = tData.split(";")[1]
							if (percent != lastPrebuf) {
								lastPrebuf = percent
								messageCb('Prebuffering ' + percent + '%')
							}
							return
						}
						if (tData.startsWith("STATUS main:seekprebuf;")) {
							const percent = tData.split(";")[1]
							if (percent != lastBuf) {
								lastBuf = percent
								messageCb('Buffering ' + percent + '%')
							}
							return
						}
						if (tData.startsWith("STATUS main:buf;")) {
							const percent = tData.split(";")[1]
							if (percent != lastBuf) {
								lastBuf = percent
								messageCb('Buffering ' + percent + '%')
							}
							return
						}
						if (tData.startsWith("STATUS main:dl;")) {
							// ????????
							return
						}
					} else {
						if (tData.startsWith("EVENT")) {
							if (!ready) {
								handleLiveSeek(tData)
							}
						} else {
							if (tData.startsWith("INFO")) {
								if (tData.startsWith("INFO 1")) {
									const data = tData.split(" ").slice(1).join(" ").split(";")[1]
									messageCb('Error: ' + data)
									return
								}
							} else {
								if (tData.startsWith("##")) {
									const infoData = tData.substring(2)
									const infoDataParsed = JSON.parse(infoData)
									streams[torrentHash].infohash = infoDataParsed.infohash
									const videoTitle = decodeURIComponent(infoDataParsed.files[0][0])
									streams[torrentHash].name = videoTitle
									acebook.add(streams[torrentHash])
									return
								}
							}
						}
					}
				}
			})

			const handshake = {}

			const readStream = (buffer) => {
				const telnetData = buffer.toString("utf8")

				const dataParts = telnetData.split(' ')

				if (dataParts && dataParts[0] == 'START') {
					if (dataParts[1].startsWith('http://')) {
						socket.removeListener("data", readStream)
					}
				}
			}

			const readAuth = (buffer) => {
				const telnetData = buffer.toString("utf8")
				socket.removeListener("data", readAuth)
				socket.on("data", readStream)
				socket.write('USERDATA [{"gender": "1"}, {"age": "3"}]\r\n')
				socket.write('LOAD PID ' + torrentHash + '\r\n')
//				socket.write('START PID ' + torrentHash + ' 0\r\n')
				socket.write('START PID ' + torrentHash + ' 0 output_format=http transcode_audio=0 transcode_mp3=0 transcode_ac3=0\r\n');
			}

			// if we get any data, display it to stdout
			const readHandshake = (buffer) => {
				socket.removeListener("data", readHandshake)

				const telnetData = buffer.toString("utf8")

				const dataParts = telnetData.split(' ')

				dataParts.forEach((dataPart) => {
					if (dataPart.includes('=')) {
						const smallParts = dataPart.split('=')
						handshake[smallParts[0]] = smallParts[1].replace('\r\n', '')
					}
				})

				if (handshake.key) {
					handshake.signature = sha1(handshake.key + productKey)
					handshake.responseKey = productKey.split('-')[0] + '-' + handshake.signature
					socket.on('data', readAuth)
					socket.write('READY key=' + handshake.responseKey + '\r\n')
				}

			}

			socket.on('data', readHandshake)

			socket.write('HELLOBG version=3\r\n')

		})

}

const getStream = async () => {

}

let aceVersion

const { app } = require('electron')
const os = require('os')
const TMP = os.tmpDir()

const child = require('child_process')

const exec = child.exec
const spawn = child.spawn

const downloadLoc = path.join(app.getPath('appData'), 'PowderWeb')

const ace = {
	getStream,
	connect,
	close: (pid, cb) => {
		if (timeouts[pid]) {
			clearTimeout(timeouts[pid])
			delete timeouts[pid]
		}
		if (timerStart[pid]) {
			clearTimeout(timerStart[pid])
			delete timerStart[pid]
		}
		if (timerGC[pid]) {
			clearTimeout(timerGC[pid])
			delete timerGC[pid]
		}
		function afterSocketClose() {

			function stopStream() {
				if (streams[pid] && streams[pid].infohash) {
					// delete torrent cache files
					let cacheLoc

					if (process.platform == 'darwin') {
						cacheLoc = path.join(app.getPath("appData"), "PowderWeb", "acestream", "Contents/Resources/wineprefix/drive_c/_acestream_cache_")
					} else if (process.platform = 'win32') {
						cacheLoc = path.join((downloadLoc.split('\\')[0] || 'C:'), '_acestream_cache_')
					}

					if (cacheLoc) {
						rimraf(path.join(cacheLoc, 'live.'+streams[pid].infohash+'.*'), { maxBusyTries: 100 }, (err, data) => {
							rimraf(path.join(cacheLoc, 'hls.'+streams[pid].infohash+'.*'), { maxBusyTries: 100 }, (err, data) => {
								cb()
							})
						})
					} else {
						cb()
					}
				} else {
					cb()
				}
				if (streams[pid]) {
					delete streams[pid].directLink
					delete streams[pid].transcodeLink
					streams[pid].status = 'Could not load torrent. Please try again later.'
					streams[pid].running = false
					acebook.add(streams[pid])
				}
			}

			if (sockets[pid]) {
				// delete socket
				delete sockets[pid]
			}
			if (commands[pid]) {
				// stop transcoding process
				commands[pid].kill('SIGINT')
				delete commands[pid]
			}
			if (servers[pid]) {
				// stop transcoding server
				servers[pid].destroy(function() {
					delete servers[pid]
					// delete the temporary transcoding server files
					rimraf(path.join(TMP, 'hls-' + pid), { maxBusyTries: 100 }, (err, data) => { stopStream() })
				})
			} else {
				stopStream()
			}
		}

		if (sockets[pid] && sockets[pid].write) {
			// stop torrent
			sockets[pid].on('close', function() {
				afterSocketClose()
			})
			sockets[pid].write('STOP\r\n')
			sockets[pid].write('SHUTDOWN\r\n')
		} else {
			afterSocketClose()
		}
	},
	destroy: (pid, cb) => {
		if (streams[pid] && streams[pid].running) {
			ace.close(pid, () => {
				acebook.remove(pid)
			})
		} else {
			acebook.remove(pid)
		}
	},
	clearCache: (cb) => {

		let cacheLoc

		if (process.platform == 'darwin') {
			cacheLoc = path.join(app.getPath("appData"), "PowderWeb", "acestream", "Contents/Resources/wineprefix/drive_c/_acestream_cache_")
		} else if (process.platform = 'win32') {
			cacheLoc = path.join((downloadLoc.split('\\')[0] || 'C:'), '_acestream_cache_')
		}

		if (!cacheLoc)
			return cb()

		rimraf(path.join(cacheLoc, "live.*"), { maxBusyTries: 100 }, (err, data) => {
			rimraf(path.join(cacheLoc, "hls.*"), { maxBusyTries: 100 }, (err, data) => {
				rimraf(path.join(TMP, "hls-*"), { maxBusyTries: 100 }, (err, data) => {
					cb()
				})
			})
		})
	},
	streamLink: (pid) => {
		return 'http://127.0.0.1:6878/ace/getstream?id=' + pid
	},
	hlsPort: (pid) => {
		return servers[pid] && servers[pid].address ? servers[pid].address().port : false
	},
	getVersion: (cb) => {
		// check if we can connect to the server
		const aceLink = 'http://127.0.0.1:6878/webui/api/service?method=get_version&format=json'

		needle.get(aceLink, (error, resp, body) => {

			if (error)
				return cb(false)

			if (body && body.result && body.result.version) {
				aceVersion = parseInt(body.result.version.split('.').join(''))
				aceVersion = parseInt((aceVersion+'').substr(0, 3))
				cb(true)
			} else {
				cb(false)
			}

		})
	},
	version: () => {
		return aceVersion
	},
	getPort: (cb) => {

		if (process.platform == 'linux') {
			if (linuxProcess && linuxPort)
				return cb(linuxPort)
			return cb(false)
		}


		let portLocs

		if (process.platform == 'darwin') {
			const locOnDrive = 'drive_c/users/boone/Application Data/ACEStream/engine/acestream.port'

			portLocs = [path.join(downloadLoc, 'acestream/Contents/Resources/wineprefix', locOnDrive)]

			const isDirectory = source => fs.lstatSync(source).isDirectory()
			const getDirectories = source => fs.readdirSync(source)

			getDirectories(app.getPath('appData')).forEach((dirNm) => {
				if (dirNm.startsWith('com.aceengine.pow-'))
					portLocs.push(path.join(app.getPath('appData'), dirNm, locOnDrive))
			})
		} else if (process.platform == 'win32') {
			portLocs = [path.join(downloadLoc, 'acestream\\engine\\acestream.port')]
		}

		if (!portLocs || !portLocs.length)
			cb(false)

		const checkFolder = (i) => {
			if (!portLocs[i]) {
				cb(false)
				return
			}
			fs.exists(portLocs[i], (exists) => {
				if (!exists) {
					checkFolder(i+1)
				} else {
					fs.readFile(portLocs[i], 'utf8', (err, data) => {
						if (err || !data) {
							checkFolder(i+1)
							return
						}
						cb(data)
					})
				}
			})
		}

		checkFolder(0)

	},
	deletePortFile: (cb) => {
		let portLocs

		if (process.platform == 'darwin') {
			const locOnDrive = 'drive_c/users/boone/Application Data/ACEStream/engine/acestream.port'
			portLocs = [path.join(downloadLoc, 'acestream/Contents/Resources/wineprefix', locOnDrive)]

			const isDirectory = source => fs.lstatSync(source).isDirectory()
			const getDirectories = source => fs.readdirSync(source)

			getDirectories(app.getPath('appData')).forEach((dirNm) => {
				if (dirNm.startsWith('com.aceengine.pow-'))
					portLocs.push(path.join(app.getPath('appData'), dirNm, locOnDrive))
			})
		} else if (process.platform == 'win32') {
			portLocs = [path.join(downloadLoc, 'acestream\\engine\\acestream.port')]
		}

		if (!portLocs || !portLocs.length)
			cb()

		const checkFolder = (i) => {
			if (!portLocs[i]) {
				cb()
				return
			}
			fs.exists(portLocs[i], (exists) => {
				if (!exists) {
					checkFolder(i+1)
				} else {
					rimraf(portLocs[i], { maxBusyTries: 20 }, (err, data) => {
						checkFolder(i+1)
					})
				}
			})
		}

		checkFolder(0)
	},
	streamObj: (pid) => {
		return streams[pid] || false
	},
	isDownloaded: (cb) => {

		let binaryLoc

		if (process.platform == 'darwin') {
			binaryLoc = path.join(downloadLoc, 'acestream/Contents/MacOS/startwine')
		} else if (process.platform == 'win32') {
			binaryLoc = path.join(downloadLoc, 'acestream\\engine\\ace_engine.exe')
		} else if (process.platform == 'linux') {
			binaryLoc = '/snap/acestreamplayer'
		}

		if (!binaryLoc)
			return cb(false)

		fs.access(binaryLoc, (err) => {
		  if (!err) {
		    cb(true)
		    return;
		  }
		  cb(false)
		})

	},
	binary: {
		run: (cb) => {

			ace.binary.kill(() => {
				ace.deletePortFile(() => {
					let binaryLoc

					if (process.platform == 'darwin') {
						binaryLoc = path.join(downloadLoc, 'acestream/Contents/MacOS/startwine')
					} else if (process.platform == 'win32') {
						binaryLoc = path.join(downloadLoc, 'acestream\\engine\\ace_engine.exe')
					} else if (process.platform == 'linux') {
						binaryLoc = 'acestreamplayer.engine'
					}

					if (!binaryLoc)
						return cb()

					let aceProcess

					if (process.platform == 'linux') {
						aceProcess = spawn(binaryLoc, ['--client-console'])
						linuxProcess = true
						linuxPort = false
					} else {
//						console.log('SPAWNING: ' + binaryLoc)
						aceProcess = spawn(binaryLoc)
					}

					aceProcess.stdout.on("data", data => {
						const dt = data.toString()
	//					console.log("[ace out]", dt);
						if (process.platform == 'linux' && dt.includes('ready to receive remote commands on ')) {
							linuxPort = parseInt(dt.split('ready to receive remote commands on ')[1])
							cb(true)
						}
					})

					let noError = true

					if (process.platform != 'linux') {
						const startRunTime = Date.now()
						const findAcePort = () => {
							if (noError) {
								ace.getPort((acePort) => {
									if (!acePort) {
										if (Date.now() - startRunTime > 180000) {
											cb(false) // 3 min timeout
										} else {
											setTimeout(findAcePort, 2000)
										}
									} else {
										cb(true)
									}
								})
							}
						}
						setTimeout(findAcePort, 3000)
					}


					aceProcess.stderr.on("data", data => {
						console.log("[ace msg]", data.toString())
						if ("darwin" === process.platform && data.toString().includes("fixme:msvcrt:__clean_type_info_names_internal")) {
							console.warn('[ace bug] fixme:msvcrt:__clean_type_info_names_internal')
						}
					})

					const startTime = Date.now()

					aceProcess.on("close", (code, signal) => {

						console.warn("[ace close]", code, signal)

						aceProcess = null

						if (process.platform == 'linux') {
							linuxProcess = false
							linuxPort = false
						} else if (process.platform === "darwin" && code === 0 && Date.now() - startTime < 15000) {
							console.warn("[ace restart]")
							ace.binary.run(cb)
						} else if (process.platform != 'linux') {
							cb(false, code)
						}

					})

					aceProcess.on("exit", (code, signal) => {
						console.warn("[ace exit]", code, signal)
						noError = false
					})

					aceProcess.on("error", err => {
					  console.warn("[ace error]", err);
					})
				})
			}, (killErr) => { console.log('Kill Ace Error: ' + killErr) })
		},

		kill: (cb, errorCb) => {
			if (!acestreamUsed && process.platfrom != 'darwin') {
				cb()
				return
			}
			if (process.platform == 'darwin') {
				exec('kill $(ps aux | grep -E "PowderWeb/acestream" | grep -v grep | awk \'{print $2}\')', () => {
					exec('kill $(ps aux | grep -E "'+atob("U29kYSBQbGF5ZXI=")+'/acestream" | grep -v grep | awk \'{print $2}\')', () => {
						setTimeout(cb, 100)
					})
				})
			} else if (process.platform == 'win32') {
				exec('tasklist', (body, data, err) => {
					if (body || err) {
						errorCb(err.message || err)
					} else if (/ace_engine\.exe/.test(data)) {
						console.warn('[ace running] killing it')
						exec('taskkill /IM ace_engine.exe /F', (err, stdout, stderr) => {
							if (err || stderr) {
								console.warn('[ace err] can\'t kill process', err, stderr)
								errorCb('can\'t kill process')
							} else {
								console.log('[ace] killed process')
								setTimeout(cb, 100)
							}
						})
					} else {
						cb()
					}
				})
			} else if (process.platform == 'linux') {
				exec('killall -9 acestreamengine', () => {
					setTimeout(cb, 100)
				})
			}
		},

		extract: (fromPath, toPath, cb, errorCb) => {

			const unzipper = new (require('decompress-zip'))(fromPath)

			unzipper.on('error', function(err) {
				console.warn(err)
				errorCb('Couldn\'t Decompress Archive')
			})

			unzipper.on('extract', cb)

			unzipper.extract({
				path: toPath
			})

		},

		download: (downloading, extracting, cb, errorCb) => {

			const fileLink = 'https://powder.media/ace/' + process.platform + '/acestream.zip'

			const tempFile = path.join(TMP, 'acestream.zip')
			const fileStream = fs.createWriteStream(tempFile)

			require('simple-get')(fileLink, (err, p) => {

				let retain
				let lowestDelta

				if (err) {

					errorCb(err.message || err)

				} else {

					lowDelta = p.headers['content-length']
					retain = 0
					let percent = 0

					p.on('data', (pack) => {
						const lastPercent = percent
						retain = retain + pack.length
						percent = Math.round(100 * retain / lowDelta)
						if (percent !== lastPercent)
							downloading(percent)
					})

					fileStream.on('finish', () => {
						fileStream.close(() => {
							extracting()
							ace.binary.extract(tempFile, downloadLoc, cb, errorCb)
						})
					})

					p.pipe(fileStream)
				}
			})
		}
	}
}

ace.clearCache(() => {})

module.exports = ace
