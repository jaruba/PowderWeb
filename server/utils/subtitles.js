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

//    if (!objective.limit)
//        objective.limit = config.get('subLimits')[config.get('subLimit')]

    objective.limit = 'all'

//    console.log(objective)
    
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

    subFinder.send(objective);
}

module.exports = subtitles;
