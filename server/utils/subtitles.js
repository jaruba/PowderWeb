const osMod = require('opensubtitles-api')
const fs = require('fs')
const parser = require('./parser')
const needle = require('needle')
//import webUtil from '../../../utils/webUtil.js';
const http = require('http')
const worker = require('workerjs')
const atob = require('./atob')

var objective = {};
var subtitles = {};
var subFinder = false;
var subParser = false;

subtitles.os = new osMod(atob('T3BlblN1YnRpdGxlc1BsYXllciB2NC43'));
subtitles.findHashTime = 0;
subtitles.osCookie = false;

subtitles.fetchOsCookie = retryCookie => {
//    webUtil.checkInternet( isConnected => {
//        if (isConnected) {
            var req = require('http').request({ host: "dl.opensubtitles.org", path: "/en/download/subencoding-utf8/vrf-ef3a1f1e6e/file/1954677189" },(res) => {
                if (res.headers["set-cookie"] && res.headers["set-cookie"][0]) {
                    console.log('got OS cookie')
                    console.log(res.headers["set-cookie"][0])
                    var tempCookie = res.headers["set-cookie"][0];
                    subtitles.osCookie = (tempCookie + "").split(";").shift();
                    console.log(subtitles.osCookie)
                } else if (!res.headers["set-cookie"] && retryCookie) {
                    console.log("fetching OS cookie failed, trying again in 20 sec");
                    setTimeout(() => { subtitles.fetchOsCookie(false) },20000);
                }
            });
            req.end();
//        }
//    });
}

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
//        objective.limit = settings.get('subLimits')[settings.get('subLimit')]

    objective.limit = 'all'

    console.log(objective)
    
    if (subFinder) subFinder.terminate();
    
//    if (process.env['devMode']) {
        subFinder = new worker('../../server/workers/subtitles/find.js', true);
//    } else {
//        subFinder = new worker('../workers/subtitles/find.js', true);
//    }

    subFinder.addEventListener('message', msg => {
        if (msg.data) {
            if (msg.data == 'null') {
                if (!useQuery) {
                    subFinder.terminate();
                    subFinder = false;
                    setTimeout(() => {
                        subtitles.fetchSubs(objective, true)
                    })
                    return
                } else {
                    objective.cb('');
                }
            } else {
                objective.cb(msg.data)
            }
            subFinder.terminate();
            subFinder = false;
        }
    });

    subFinder.postMessage(objective);
}

module.exports = subtitles;
