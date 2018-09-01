
import _ from 'lodash'

import detectBrowser from 'utils/detectBrowser'

const isSafari = detectBrowser.isSafari;

const meta2container = {
	video: {
		'mov,mp4,m4a,3gp,3g2,mj2': 'mp4',
		'matroska,webm': 'webm',
		'ogg': 'ogv',
	},
	audio: {
		'mov,mp4,m4a,3gp,3g2,mj2': 'mp4',
		'ogg': 'oga',
		'mp3': 'mp3',
	}
}

const codec2support = {
	// video:
	'h264': 'avc1.42E01E',
	'x264': 'avc1.42E01E',
	'mpeg4': 'mp4v.20.8',
	'vp8': 'vp8',
	'vp9': 'vp9',
	'theora': 'theora',

	// audio:
	'aac': 'mp4a.40.2',
	'vorbis': 'vorbis',
	'mp3': 'mp3'
}

const contentTypes = {
	video: {
		'mp4': 'video/mp4',
		'webm': 'video/webm',
		'ogv': 'video/ogg',
		'm3u8': 'application/vnd.apple.mpegurl'
	},
	audio: {
		'mp3': 'audio/mpeg',
		'oga': 'audio/ogg',
		'mp4': 'audio/mp4'
	}
}

const containerCodecs = {
	video: {
		'mp4': {
			video: ['h264', 'x264', 'mpeg4'],
			audio: ['aac']
		},
		'webm': {
			video: ['vp8', 'vp9'],
			audio: ['vorbis']
		},
		'ogv': {
			video: ['theora'],
			audio: ['vorbis']
		},
		'm3u8': {
			video: ['h264', 'x264'],
			audio: ['mp3']
		},
	},
	audio: {
		'mp3': {
			audio: ['mp3']
		},
		'mp4': {
			audio: ['aac']
		},
		'oga': {
			audio: ['vorbis']
		}
	}
}

const buildSupportTag = (contentType, vCodec, aCodec) => {
	return contentType + '; codecs="' + (vCodec ? codec2support[vCodec] : '') + (aCodec ? (vCodec ? ', ' : '') + codec2support[aCodec] : '') + '"'
}

const browserSupport = (video) => {

	if ( !video.canPlayType ) return false

	const supp = { video: {}, audio: {} }

	const validateCodecs = (type, container, vCodec, aCodec) => {
		console.log(buildSupportTag(container, vCodec, aCodec))
		if (!!video.canPlayType( buildSupportTag(contentTypes[type][container], vCodec, aCodec) )) {

			if (!isSafari && container == 'm3u8')
				return

			if (!supp[type][container])
				supp[type][container] = []

			const codecCombo = {}

			if (vCodec)
				codecCombo.video = vCodec

			if (aCodec)
				codecCombo.audio = aCodec

			supp[type][container].push(codecCombo)
		}
		return
	}

	const iterateAudio = (type, container, vCodec, audios) => {
		audios.forEach( aCodec => {
			validateCodecs(type, container, vCodec, aCodec)
		})
		return
	}

	_.each(containerCodecs, (el, type) => {

		_.each(el, (elm, container) => {

			if (elm.video) {
				elm.video.forEach( vCodec => {
					iterateAudio(type, container, vCodec, elm.audio)
				})
			} else
				iterateAudio(type, container, null, elm.audio)

		})

	})

	if (isSafari) {
		// overwrite video container support
		supp.video = {
			'm3u8': [ { video: containerCodecs.video.m3u8.video[0], audio: containerCodecs.video.m3u8.audio[0] } ]
		}
	}

	return supp
}

let supported = false

export default {

	contentTypes,

	containerCodecs,

	isAudio: (meta) => {
		let audioFile

		if (meta.streams && meta.streams.length) {
			let hasAudio
			let hasVideo
			meta.streams.some(stream => {
				if (stream.codec_type) {
					if (stream.codec_type == 'video') {
						hasVideo = true
					} else if (stream.codec_type == 'audio') {
						hasAudio = true
					}
					if (hasVideo && hasAudio)
						return true
				}
			})
			audioFile = !!(hasAudio && !hasVideo)
		}

		return audioFile

	},

	init: (video) => {
		if (video && !supported)
			supported = browserSupport(video)

		// opera doesn't like our mp4 transcodes sometimes (just sometimes though)
		// so we remove mp4 from supported for it completely to guarantee playback
		if (detectBrowser.isOpera && supported && supported.video && supported.video.mp4)
			delete supported.video.mp4

		console.log('supported')
		console.log(supported)
	},

	isSupported: (meta, type, forceAll) => {
		if (forceAll || !supported || !_.size(supported[type || 'video'])) {
			return {
				container: 'all',
				needsAudio: -1,
				needsVideo: -1,
				maxHeight: 0,
				maxWidth: 0,
				contentType: 'all',
				audio: '',
				video: '',
				forAudio: -1,
				audioCount: 1,
				actualHeight: 0,
				actualWidth: 0,
				audioDelay: 0,
			}
		} else {

			const codecConfig = { container: 'all', maxHeight: 0, maxWidth: 0, needsAudio: -1, needsVideo: -1, audio: '', video: '', forAudio: -1, actualHeight: 0, actualWidth: 0, audioDelay: 0 }

			if (meta && meta.format && meta.format.format_name) {

				const fileEncodings = { video: [], audio: [] }

				if (meta.streams && meta.streams.length) {
					meta.streams.forEach(stream => {
						if (stream.codec_type) {
							if (stream.codec_type == 'video') {
								fileEncodings.video.push(stream.codec_name)
							} else if (stream.codec_type == 'audio') {
								fileEncodings.audio.push(stream.codec_name)
							}
						}
					})
					type = fileEncodings.audio.length && !fileEncodings.video.length ? 'audio' : fileEncodings.video.length ? 'video' : type
				}

				codecConfig.audioCount = fileEncodings.audio.length

				type = type || 'video'

				// check supported
				let origContainer = meta2container[type][meta.format.format_name]

console.log('orig container: ' + origContainer)

//				if (origContainer && supported.video[origContainer]) {
//				^ this was wrong because a browser does not need to support the container in order to support the video/audio codecs
				if (origContainer) {

					if (meta.streams && meta.streams.length) {

						const supportsAll = _.some(supported[type], (encodings, container) => {
							const supportsAll = encodings.some(encoding => {
								if (type == 'video') {
									if (fileEncodings.video.indexOf(encoding.video) > -1) {
										if (fileEncodings.audio.indexOf(encoding.audio) > -1) {
											codecConfig.needsVideo = fileEncodings.video.indexOf(encoding.video)
											codecConfig.needsAudio = fileEncodings.audio.indexOf(encoding.audio)
											codecConfig.video = encoding.video
											codecConfig.audio = encoding.audio
											return true
										}
									}
								} else if (type == 'audio') {
									if (fileEncodings.audio.indexOf(encoding.audio) > -1) {
										codecConfig.needsAudio = fileEncodings.audio.indexOf(encoding.audio)
										codecConfig.audio = encoding.audio
										return true
									}
								}
							})

							if (supportsAll) {
								origContainer = container
								return true
							}

						})

						console.log('support all: ' + supportsAll)

						if (type == 'video') {

							if (!supportsAll)
								_.some(supported[type], (encodings, container) => {
									return encodings.some(encoding => {
										// find any valid encoding that we could use
										if (codecConfig.needsVideo == -1 && fileEncodings.video.indexOf(encoding.video) > -1) {
											codecConfig.needsVideo = fileEncodings.video.indexOf(encoding.video)
										}
										if (codecConfig.needsAudio == -1 && fileEncodings.audio.indexOf(encoding.audio) > -1) {
											codecConfig.needsAudio = fileEncodings.audio.indexOf(encoding.audio)
										}
										if (codecConfig.needsVideo > -1 || codecConfig.needsAudio > -1) {
											codecConfig.video = encoding.video
											codecConfig.audio = encoding.audio
											console.log('set container to: '+ container)
											origContainer = container
											return true
										}
									})
								})

							let vdId = -1

							meta.streams.some(stream => {
								if (stream.codec_type && stream.codec_type == 'video') {
									if (codecConfig.needsVideo > -1) {
										vdId++
										if (vdId == codecConfig.needsVideo) {
											codecConfig.maxHeight = stream.height || 0
											codecConfig.maxWidth = stream.width || 0
											return true
										}
									} else {
										codecConfig.maxHeight = stream.height > codecConfig.maxHeight ? stream.height : codecConfig.maxHeight
										codecConfig.maxWidth = stream.width > codecConfig.maxWidth ? stream.width : codecConfig.maxWidth
									}
								}
							})
						} else if (type == 'audio') {

							if (!supportsAll)
								_.some(supported[type], (encodings, container) => {
									return encodings.some(encoding => {
										// find any valid encoding that we could use
										if (codecConfig.needsAudio == -1 && fileEncodings.audio.indexOf(encoding.audio) > -1) {
											codecConfig.needsAudio = fileEncodings.audio.indexOf(encoding.audio)
										}
										if (codecConfig.needsAudio > -1) {
											codecConfig.audio = encoding.audio
											console.log('set container to: '+ container)
											origContainer = container
											return true
										}
									})
								})

						}
					}

					if (origContainer) {
						if (type == 'video') {

							if (codecConfig.needsVideo > -1 || codecConfig.needsAudio > -1) {
		 						// we set the container to the original then
								// as we will not transcode audio or video
								// here depending on circumstances
								codecConfig.container = origContainer
							}

						} else if (type == 'audio') {

							if (codecConfig.needsAudio > -1) {
		 						// we set the container to the original then
								// as we will not transcode audio at all
								codecConfig.container = origContainer
							}
						}
					}

				} else if (type == 'video') {
					// just get maxWidth && maxHeight, we need those for aspect ratio / crop
					if (meta.streams && meta.streams.length) {

						meta.streams.some(stream => {
							if (stream.codec_type && stream.codec_type == 'video') {
								codecConfig.maxHeight = stream.height > codecConfig.maxHeight ? stream.height : codecConfig.maxHeight
								codecConfig.maxWidth = stream.width > codecConfig.maxWidth ? stream.width : codecConfig.maxWidth
							}
						})

					}
				}
			}

			type = type || 'video'

			if (codecConfig.container == 'all') {

				const encId = Object.keys(supported[type])[0]

				codecConfig.container = encId

				if (supported[type][encId][0].audio)
					codecConfig.audio = supported[type][encId][0].audio

				if (supported[type][encId][0].video)
					codecConfig.video = supported[type][encId][0].video

			}

			if (type == 'audio') {
				codecConfig.isAudio = true
			}

			return codecConfig
		}
	}
}
