var fs = require('fs');

var path = require('path');

var child = require('child_process')

var dir = path.join(process.cwd(), 'node_modules/hue-name')

var isWin = process.platform === 'win32'

var onlyFront = false

var argv = process.argv || []

argv.forEach(arg => {
  if (arg == '--only-front')
    onlyFront = true
})

function runBackBuild() {

	console.log(' 3/3 - Packaging Application')

	var newEnv = JSON.parse(JSON.stringify(process.env))

	var buildProc = child.spawn('npm' + (isWin ? '.cmd' : ''), ['run', 'build-back'],
		{
			cwd: process.cwd(),
			env: newEnv
		})

	buildProc.stdout.on('data', (data) => {
		if (data) {
			var sData = String(data)
			console.log(sData)
		}
	})

	buildProc.stderr.on('data', (data) => {
		var err = new Error(String(data))
//		throw err
	})

	buildProc.on('exit', (code) => {
		process.exit()
	})
}

function cleanBackBuild() {

	console.log(' 2/3 - Cleaning Package Folder')

	var newEnv = JSON.parse(JSON.stringify(process.env))

	var buildProc = child.spawn('npm' + (isWin ? '.cmd' : ''), ['run', 'prepackage'],
		{
			cwd: process.cwd(),
			env: newEnv
		})

	buildProc.stdout.on('data', (data) => {
		if (data) {
			var sData = String(data)
			console.log(sData)
		}
	})

	buildProc.stderr.on('data', (data) => {
		var err = new Error(String(data))
		throw err
	})

	buildProc.on('exit', (code) => {
		runBackBuild()
	})
}

function runFrontBuild() {

	console.log(' 1/' + (onlyFront ? '1' : '3') + ' - Building Front-end')

	var newEnv = JSON.parse(JSON.stringify(process.env))

	var buildProc = child.spawn('npm' + (isWin ? '.cmd' : ''), ['run', 'build-react'],
		{
			cwd: process.cwd(),
			env: newEnv
		})

	buildProc.stdout.on('data', (data) => {
		if (data) {
			var sData = String(data)
			console.log(sData)
		}
	})

	buildProc.stderr.on('data', (data) => {
		var err = new Error(String(data))
//		throw err
	})

	buildProc.on('exit', (code) => {
		if (onlyFront)
			process.exit()
		else
			cleanBackBuild()
	})

}

if (fs.existsSync(dir)) {
	// compile es6 module, otherwise building front-end fails
	var file = path.join(dir, 'index.js')
	if (fs.existsSync(file)) {
		var babel = require('babel-core')
		fs.readFile(file, function(err, fileData) {
			if (err) {
				throw err
			}
			var result = babel.transform(fileData, { presets: ['env'] })
			fs.writeFileSync(file, result.code)
			runFrontBuild()
		})
	} else runFrontBuild()
} else runFrontBuild()