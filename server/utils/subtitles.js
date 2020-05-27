const parseVideo = require('video-name-parser')
const nameToImdb = require('name-to-imdb')
const worker = require('subtitles-thread')
const parser = require('./parser')
const config = require('./config')

var objective = {};
var subtitles = {};
var subFinder = false;

subtitles.fetchSubs = (newObjective, useQuery) => {
    objective = newObjective;

    if (objective.filepath) {
        objective.filename = parser(objective.filepath).filename();
        if (useQuery) {
            if (!objective.query)
                objective.query = objective.filename.replace(/\.[^/.]+$/, "")
            delete objective.filepath
            delete objective.filename
        }
    }

    objective.limit = !config.get('subLimit') ? 'all' : config.get('subLimit')

    objective.sublanguageid = config.get('subLangs') || 'all'

    if (subFinder) subFinder.kill('SIGINT');
    
    subFinder = worker();

    subFinder.on('message', msg => {
        if (msg) {
            if (msg == 'null') {
                if (!useQuery) {
                    subFinder.kill('SIGINT');
                    subFinder = false;
                    setTimeout(() => {
                        subtitles.fetchSubs(objective, true)
                    })
                    return
                } else {
                    objective.cb('');
                }
            } else {
                objective.cb(msg)
            }
            subFinder.kill('SIGINT');
            subFinder = false;
        }
    });

    if (!config.get('subsOnlyHash') && objective.filename) {
        // get imdb id
        var parsedFilename = parseVideo(objective.filename);
        if (parsedFilename) {
            nameToImdb(parsedFilename, function(err, res, inf) {
                if (res)
                    objective.imdbid = res;
                subFinder.send(objective);
            })
            return
        }
    }
    subFinder.send(objective);
}

module.exports = subtitles;
