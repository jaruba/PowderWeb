
const fs = require('fs')
const path = require('path')
const pump = require('pump')
const getPort = require('get-port')
const rangeParser = require('range-parser')
const os = require('os')
const TMP = os.tmpDir()
const pUrl = require('url')
const ffmpeg = require('easy-ffmpeg')
const http = require('http')
const rimraf = require('rimraf')
const _ = require('lodash')

const timerGC = {}
const timeouts = {}
const servers = {}
const retries = {}
const commands = {}
const timerStart = {}
const requests = {}
const lastTsFile = {}

const transToFile = (args, file, isHls, cb, pid) => {

	var timestamp = new Date().getTime()
	var hlsFolder = 'hls-' + pid

	try {
		fs.mkdirSync(path.join(TMP, hlsFolder))
	} catch(e) {}

	function log(msg) {
		console.log(msg)
	}

	var command = ffmpeg({ source: file, timeout: false, logger: { debug: log, info: log, warn: log, error: log } })
	
	command.on('start', (commandLine) => {

//	   console.log('Spawned Ffmpeg with command: ', commandLine);
	   
	   cb && cb(null, path.join(TMP, hlsFolder))

	}).on('error', (err) => {
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
			console.log('Ffmpeg Error: ' + err.message)
		}
//		cb(err.message);
	}).on('close', (err, msg) => {
		console.log('ffmpeg close')
		console.log(err)
		console.log(msg)
	}).on('exit', (err, msg) => {
		console.log('ffmpeg exit')
		console.log(err)
		console.log(msg)
	})
	.on('end', (err, stdout, stderr) => {
		console.log('Finished processing', err, stdout, stderr)
	})

	command.outputOptions(args)

	command.save(path.join(TMP, hlsFolder, 'out' + (isHls ? '.m3u8' : '')))
	
	commands[pid] = command
	
}

const hlsServer = (filePath, cb, prebufTime, port, pid, ffmpegFlags, timeoutCb) => {

  const server = http.createServer()

  requests[pid] = {}

  const connections = {}

  server.on('connection', (conn) => {
    const key = conn.remoteAddress + ':' + conn.remotePort
    connections[key] = conn
    conn.on('close', function() {
      delete connections[key]
    })
  })

  server.destroy = (cb) => {
    server.close(cb)
    for (var key in connections)
      connections[key].destroy()
  }

  servers[pid] = server

  server.on('request', (request, response) => {

	var u = pUrl.parse(request.url)
    var file = path.join(filePath, u.pathname.substr(1))

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
	var fileLength = fs.lstatSync(file).size
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

      pump(fs.createReadStream(file), response)

      return
    }

    response.statusCode = 206
    response.setHeader('Content-Length', range.end - range.start + 1)
    response.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + fileLength)

    if (request.method === 'HEAD') return response.end()
	  
    pump(fs.createReadStream(file, range), response)
  })

  server.on('connection', function (socket) {
    socket.setTimeout(Number.MAX_SAFE_INTEGER)
  })
  
  server.on('listening', function () {

	var streamer = 'http://127.0.0.1:' + server.address().port + '/out.m3u8';

//	console.log('Streaming URL: ', streamer);

	let startTime = Date.now()

	let finished = false

	var checkForFile = function() {
		delete timerStart[pid]
		fs.readdir(filePath, (err, files) => {
			if (err == null && files && files.length > 2) {
				finished = true
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
		if (!finished) {
			timeoutCb('Torrent failed to load in Web Player. Please try again later or try downloading the playlist.')
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

		timerGC[pid] = setTimeout(gc, 120000); // every 2 minutes
	}

	timerGC[pid] = setTimeout(gc, 120000); // every 2 minutes

  });

  console.log('starting hls server with port: ' + port);

  server.listen(port || null);
}

const destroy = (pid, cb) => {

	if (commands[pid]) {
		commands[pid].kill('SIGINT')
		delete commands[pid]
	}

	if (timeouts[pid]) {
		clearTimeout(timeouts[pid])
		delete timeouts[pid]
	}

	if (timerStart[pid]) {
		clearTimeout(timerStart[pid])
		delete timerStart[pid]
	}

	if (servers[pid]) {
		// stop transcoding server
		servers[pid].destroy(() => {
			delete servers[pid]
			rimraf(path.join(TMP, 'hls-' + pid), { maxBusyTries: 100 }, (err, data) => { cb() })
		})
	} else
		cb()

}

module.exports = {
	start: (pid, directLink, cb, timeoutCb) => {

		destroy(pid, () => {

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
	//			'-hls_playlist_type', 'vod',
			];

			getPort({ port: 12859 }).then((port) => {
				transToFile(ffmpegFlags, directLink, true, (err, filePath) => {
					hlsServer(filePath, cb, 2000, port, pid, ffmpegFlags, directLink, timeoutCb)
				}, pid)
			})

		})

	},

	destroy,

	port: (pid) => {
		return servers[pid] && servers[pid].address ? servers[pid].address().port : false
	}

}
