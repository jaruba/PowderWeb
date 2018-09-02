const os = require('os')
const TMP = os.tmpDir()
const platform = os.platform()
const childProcess = require('child_process')

const request = require('request')
const fs = require('fs')
const path = require('path')
const needle = require('needle')
const streams = require('../streams')

const parser = require('./parser')

module.exports = {

	openApp: (appExec, cmdArgs, playlist) => {

	  appExec = '"' + appExec + '"'

	  let appCmdArgs = ''

	  if (playlist)
	    appCmdArgs += ' "'+playlist+'"'

	  if (cmdArgs)
	    appCmdArgs += ' '+cmdArgs

	  if (platform == 'win32') {
	    childProcess.exec(appExec+appCmdArgs)
	  } else if (platform == 'darwin') {
	    childProcess.exec('open -a '+appExec+(appCmdArgs ? ' --args'+appCmdArgs : ''))
	  } else if (platform == 'linux') {
	    // not tested:
	    childProcess.exec(appExec+appCmdArgs)
	  }

	},

	downloadFile: (fileUrl, cb, forceFilename, forceDestFolder) => {

		let fileName = forceFilename || parser(fileUrl).filename()
		console.log(fileName)

		if (fileName.includes('?')) 
			fileName = fileName.split('?')[0]

		const r = request(fileUrl)

		let tempDir

		if (forceDestFolder) {

			tempDir = forceDestFolder

		} else {

			tempDir = path.join(TMP, Date.now()+'')

			if (!fs.existsSync(tempDir))
			    fs.mkdirSync(tempDir)

		}

		const fileLoc = path.join(tempDir, fileName)

		r.on('response',  function (res) {
		  res.pipe(fs.createWriteStream(fileLoc));
		})

		r.on( 'end', function() {
			cb(fileLoc, tempDir)
	    });

	},

	urlType: (url, cb, errCb) => {
		if (url.startsWith('magnet')) {
	      cb({ isTorrent: 1 })
	      return
	    }
	    needle.head(url, {
	      open_timeout: 10000,
	      follow_max: 5,
	      headers: {
	        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
	        'Referer': url
	      }
	    }, (err, resp) => {
	      if (err || !resp || !resp.headers) {
	        errCb(err && err.message ? err.message : 'Unknown Error Occurred')
	      } else {

	        if (resp.headers.connection && resp.headers.connection == 'close' && !resp.headers['content-type'] && !resp.headers.location) {
	          streams.isRedirectToMagnet(url, (isMagnet) => {
	            if (isMagnet) {
	              cb({ isTorrent: 1 })
	            } else {
	              errCb('Unknown Error Occurred 3')
	            }
	          })
	          return
	        }
	        if (resp.headers.location && resp.headers.location.startsWith('magnet:')) {
	          cb({ isTorrent: 1 })
	        } else if (resp.headers['content-type']) {
	          if (resp.headers['content-type'].includes('application/x-bittorrent')) {
	            cb({ isTorrent: 1 })
	          } else if (resp.headers['content-type'].includes('text/html')) {
	            cb({ isYoutubeDl: 1 })
	          } else {
	            // presume video, we can check too with ../utils/isSupported
	            cb({ isVideo: 1 })
	          }
	        } else {
	          errCb('Unknown Error Occurred 2')
	        }
	      }
	    })
	}
}
