
const locbook = require('./utils/locbook')

const walk = require('walk')

const fs = require('fs')

const path = require('path')

const supported = require('./utils/isSupported')

const local = {
	add: (loc, cb, errCb) => {
		fs.lstat(loc, (err, stats) => {

			if (err) {
				errCb(err && err.message ? err.message : 'Unknown Error Occurred')
				return console.log(err); //Handle error
			}

			if (stats) {

				const pid = Date.now()

				if (stats.isFile()) {

					locbook.add({
						pid,
						name: loc.replace(/^.*[\\\/]/, ''),
						location: loc,
						isLocal: true,
						isFile: true,
						utime: Date.now()
					})

					cb(pid)

				} else if (stats.isDirectory()) {

					const mediaList = []

					const walker = walk.walk(loc)

					walker.on("file", function (root, fileStats, next) {

						const fileName = fileStats.name

						let ext

						if (fileName.includes('.')) {
							const parts = fileName.split('.')
							ext = parts[parts.length -1].toLowerCase()
						}

						if (ext && supported.is('.'+ext, 'allMedia')) {
							const fullPath = path.join(root, fileStats.name)
							mediaList.push({
								id: mediaList.length,
								name: fileName,
								location: fullPath
							})
						}

						next()
					})

					walker.on("errors", function (root, nodeStatsArray, next) {
						next()
					})

					walker.on("end", function () {
						if (mediaList.length) {
							locbook.add({
								pid,
								name: loc.replace(/^.*[\\\/]/, ''),
								location: loc,
								isLocal: true,
								isDirectory: true,
								files: mediaList,
								utime: Date.now()
							})
						}
					})


				} else {
					errCb('Not File or Directory')
				}
			}
		})
	},
	remove: (pid) => {

		locbook.remove(pid)

	},
	updateTime: (pid) => {
		const loc = locbook.get(pid)
		loc.utime = Date.now()
		locbook.add(loc)
	},
	get: (pid) => {

		return locbook.get(pid)

	},
	getAll: () => {
		return locbook.getAll()
	},
	rename: (pid, name) => {
		const loc = locbook.get(pid)
		if (loc && name) {
			loc.name = name
			locbook.add(pid)
		}

	},
	getLoc: (pid, fileID) => {

		const loc = locbook.get(pid)

		if (loc) {

			if (loc.location)
				return loc.location

			if (loc.mediaList && loc.mediaList[fileID] && loc.mediaList[fileID].location)
				return loc.mediaList[fileID].location

		}

		return false

	}
}

module.exports = local
