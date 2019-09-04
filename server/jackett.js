const request = require('request')
const xmlJs = require('xml-js')
const _ = require('lodash')
const orderBy = _.orderBy

const config = require('./utils/config')

let ticker = {}

const isObject = (s) => {
    return (s !== null && typeof s === 'object')
}

const setTicker = (ticks, cb) => {

    var tag = Date.now()

    ticker[tag] = ticks

    return function() {
        ticker[tag]--
        if (!ticker[tag]) {
            delete ticker[tag]
            cb()
        }
    }
}

var apiKey = false

var apiIndexers = []

const getIndexers = (cb) => {
	request({
		method: 'GET',
		url: config.get('jackettHost') + 'api/v2.0/indexers/all/results/torznab/api?apikey='+config.get('jackettKey')+'&t=indexers&configured=true',
		timeout: 10000
	}, function(error, response, indexers) {
		if (!error && indexers) {
			indexers = xmlJs.xml2js(indexers)
			if (indexers && indexers.elements && indexers.elements[0] && indexers.elements[0].elements) {
				indexers = indexers.elements[0].elements
				cb(null, indexers)
			} else {
				cb(new Error('No Indexers'))
			}
		} else {
			cb(error || new Error('No Indexers'))
		}
	})
}

module.exports = {

	haveJackett: () => {
		return !!(config.get('jackettKey') && config.get('jackettHost'))
	},

	search: (query, item, cb, end) => {
		getIndexers(function(err, apiIndexers) {
			if (!err && apiIndexers && apiIndexers.length) {
				var cat = item && item.type ? item.type == 'movie' ? 2000 : 5000 : ''
				var tick = setTicker(apiIndexers.length, () => {
					end({ ended: true })
				})
				apiIndexers.forEach((indexer) => {
					if (indexer && indexer.attributes && indexer.attributes.id) {
						request({
							method: 'GET',
							url: config.get('jackettHost')+'api/v2.0/indexers/'+indexer.attributes.id+'/results/torznab/api?apikey='+config.get('jackettKey')+'&t=search&cat='+cat+'&q='+encodeURI(query),
							json: true,
							timeout: 10000
						}, function(error, response, xmlTors) {
							if (!error && xmlTors) {
								if (isObject(xmlTors)) {
									// indexer error
									tick()
									return
								}
								var tors = xmlJs.xml2js(xmlTors)

								if (tors.elements && tors.elements[0] && tors.elements[0].elements && tors.elements[0].elements[0] && tors.elements[0].elements[0].elements) {

									var elements = tors.elements[0].elements[0].elements

									var tempResults = []

									elements.forEach(function(elem) {

										if (elem.type == 'element' && elem.name == 'item' && elem.elements) {

											var newObj = {}
											var tempObj = {}

											elem.elements.forEach(function(subElm) {
												if (subElm.name == 'torznab:attr' && subElm.attributes && subElm.attributes.name && subElm.attributes.value)
													tempObj[subElm.attributes.name] = subElm.attributes.value
												else if (subElm.elements && subElm.elements.length)
													tempObj[subElm.name] = subElm.elements[0].text
		//										else
		//											console.log(subElm)
											})

											var ofInterest = ['title', 'link', 'magneturl']

											ofInterest.forEach((ofInterestElm) => {
												if (tempObj[ofInterestElm])
													newObj[ofInterestElm] = tempObj[ofInterestElm]
											})

											var toInt = ['seeders', 'peers', 'size', 'files']

											toInt.forEach((toIntElm) => {
												if (tempObj[toIntElm])
													newObj[toIntElm] = parseInt(tempObj[toIntElm])
											})

											if (tempObj.pubDate)
												newObj.jackettDate = new Date(tempObj.pubDate).getTime()

											newObj.isJackett = true

											newObj.indexer = indexer.attributes.id

											tempResults.push(newObj)
										}
									})
									cb({ ended: false, results: tempResults })
	//								results = results.concat(tempResults)
		//							console.log(results)
								}
							}
		//					console.log(results)
							tick()
						})
					}
				})
			} else {
				cb([])
				end([])
			}
		})
	}
}
