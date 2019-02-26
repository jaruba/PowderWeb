
const ytdl = require('youtube-dl')
const config = require('./utils/config')
const ytdlBook = require('./utils/ytdlbook')


const extract = (url, cb, errCb) => {
    const ytdlArgs = ['-g']

    const ytdlQuality = config.get('ytdlQuality')

    if (ytdlQuality < 4) {
        const qualities = [360, 480, 720, 1080]
        ytdlArgs.push('-f')
        ytdlArgs.push('[height <=? ' + qualities[config.get('ytdlQuality')] + ']')
    }
    
    const vd = ytdl(url, ytdlArgs)

    vd.on('error', function(err) {
        console.log('ytdl ending error')
        errCb(err && err.message ? err.message : 'Error: Invalid URL')
    })

    vd.on('info', function(info) {
        if (info.url) {
            console.log(info)

            const pid = url.replace(/[^a-z0-9]/gi,'')

            const oldObj = ytdlBook.get(pid)

            if (oldObj && oldObj.name)
            	info.fulltitle = oldObj.name

            cb({
            	pid,
            	utime: Date.now(),
            	name: info.fulltitle || info.title || info.name,
            	thumbnail: info.thumbnail,
            	originalURL: url,
            	extracted: info.url,
            	isYtdl: true
            })
        } else {
        	errCb('Error: Extracted Link Unavailable')
        }
    })
}

const youtubeDl = {
	add: (url, cb, errCb) => {
		extract(url, (resp) => {
			ytdlBook.add(resp)
			cb(resp)
		}, (errMsg) => {
			console.log(errMsg)
			errCb(errMsg)
		})
	},
	remove: (pid) => {

		ytdlBook.remove(pid)

	},
	updateTime: (pid) => {
		const loc = ytdlBook.get(pid)
		if (loc) {
			loc.utime = Date.now()
			ytdlBook.add(loc)
		}
	},
	rename: (pid, name) => {
		const loc = ytdlBook.get(pid)
		if (loc && name) {
			loc.name = name
			ytdlBook.add(loc)
		}
	},
	get: (pid) => {
		return ytdlBook.get(pid)
	},
	getAll: () => {
		return ytdlBook.getAll()
	}
}

module.exports = youtubeDl
