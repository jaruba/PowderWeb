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

	mp3: {
		contentType: 'audio/mpeg',
		codecs: {
			audio: 'mp3'
		},
		outputOptions: []
	},

	oga: {
		contentType: 'audio/ogg',
		codecs: {
			audio: 'vorbis'
		},
		outputOptions: []
	},

	mp4: {
		contentType: 'audio/mp4',
		codecs: {
			audio: 'aac'
		},
		outputOptions: []
	},

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

	}
}
