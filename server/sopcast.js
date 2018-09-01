
const fs = require('fs')
const path = require('path')
const { app } = require('electron')
const os = require('os')
const TMP = os.tmpDir()

const child = require('child_process')

const spawn = child.spawn
const exec = child.exec

const getPort = require('get-port')

const downloader = require('./utils/downloadPackage')

const downloadLoc = path.join(app.getPath('appData'), 'PowderWeb')

const net = require('net')

const needle = require('needle')

const _ = require('lodash')

const sopbook = require('./utils/sopbook')

const hlsLink = require('./utils/live-trans')

const streams = {}

const Registry = require('winreg')

const winHide = require('window-prebuilt')

const chooseBinary = (cb) => {

	let binaryLoc

	if (process.platform == 'darwin') {
		binaryLoc = path.join(downloadLoc, 'SopCast.app/Contents/Resources/binaries/m32/sp-sc-auth')
		cb(binaryLoc)
	} else if (process.platform == 'win32') {
		const getReg = (regTarget, cb) => {
			let regKey = new Registry({
				hive: Registry.HKLM,
				key: regTarget
			})

			regKey.values(function (err, items) {
				if (regTarget.endsWith('\\Uninstall\\SopCast')) {
					if (err || !items || !items[0]) {
						cb(false)
					} else {
						const foundResult = items.some((el, ij) => {
							if (el.name == 'DisplayIcon') {
								cb(el.value)
								return true
							}
						})
						if (!foundResult)
							cb(false)
					}
				} else {
					if (err || !items || !items[0] || !items[0].value) {
						cb(false)
					} else {
						cb(items[0].value)
					}
				}
			})

		}

		const hackSopPlayer = () => {
			const codecLoc = path.join(binaryLoc.replace('\\SopCast.exe', ''), 'codec', 'sop.ocx')
			fs.access(codecLoc, (err) => {
			  if (!err) {
			    fs.rename(codecLoc, codecLoc.replace('\\sop.ocx', '\\sop.ocx.old'), () => {
			    	cb(binaryLoc)
			    })
			    return
			  }
			  cb(binaryLoc)
			})
		}

		const success = (itemValue) => {
			binaryLoc = itemValue
			hackSopPlayer()
		}

		getReg('\\SOFTWARE\\WOW6432Node\\SopCast\\Player\\InstallPath', itemValue => {
			if (itemValue)
				success(itemValue)
			else
				getReg('\\SOFTWARE\\SopCast\\Player\\InstallPath', itemValue => {
					if (itemValue)
						success(itemValue)
					else
						getReg('\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\SopCast.exe', itemValue => {
							if (itemValue)
								success(itemValue)
							else
								getReg('\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SopCast', itemValue => {
									if (itemValue)
										success(itemValue)
									else
										cb(false)
								})
						})
				})
		})
	} else if (process.platform == 'linux') {
		binaryLoc = '/usr/bin/sp-sc'
		cb(binaryLoc)
	}

	return binaryLoc

}

let hidingWindow = false

let sopProc

const sop = {

	close: (pid, cb) => {
		hlsLink.destroy(pid, () => {

			function stopStream() {
				if (streams[pid]) {
					delete streams[pid].directLink
					delete streams[pid].transcodeLink
					streams[pid].status = 'Could not load torrent. Please try again later.'
					streams[pid].running = false
					sopbook.add(streams[pid])
				}
				cb()
			}

			if (streams[pid] && streams[pid].running) {
				sop.kill(() => {
					stopStream()
				}, () => {
					stopStream()
				})
			} else
				stopStream()
		})
	},

	unhackSopPlayer: (cb) => {
		if (process.platform != 'win32') {
			cb()
		} else {
			chooseBinary(binaryLoc => {
				if (!binaryLoc) {
					cb()
					return
				}
				const codecLoc = path.join(binaryLoc.replace('\\SopCast.exe', ''), 'codec', 'sop.ocx.old')
				fs.access(codecLoc, (err) => {
				  if (!err) {
				    fs.rename(codecLoc, codecLoc.replace('\\sop.ocx.old', '\\sop.ocx'), () => {
				    	cb()
				    })
				    return
				  }
				  cb()
				})
			})
		}
	},

	streamLink: (pid) => {
		return streams && streams[pid] && streams[pid].directLink ? streams[pid].directLink : false
	},

	connect: (sopUrl, peerflixProxy, reqToken, playlistCb, requestHost) => {

		if (!sopUrl.includes('://')) {
			const sopAddr = sopbook.get(sopUrl)
			if (sopAddr && sopAddr.sopUrl) {
				sopUrl = sopAddr.sopUrl
			}
		}

		const pid = sopUrl.replace(/[^a-z0-9]/gi,'')

		const runSop = () => {

			chooseBinary(binaryLoc => {

				if (!binaryLoc) {
					console.log('Error: cannot find sopcast binary file')
					return
				}

				getPort().then((port) => {

					if (process.platform == 'win32')
						port = 8902

					sopProc = spawn(binaryLoc, [sopUrl, 36761, port])

					const hideWindow = () => {
						if (hidingWindow)
							hidingWindow = false
						if (streams[pid] && streams[pid].running)
							return
						winHide('SopCast*')
						hidingWindow = setTimeout(hideWindow, 1000)
					}

					if (process.platform == 'win32')
						hideWindow()

					const streamLink = 'http://127.0.0.1:' + port + '/'

					const oldStream = sopbook.get(pid)

					if (!oldStream && !streams[pid]) {
						streams[pid] = {
							utime: Date.now(),
							name: 'SopCast Channel',
							pid,
							status: 'Starting Download',
							running: false,
							isLive: true,
							isSopcast: true,
							directLink: streamLink,
							sopUrl
						}

						sopbook.add(streams[pid])
					} else if (oldStream) {

						streams[pid] = oldStream
						streams[pid].utime = Date.now()
						streams[pid].status = 'Starting Download'
						streams[pid].running = false

						if (streams[pid].directLink)
							delete streams[pid].directLink

						if (streams[pid].transcodeLink)
							delete streams[pid].transcodeLink
					}

					let serverTimeout = Date.now() + 300000 // 5 min timeout

					const checkServer = () => {
						waitForServer = false
						needle.head(streamLink, {
							open_timeout: 5000
						}, function(err, resp) {
							if (err) {
								if (Date.now() > serverTimeout) {
	//								errCb('Cannot start stream')
								} else {
									waitForServer = setTimeout(checkServer, 2000)
								}
							} else {
	//							console.log(streamLink)

								if (hidingWindow) {
									clearTimeout(hidingWindow)
									hidingWindow = false
								}

								if (!streams[pid])
									return

								streams[pid].running = true
								streams[pid].directLink = streamLink
								sopbook.add(streams[pid])

								if (playlistCb) {
									// no transcoding needed
									let newM3U = "#EXTM3U";

									const altHost = 'http://127.0.0.1:' + peerflixProxy

									let uri

									if (!requestHost || requestHost.includes('/127.0.0.1:')) {
										// just use sop's link directly, it's better on linux for some reason
										uri = streamLink
									} else {
										uri = (requestHost || altHost) + '/sop/' + pid + '/0?token=' + reqToken
									}

									newM3U += os.EOL+"#EXTINF:0,"+streams[pid].name+os.EOL+uri

									playlistCb(newM3U)
								} else {
									// needs transcoding
									if (!streams[pid].transcodeLink) {

										hlsLink.start(pid, streams[pid].directLink, (err, server, url) => {
						//					console.log('http://127.0.0.1:3000/embed?url='+encodeURIComponent(url))
											streams[pid].transcodeLink = (requestHost || ('http://127.0.0.1:' + peerflixProxy)) + '/hls/' + pid + '/' + reqToken + '/out.m3u8'
											sopbook.add(streams[pid])
										}, (err) => {
											streams[pid].status = err || 'Unknown Error'
											sopbook.add(streams[pid])
										})

									} else {
										// do nothing, handled on UI side
									}
								}
							}
						})
					}

					let waitForServer = setTimeout(checkServer, 2000)

					sopProc.stdout.on("data", data => {
						const dt = data.toString()
						console.log("[sop out]", dt);
						if (dt.startsWith('Start cache thread.')) {
		//					cb('http://127.0.0.1:'+port+'/')
						}
					})

					sopProc.stderr.on("data", data => {
						console.log("[sop msg]", data.toString())
					})

					sopProc.on("close", (code, signal) => {

						console.warn("[sop close]", code, signal)

						sopProcess = null

						if (streams[pid] && streams[pid].running) {
							streams[pid].running = false
							streams[pid].status = 'Sopcast Stopped, Error Code: ' + code
							sopbook.add(streams[pid])
						}

					})

					sopProc.on("exit", (code, signal) => {
						console.warn("[sop exit]", code, signal)
					})

					sopProc.on("error", err => {
					  console.warn("[sop error]", err);
					})

				})
			})
		}

		sop.kill(() => {
			hlsLink.destroy(pid, () => {
				setTimeout(runSop, 5000)
			})
		}, () => {})

	},

	isDownloaded: (cb) => {

		chooseBinary(binaryLoc => {

			if (!binaryLoc)
				return cb(false)

			fs.access(binaryLoc, (err) => {
			  if (!err) {
			    cb(true)
			    return
			  }
			  cb(false)
			})
		})

	},

	download: (downloading, extracting, cb, errorCb) => {

		const fileLink = 'https://powder.media/sop/' + process.platform + '/sopcast.zip'

		const tempFile = path.join(TMP, 'sopcast.zip')

		downloader.download(fileLink, tempFile, downloading, extracting, cb, errorCb)

	},

	kill: (cb, errorCb) => {
		if (hidingWindow) {
			clearTimeout(hidingWindow)
			hidingWindow = false
		}
		_.forEach(streams, (el, ij) => {
			streams[ij].running = false
			sopbook.add(streams[ij])
		})
		if (process.platform == 'darwin') {
			exec('kill $(ps aux | grep -E "PowderWeb/sp-sc-auth" | grep -v grep | awk \'{print $2}\')', () => {
				setTimeout(cb, 100)
			})
		} else if (process.platform == 'win32') {
			exec('tasklist', (body, data, err) => {
				if (body || err) {
					console.warn('[sop err] tasklist error', err.message)
					errorCb(err.message || err)
				} else if (/sopcast\.exe/i.test(data)) {
					console.warn('[sop running] killing it')
					exec('taskkill /IM sopcast.exe /F', (err, stdout, stderr) => {
						if (err || stderr) {
							console.warn('[sop err] can\'t kill process', err, stderr)
							errorCb('can\'t kill process')
						} else {
							console.log('[sop] killed process')
							setTimeout(cb, 100)
						}
					})
				} else {
					cb()
				}
			})
		} else if (process.platform == 'linux') {
			exec('killall -9 sp-sc-auth', () => {
				setTimeout(cb, 100)
			})
		}
	},

	destroy: (pid, cb) => {
		if (streams[pid] && streams[pid].running) {
			sop.close(pid, () => {
				sopbook.remove(pid)
			})
		} else {
			sopbook.remove(pid)
		}
	},

	streamObj: (pid) => {
		return streams[pid] || false
	},

	rename: (pid, name) => {
		if (streams[pid]) {
			streams[pid].name = name
			sopbook.add(streams[pid])
		} else {
			const streamObj = sopbook.get(pid)
			streamObj.name = name
			sopbook.add(streamObj)
		}
	}

}

//sop.connect('sop://51.15.195.206:3912/264314')

module.exports = sop
