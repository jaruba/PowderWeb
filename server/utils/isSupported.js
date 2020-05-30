
const contentTypes = {
    'mkv': 'video/x-matroska',
    'avi': 'video/avi',
    'mp4': 'video/mp4',
    'm4v': 'video/x-m4v',
    'mpg': 'video/mpeg',
    'mpeg': 'video/mpeg',
    'webm': 'video/x-webm',
    'flv': 'video/x-flv',
    'ogg': 'video/x-ogg',
    'ogv': 'video/ogg',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    '3gp': 'video/3gpp',
    '3g2': 'video/3gpp2',
    'm2v': 'video/mpeg',
    'real': 'video/real', // ???
    'm2ts': 'video/vnd.dlna.mpeg-tts',
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'flac': 'audio/flac',
    'wma': 'audio/x-ms-wma',
    'wav': 'audio/wav'
}

var supported = {
    ext: {
        video: ['.mkv', '.avi', '.mp4', '.m4v', '.mpg', '.mpeg', '.webm', '.flv', '.ogg', '.ogv', '.mov', '.wmv', '.3gp', '.3g2', '.m2v', '.real', '.m2ts'],
        audio: ['.m4a', '.mp3', '.flac', '.wma', '.wav'],
        subs: ['.sub', '.srt', '.vtt'],
        torrent: ['.torrent', '.magnet']
    },
    is: (file, type) => {
        if (!supported.ext[type]) return false;
        return supported.ext[type].some( el => {
            if ((file || '').toLowerCase().endsWith(el)) return true;
        });
    },
    contentType: (ext) => {
        return contentTypes[ext] || false
    }
};

supported.ext.allMedia = supported.ext.video.concat(supported.ext.audio);

module.exports = supported;
