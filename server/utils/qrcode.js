const ip = require('my-local-ip')
const config = require('./config')
const QRCode = require('qrcode')
const needle = require('needle')

module.exports = (qrType, qrKey, serverPort, cb, errCb) => {

	const useSSL = config.get('webServerSSL') || false

	let urlTemp = 'http' + (useSSL ? 's' : '') + '://%ip%:' + serverPort + '/auth?token=' + qrKey

	if (qrType == 'local') {

	  urlTemp = urlTemp.replace('%ip%', ip())

	  QRCode.toDataURL(urlTemp, (err, url) => {
	    if (err) {
	      errCb(err && err.message ? err.message : 'Unknown Error Occured')
	    } else {
	      cb({ url: urlTemp, qrCode: url })
	    }
	  })

	} else if (qrType == 'internet') {

	  needle.get('http://icanhazip.com/', (err, resp) => {
	    if (!err && resp.statusCode == 200 && resp.body) {

	      urlTemp = urlTemp.replace('%ip%', resp.body.trim())

	      QRCode.toDataURL(urlTemp, (err, url) => {
	        if (err) {
	          errCb(err && err.message ? err.message : 'Unknown Error Occured')
	        } else {
	          cb({ url: urlTemp, qrCode: url })
	        }
	      })

	    } else {
	      errCb(err && err.message ? err.message : 'Unknown Error Occured')
	    }
	  })
	}
}