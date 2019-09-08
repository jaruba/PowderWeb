
const needle = require('needle')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')

const rimraf = require('rimraf')

const acebook = require('./utils/acebook')
const acenamebook = require('./utils/acenamebook')

const atob = require('./utils/atob')

const downloader = require('./utils/downloadPackage')

const hlsLink = require('./utils/live-trans')

// general timeout of 2 mins
const mins2 = 2 * 60 * 1000

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

let triedHack = false

const connect = async (torrentHash, serverPort, peerflixProxy, reqToken, playlistCb, requestHost) => {

	acestreamUsed = true

	if (playlistCb)
		playlistCb = _.once(playlistCb)

	// for linux compatibility
	if (requestHost)
		requestHost = requestHost.replace('/localhost:', '/127.0.0.1:')

	if (streams[torrentHash] && streams[torrentHash].running) {
		// stream already running
		if (playlistCb) {

			// does not need transcoding

			let newM3U = "#EXTM3U"

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

				hlsLink.start(torrentHash, (streams[torrentHash].hlsLink || ace.streamLink(torrentHash)), (err, server, url) => {
//					console.log('http://127.0.0.1:3000/embed?url='+encodeURIComponent(url))
					streams[torrentHash].transcodeLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/hls/' + streams[torrentHash].pid + '/' + reqToken + '/out.m3u8'
					acebook.add(streams[torrentHash])
				}, (err) => {
					streams[torrentHash].status = err || 'Unknown Error'
					acebook.add(streams[torrentHash])
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

		const net = require('net')

		const sha1 = require('sha1')

		// create a Socket connection
		const socket = net.createConnection(serverPort, '127.0.0.1', function() {

			sockets[torrentHash] = socket

			socket.on('close', function() {
				console.log('telnet close')
			})

			const messageCb = function(msg) {
				streams[torrentHash].status = msg
				if (playlistCb && msg.toLowerCase().includes('error:')) {
					// just end the playlist request in case of errors
					stopTimeOut()
					closeAce(msg)
				}
			}

			let ready = false
			let lastPrebuf = -1
			let lastBuf = -1

			let closeAce = msg => {
				if (playlistCb)
					playlistCb(false, msg || 'Unknown Error')
				ace.close(torrentHash, () => {})
			}

			closeAce = _.once(closeAce)

			let timedOutTimer = setTimeout(() => {
				closeAce('Timed out')
			}, mins2)

			function stopTimeOut() {
				if (timedOutTimer) {
					clearTimeout(timedOutTimer)
					timedOutTimer = false
				}
			}

// for debuging:

//			socket.writeTo = socket.write

//			socket.write = function(msg) {
//				console.log('SEND', msg)
//				socket.writeTo(msg)
//			}

			const handleLiveSeek = (line) => {

				if (line.startsWith("EVENT livepos")) {
					ready = true
					stopTimeOut()

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
					if (ready || (!ready && (startLink.includes('/hls/') || startLink.includes('/content/')))) {
						ready = true
						stopTimeOut()
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

						hlsLink.start(torrentHash, (streams[torrentHash].hlsLink || ace.streamLink(torrentHash)), (err, server, url) => {
		//					console.log('http://127.0.0.1:3000/embed?url='+encodeURIComponent(url))
							streams[torrentHash].transcodeLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/hls/' + streams[torrentHash].pid + '/' + reqToken + '/out.m3u8'
							acebook.add(streams[torrentHash])
						}, (err) => {
							streams[torrentHash].status = err || 'Unknown Error'
							acebook.add(streams[torrentHash])
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
									streams[torrentHash].name = acenamebook.get(torrentHash) || videoTitle
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

let aceVersion

const { app } = require('electron')
const os = require('os')
const TMP = os.tmpDir()

const child = require('child_process')

const exec = child.exec
const spawn = child.spawn

const downloadLoc = path.join(app.getPath('appData'), 'PowderWeb')

const ace = {
	rename: (pid, name) => {
		if (streams[pid]) {
			streams[pid].name = name
			acebook.add(streams[pid])
		} else {
			const streamObj = acebook.get(pid)
			streamObj.name = name
			acebook.add(streamObj)
		}
		acenamebook.add(pid, name)
	},
	connect,
	close: (pid, cb) => {
		hlsLink.destroy(pid, () => {
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

				stopStream()
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
		})
	},
	destroy: (pid, cb) => {
		if (streams[pid] && streams[pid].running) {
			ace.close(pid, () => {
				acebook.remove(pid)
				acenamebook.remove(pid)
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
				if (dirNm.startsWith('com.aceengine.powder'))
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
				if (dirNm.startsWith('com.aceengine.powder'))
					portLocs.push(path.join(app.getPath('appData'), dirNm, locOnDrive))
			})
		} else if (process.platform == 'win32') {
			portLocs = [path.join(downloadLoc, 'acestream\\engine\\acestream.port')]
		}

		if (!portLocs || !portLocs.length)
			cb()

		const checkFolder = (i) => {
			if (!portLocs || !portLocs[i]) {
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
		run: (cb, totalTime) => {

			cb = _.once(cb)

			if (totalTime > mins2) {
				// timed out
				cb(false)
				return
			}

			const afterKill = () => {
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

				let findAcePortTimer

				if (process.platform != 'linux') {
					const startRunTime = Date.now()
					const findAcePort = () => {
						if (noError) {
							ace.getPort((acePort) => {
								if (!acePort) {
									if (Date.now() - startRunTime > 180000) {
										cb(false) // 3 min timeout
									} else {
										findAcePortTimer = setTimeout(findAcePort, 2000)
									}
								} else {
									cb(true)
								}
							})
						}
					}
					findAcePortTimer = setTimeout(findAcePort, 3000)
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

					if (findAcePortTimer)
						clearTimeout(findAcePortTimer)

					aceProcess = null

					if (process.platform == 'linux') {
						linuxProcess = false
						linuxPort = false
					} else if (process.platform === "darwin" && code === 0 && Date.now() - startTime < 15000) {
						console.warn("[ace restart]")
						ace.binary.run(cb, (totalTime || 0) + startTime)
					} else if (process.platform != 'linux') {
						if (process.platform === "darwin" && code === 2 && !triedHack) {
							triedHack = true
							const wineLoc = path.join(downloadLoc, 'acestream/Contents/MacOS/startwine')
							fs.readFile(wineLoc, (err, data) => {
							  if (err || !data) {
							  	cb(false, code)
							  } else {
							  	const wineLines = data.split('\n')

							  	wineLines.splice(2, 0, '#')

							  	fs.writeFile(wineLoc, wineLines.join('\n'), (err) => {
									if (err) {
										cb(false, code)
									} else {
										const plistLoc = path.join(downloadLoc, 'acestream/Contents/Info.plist')
										fs.readFile(plistLoc, (err, data) => {
										  if (err || !data) {
										  	cb(false, code)
										  } else {
										  	const lines = data.split('\n')
										  	const randomNumber = Math.floor(Math.random() * 100)
										  	lines.forEach((line, ij) => {
										  		if (line.includes('com.aceengine.powderweb_dep')) {
										  			lines[ij] = '    <string>com.aceengine.powderweb_dep'+randomNumber+'</string>'
										  		} else if (line.includes('aceenginepowderweb')) {
										  			lines[ij] = '    <string>aceenginepowderweb'+randomNumber+'</string>'
										  		}
										  	})

										  	fs.writeFile(plistLoc, lines.join('\n'), (err) => {
												if (err) {
													cb(false, code)
												} else {
													triedHack = true
													ace.binary.run(cb, (totalTime || 0) + startTime)
												}
											})
										  }
										})
									}
								})
							  }
							})
						} else {
							cb(false, code)
						}
					}

				})

				aceProcess.on("exit", (code, signal) => {
					console.warn("[ace exit]", code, signal)
					noError = false
				})

				aceProcess.on("error", err => {
				  console.warn("[ace error]", err);
				})
			}

			if (!acestreamUsed) {
				// kill acestream only if it's being ran by a different process
				ace.binary.kill(() => {
					ace.deletePortFile(() => {
						afterKill()
					})
				}, (killErr) => { console.log('Kill Ace Error: ' + killErr) })
			}
		},

		kill: (cb, errorCb) => {
//			if (!acestreamUsed && process.platfrom != 'darwin') {
//				cb()
//				return
//			}
			if (process.platform == 'darwin') {
				exec('kill $(ps aux | grep -E "PowderWeb/acestream" | grep -v grep | awk \'{print $2}\')', () => {
					exec('kill $(ps aux | grep -E "'+atob("U29kYSBQbGF5ZXI=")+'/acestream" | grep -v grep | awk \'{print $2}\')', () => {
						setTimeout(cb, 100)
					})
				})
			} else if (process.platform == 'win32') {
				exec('tasklist', (err, data, stderr) => {
					if (!err && !stderr && /ace_engine\.exe/.test(data)) {
						console.warn('[ace running] killing it')
						exec('taskkill /IM ace_engine.exe /F', (err, stdout, stderr) => {
							if (err || stderr) {
								console.warn('[ace err] can\'t kill process', err, stderr)
							} else {
								console.log('[ace] killed process')
							}
							setTimeout(cb, 100)
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

		download: (downloading, extracting, cb, errorCb) => {

			const fileLink = 'https://powder.media/ace/' + process.platform + '/acestream.zip'

			const tempFile = path.join(TMP, 'acestream.zip')

			downloader.download(fileLink, tempFile, downloading, extracting, cb, errorCb)

		}
	}
}

ace.clearCache(() => {})

module.exports = ace
