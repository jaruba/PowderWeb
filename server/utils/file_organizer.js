
const config = require('./config')
const parser = require('./parser')
const sorter = require('./sort')
const supported = require('./isSupported')
const { app } = require('electron')
const path = require('path')
const temp = path.join(app.getPath('temp'), 'Powder-Player')

module.exports = (engine) => {
    return new Promise((resolve) => {

        var files = engine.files
        var seen = new Set();
        var directorys = [];
        var files_total = files.length;
        var files_organized = {};
        var infoHash = engine.infoHash

        console.log('info hash: '+ infoHash)

        var anyShortSz

        for (var fileID in files) {
            var file = files[fileID];
            if (!anyShortSz && parser(file.name).shortSzEp())
                anyShortSz = true

            files[fileID].fileID = fileID;
        }

        if (files_total > 1) {
            if (anyShortSz) {
                files = sorter.episodes(files, 2);
            } else {
                files = sorter.naturalSort(files, 2);
            }
        }

        var selectedFirst = false
        
        function findById(fileID, action) {

            // there's a bigger bug here, infohash is 0 and torrent is undefined
            if (!engine) return

            engine.files.some(function(el, ij) {
                if (el.fileID == fileID) {
                    engine[action](ij)
                    return true
                }
            })
        }
        
        var anyStreamable = false

        const downloadAll = config.get('downloadAll')

        files.forEach(function(el) {
            var file = el;
            if (file.selected && !downloadAll) findById(file.fileID, 'deselectFile')
            if (downloadAll) findById(file.fileID, 'selectFile')
            var fileParams = path.parse(file.path);
            var streamable = supported.is(fileParams.ext, 'allMedia');

            if (streamable) {
                anyStreamable = true
                if (!selectedFirst && !downloadAll) {
                    if (!file.selected) findById(file.fileID, 'selectFile')
                    selectedFirst = true
                }
                if (!files_organized.ordered)
                    files_organized.ordered = [];

                files_organized.ordered.push({
                    length: file.length,
                    id: file.fileID,
                    name: file.name,
                    streamable: true,
//                    infoHash: infoHash,
//                    path: config.has('downloadFolder') ? path.join(config.get('downloadFolder'), file.path) : path.join(temp, 'Powder-Player', infoHash, file.path)
                });
                directorys.push(fileParams.dir);
            }
        })

        files_organized.streamable = true
        if (!anyStreamable) {
            files_organized.streamable = false
            files_organized.ordered = []
            files.forEach(function(el) {
                var fileParams = path.parse(file.path);

                files_organized.ordered.push({
                    length: file.length,
                    id: file.fileID,
                    name: file.name,
                    streamable: false,
//                    infoHash: infoHash,
//                    path: config.has('downloadFolder') ? path.join(config.get('downloadFolder'), file.path) : path.join(temp, 'Powder-Player', infoHash, file.path)
                })

                directorys.push(fileParams.dir);
            })
        }

        directorys = directorys.filter(function(dir) {
            return !seen.has(dir) && seen.add(dir);
        });

        files_organized['folder_status'] = (directorys.length > 1);
        files_organized['files_total'] = files_total;

        resolve(files_organized);
    })
}
