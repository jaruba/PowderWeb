// source 1: https://gist.github.com/yellowled/1439610
// source 2: https://github.com/milankragujevic/torrentflix/

//# webm
//ffmpeg -i IN -f webm -vcodec libvpx -acodec libvorbis -ab 128k -crf 22 -s 640x360 OUT.webm
//
//# mp4
//ffmpeg -i IN -f mp4 -vcodec libx264 -acodec aac -ac 2 -ab 128k -crf 22 -s 640x360 -preset slow OUT.mp4
//
//# ogg (if you want to support older Firefox)
//ffmpeg2theora IN -o OUT.ogv -x 640 -y 360 --videoquality 5 --audioquality 0  --frontend


// const audioNeedsTranscodingCodecs = [
//     "aac",
//     "mp3",
//     "vorbis",
// ];

// const videoNeedsTranscodingCodecs = [
//     "h264",
//     "x264",
//     "vp8"
// ];

// const validFormats = [
//     "matroska,webm",
//     "mov,mp4,m4a,3gp,3g2,mj2",
//     "mp3",
//     "ogg"
// ];

module.exports = {

	ts: {
		contentType: 'video/MP2T',
		codecs: {
			video: 'libx264',
			audio: 'libmp3lame'
		},
		outputOptions: []
	},

	m3u8: {
		contentType: 'application/vnd.apple.mpegurl',
		codecs: {
			video: 'libx264',
			audio: 'libmp3lame'
		},
		outputOptions: []
	},

	mp4: {
		contentType: 'video/mp4',
		codecs: {
			video: 'libx264',
			audio: 'aac',
//			audio: 'libmp3lame'
		},
		outputOptions: [

//			'-g 52',
//			'-strict experimental',
//			'-acodec aac',
//			'-ab 64k',
//			'-vcodec libx264',
//			'-vb 448k',
//			'-f mp4',


//'-c:v libx264',
//'-crf 23','-profile:v baseline','-level 3.0', '-pix_fmt yuv420p','-c:a aac','-ac 2','-strict experimental','-b:a 128k','-s 480x274',

//'-vcodec libx264','-pix_fmt yuv420p','-profile:v baseline','-level 3',
//'-acodec aac','-strict -2',

//'-vf yadif,scale=640:360',
//'-ab 128k','-vcodec libx264','-profile:v baseline','-vb 1000k',
//'-vcodec libx264', '-acodec libfaac',
//			'-movflags faststart+frag_keyframe+empty_moov'

			// '-acodec aac',
			// '-ac 2',
			// '-ab 160k',
			// '-vcodec libx264',
			// '-preset slow',
			// '-profile:v baseline',
			// '-level 30',
			// '-maxrate 10000000',
			// '-bufsize 10000000',
			// '-vb 1200k',
			// '-threads 0',

		// trying to make it work in safari:
//			"-pix_fmt yuv420p",
//			"-profile:v baseline",
//			"-level 3",

//			"-pix_fmt yuv420p",

//"-ar 22050",
//"-ab 512",
//"-b 800k",
//"-s 514*362",
//"-c:v libx264",
//"-strict 2",
//"-acodec aac",
//"-ac 2",
//"-c:a aac",
//"-copyts",
//"-preset ultrafast",
//"-tune zerolatency",
//"-f lavfi",

//			"-f lavfi",

//			"-c:v libx264",
//			"-profile:v main",
//			"-movflags +faststart",

//			"-movflags +faststart",
//			"-profile:v main",


//'-vcodec libx264', '-preset slow', '-crf 22',
//'-profile:v baseline', '-level 3.0',
//'-strict 2', '-acodec libvo_aacenc', '-ac 2', '-b:a 128k',

			// working in chrome, ff, edge (but not safari):

			// actually, this only works in firefox last i checked..

			'-preset ultrafast',
			'-tune zerolatency',
			'-movflags faststart+frag_keyframe+empty_moov',
			'-f mp4',

			// working perfectly in chrome (but not ff, safari):

//			 "-copyts",
//			 "-preset ultrafast",
//			 "-tune zerolatency",
//			 "-f matroska",

		],
		chromeOptions: [
			'-preset ultrafast',
			'-tune zerolatency',
			'-f matroska',
		]
	},

	webm: {
		contentType: 'video/webm',
		codecs: {
			video: 'libvpx',
			audio: 'libvorbis'
		},
		outputOptions: [
			"-pix_fmt yuv420p",
//			'-copyts',
			'-deadline realtime',
			'-error-resilient 1',
		]
	},

	ogv: {
		contentType: 'video/ogg',
		codecs: {
			video: 'libtheora',
			audio: 'libvorbis'
		},
		outputOptions: [
			"-pix_fmt yuv420p",
			'-qscale:v 7',
			'-qscale:a 5',
//			'-copyts',
			'-deadline realtime',
			'-error-resilient 1',
		]
	},

//	mp3: {
//		contentType: 'audio/mpeg',
//		codecs: {
//			audio: 'mp3'
//		},
//		outputOptions: []
//	},

	codecMap: {

		// video:

		'h264': 'libx264',
		'x264': 'libx264',
		'vp8': 'libvpx',
		'vp9': 'libvpx-vp9',
		'theora': 'libtheora',

		// audio:

		'aac': 'aac',
		'vorbis': 'libvorbis',
		'mp3': 'libmp3lame',

	},

	quality: {
		'1080p': {
			bitrate: {
				video: '4096k',
				audio: '256k',
			},
			resolution: '1920x?'
		},
		'720p': {
			bitrate: {
				video: '4096k',
				audio: '256k',
			},
			resolution: '1280x?'
		},
		'480p': {
			bitrate: {
				video: '3072k',
				audio: '192k',
			},
			resolution: '854x?'
		},
		'360p': {
			bitrate: {
				video: '2048k',
				audio: '128k',
			},
			resolution: '640x?'
		},
		'240p': {
			bitrate: {
				video: '1024k',
				audio: '96k'
			},
			resolution: '426x?'
		},
		'144p': {
			bitrate: {
				video: '512k',
				audio: '64k',
			},
			resolution: '256x?'
		}
	},
}
