const fs = require('fs')
const async = require('async')
const _ = require('lodash')
const request = require('request')
const config = require('./config')
const subtitles = require('./subtitles')
const parser = require('./parser')

const queue = async.queue((task, cb) => {
	function queueNext(timeout) {
		setTimeout(() => {
			cb()
		}, timeout)
	}

	const delay = 2000 // 2s

	if (!task.filepath) {
		queueNext(0)
		return
	}

    fs.stat(task.filepath, function(err, stat) {
        if (err) {
            queueNext(0)
        } else {
			const objective = {}
			objective.torrentHash = task.torrentHash
			objective.filepath = task.filepath
			objective.byteLength = stat.size
			objective.isFinished = true
			objective.cb = subs => {
				if (_.size(subs || [])) {
                  const orderedSubs = []
                  _.each(subs, (el, ij) => {
                    orderedSubs.push({
                      label: ij.split('[lg]')[0],
                      sublang: ij.split('[lg]')[1],
                      src: el,
                      ext: el.split('.').pop()
                    })
                  })

	              const userLangs = config.get('subLangs').split(',')

	              const subSelections = {}

	              orderedSubs.forEach(sub => {
	              	if (sub.sublang && sub.src && sub.label && !subSelections[sub.sublang]) {
	              		// ensure subtitle label does not end with number
	              		// so we only download the first / best subtitle
	              		const matches = sub.label.match(/\d+$/)
	              		if (!(matches || []).length) {
		              		subSelections[sub.sublang] = { src: sub.src, ext: sub.ext }
	              		}
	              	}
	              })

	              if (_.size(subSelections)) {
	              	const downloadQueue = async.queue((task, cb) => {

	              		const downloadDelay = 4000 // 4s

	              		let downloadFinished = false

	              		let downloadTimeout = setTimeout(() => {
	              			downloadTimeout = false
	              			nextDownload(0)
	              		}, 12000) // 12s

	              		function nextDownload(timeout, downloadSuccess) {
	              			if (downloadFinished)
	              				return
	              			downloadFinished = true
	              			if (downloadTimeout) {
	              				clearTimeout(downloadTimeout)
	              				downloadTimeout = false
	              			}
	              			if (!downloadSuccess && !task.retry) {
	              				task.retry = true
	              				downloadQueue.push(task)
	              			}
							setTimeout(() => {
								cb()
							}, timeout)
	              		}

	              		function decideSubtitleName(origName, num) {
	              			let subFilename
	              			if (!num) {
			              		if (task.num == 1) {
			              			subFilename = origName + '.' + task.ext
			              			if (fs.existsSync(task.filepath.replace(videoFilename, subFilename)))
			              				subFilename = origName + '_' + task.sublang + '.' + task.ext
			              		} else
			              			subFilename = origName + '_' + task.sublang + '.' + task.ext
			              		if (fs.existsSync(task.filepath.replace(videoFilename, subFilename)))
			              			return decideSubtitleName(origName, 2)
			              		else
			              			return subFilename
	              			} else {
	              				subFilename = origName + '_' + task.sublang + '_' + num + '.' + task.ext
			              		if (fs.existsSync(task.filepath.replace(videoFilename, subFilename)))
			              			return decideSubtitleName(origName, num+1)
			              		else
			              			return subFilename
	              			}
	              		}

	              		const videoFilename = parser(task.filepath).filename()
	              		const videoExt = videoFilename.split('.').pop()
	              		const videoName = videoFilename.replace(('.' + videoExt), '')
	              		const subFilename = decideSubtitleName(videoName)
	              		const subFilepath = task.filepath.replace(videoFilename, subFilename)

	              		const req = request(task.src)
	              		const writeStream = fs.createWriteStream(subFilepath)

	              		function closeStream() {
	                        try {
	                            writeStream.end()
	                        } catch(e) {}
	                    }

	              		let error = false

	              		req.pipe(writeStream).on('close', () => {
	              			if (!error) {
		              			nextDownload(downloadDelay, true)
		              			closeStream()
		              		}
	              		})

	              		req.on('error', () => {
	              			error = true
	              			nextDownload(downloadDelay)
	              			closeStream()
	              		})
	              	}, 1)

	              	downloadQueue.drain = () => {
	              		// do not use delay here, because it is already part of the download queue
						queueNext(0)
	              	}

	              	_.forEach(subSelections, (el, ij) => {
		              	downloadQueue.push({ filepath: task.filepath, sublang: ij, src: el.src, ext: el.ext, num: _.size(userLangs) })
		            })
	              }
				} else
					queueNext(delay)
			}
			subtitles.fetchSubs(objective)
		}
	})
}, 1)

module.exports = obj => {
	if ((obj.files || []).length) {
		obj.files.forEach(el => {
			queue.push({
				torrentHash: obj.torrentHash,
				filepath: el
			})
		})
		queue.push(obj)
	}
}
