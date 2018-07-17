const os = require('os')
const TMP = os.tmpDir()
const platform = os.platform()
const childProcess = require('child_process')

const request = require('request')
const fs = require('fs')
const path = require('path')

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

	}
}
