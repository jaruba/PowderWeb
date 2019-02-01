var frontPort
var backPort
var maybePort

var getPort = require('get-port')

var child = require('child_process')

var opn = require('opn')

var masterKey
var serverLink

var checkOpen = function() {
	if (serverLink && masterKey)
		opn(serverLink + 'auth?token=' + masterKey)
}

var gotPorts = function() {
	
	var isWin = process.platform === 'win32'

	var newEnv = JSON.parse(JSON.stringify(process.env))

	newEnv.PWFRONTPORT = frontPort
	newEnv.PWBACKPORT = backPort

	var frontProc = child.spawn('npm' + (isWin ? '.cmd' : ''), ['run', 'start-front'],
		{
			cwd: process.cwd(),
			env: newEnv
		})

	frontProc.stdout.on('data', (data) => {
		if (data) {
			var sData = String(data).replace(/(\r\n\t|\n|\r\t)/gm,'')
			console.log(sData)
			if (sData.indexOf('http') > -1 && (sData.startsWith('Compiled successfully') || sData.startsWith('The app is running at'))) {
				serverLink = sData.substr(sData.indexOf('http'))
				checkOpen()
			}
		}
	})

	frontProc.stderr.on('data', (data) => {
		console.log(String(data))
	})

	frontProc.on('exit', (code) => {
		console.log('web server exit')
	})

	var backProc = child.spawn('npm' + (isWin ? '.cmd' : ''), ['run', 'start-back'],
		{
			cwd: process.cwd(),
			env: newEnv
		})

	backProc.stdout.on('data', (data) => {
		if (data) {
			var sData = String(data).replace(/(\r\n\t|\n|\r\t)/gm,'')
			console.log(sData)
			if (sData.startsWith('master key: ')) {
				masterKey = sData.replace('master key: ', '')
				checkOpen()
			}
		}
	})

	backProc.stderr.on('data', (data) => {
		console.log(String(data))
	})

	backProc.on('exit', (code) => {
		console.log('back end exit')
	})


}

var getPorts = function(cb) {

	var fail = function() {
		maybePort++
		getPorts(cb)
	}

	getPort({ port: maybePort }).then(function(newPort) {
		if (newPort == maybePort) {
			cb(newPort)
		} else 
			fail()
	}).catch(function(e) {
		fail()
	})
}

maybePort = 11485

getPorts(function(newPort) {

	frontPort = newPort
	maybePort = newPort -1

	getPorts(function(newPort) {

		backPort = newPort

		gotPorts()

	})
})
