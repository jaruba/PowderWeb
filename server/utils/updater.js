const notifier = require('node-notifier')
const needle = require('needle')
const { app, shell, dialog } = require('electron')
const config = require('./config')
let updateCheck = config.get('updateCheck')

const version = '0.9.0'

module.exports = {
    checkUpdates: () => {
        setTimeout(function() {

            if (!updateCheck)
                updateCheck = 0

            // announce update every 3 days on start-up
            if (updateCheck < Math.floor(Date.now() / 1000) - 259200) {
                needle.get('https://powder.media/web-version', (err, res) => {
                    if (!err && res.body && res.body.length < 100 && res.body.includes && res.body.includes('|')) {
                        const vers = (Buffer.isBuffer(res.body) ? res.body.toString() : res.body).split('|')
                        if (vers[0] == version) {
                            config.set('updateCheck', Math.floor(Date.now() / 1000))
                        } else {

                            notifier.notify({
                                title: 'Powder Web v' + vers[0] + ' Available',
                                message: 'Click to download',
                                sound: true,
                                wait: true
                            }, (err, response) => {
                                if (!err) {
                                    config.set('updateCheck', Math.floor(Date.now() / 1000))
                                    if (response == 'activate')
                                        shell.openExternal(vers[1])
                                }
                            })

                        }
                    }
                })
            }
        }, 3000)
    }
}
