const _ = require('lodash')

const simpleGet = require('simple-get')
const decopressZip = require('decompress-zip')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const downloadLoc = path.join(app.getPath('appData'), 'PowderWeb')

const downloader = {

    extract: (fromPath, toPath, cb, errorCb) => {

        const unzipper = new decopressZip(fromPath)

        unzipper.on('error', function(err) {
            console.warn(err)
            errorCb('Couldn\'t Decompress Archive')
        })

        unzipper.on('extract', cb)

        unzipper.extract({
            path: toPath
        })

    },

    download: (fileLink, tempFile, downloading, extracting, cb, errorCb) => {

        const fileStream = fs.createWriteStream(tempFile)

        simpleGet(fileLink, (err, resp) => {

            let retain
            let lowestDelta

            if (err) {

                errorCb(err.message || err)

            } else {

                lowDelta = resp.headers['content-length']
                retain = 0
                let percent = 0

                resp.on('data', (pack) => {
                    const lastPercent = percent
                    retain = retain + pack.length
                    percent = Math.round(100 * retain / lowDelta)
                    if (percent !== lastPercent)
                        downloading(percent)
                })

                fileStream.on('finish', () => {
                    fileStream.close(() => {
                        extracting()
                        downloader.extract(tempFile, downloadLoc, cb, errorCb)
                    })
                })

                resp.pipe(fileStream)
            }
        })
    }
}

module.exports = downloader;
