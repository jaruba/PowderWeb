
import browserSupport from 'utils/browserSupport'

import modals from 'utils/modals'

import api from 'utils/api'

import events from 'utils/events'

import _ from 'lodash'

const isEmbedPlayer = window.location.pathname == '/embed'

import detectBrowser from 'utils/detectBrowser'

const isSafari = detectBrowser.isSafari

let isMatroska = (detectBrowser.isChrome || detectBrowser.isIE || detectBrowser.isEdge)

const isAndroid = /(android)/i.test(navigator.userAgent)

if (detectBrowser.isChrome && isAndroid)
	isMatroska = false

let video

let qualities = []

let restartOnFail = 3

let restartPerType = {}

let historyInterval

let shouldSyncSubtitles = false

const defaultConfig = {
	copyts: false,
	maxCompatibility: false,
	maxQuality: true,
	alwaysTranscode: false,
	preferredSubtitle: false,
	subSearch: true,
	renderNotFocused: false,
	playButtonAction: true,
	historyButtonList: true,
	playNewTorrent: 0,
	useMatroska: true,
	forceVideoVisibility: false
}

_.each(defaultConfig, (el, ij) => {
	if (localStorage.getItem(ij) === null) {
		localStorage.setItem(ij, JSON.stringify(el))
	}
})


function gcd(a, b) {
    if (b > a) {
        var temp = a;
        a = b;
        b = temp;
    }
    while (b != 0) {
        var m = a % b;
        a = b;
        b = m;
    }
    return a;
}

var volumeStep = 0.1

var seekStep = 1.6

const AdvancedSettingsMenu = ['Aspect Ratio', 'Crop', 'Zoom', 'Subtitle Delay', 'Audio Delay']

const subSettings = {
	'Aspect Ratio': ['Default','1:1','4:3','16:9','16:10','2.21:1','2.35:1','2.39:1','5:4'],
	'Crop': ['Default','16:10','16:9','1.85:1','2.21:1','2.35:1','2.39:1','5:3','4:3','5:4','1:1'],
	'Zoom': [['Default',1],['2x Double',2],['0.25x Quarter',0.25],['0.5x Half',0.5],['0.75x 3 Quarters',0.75]],
	'Subtitle Delay': [-5000, -4000, -3000, -2500, -2000, -1500, -1000, -750, -500, -250, 0, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000],
	'Audio Delay': [-5000, -4000, -3000, -2500, -2000, -1500, -1000, -750, -500, -250, 0, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000],
}

const hotkeysKeyUp = (e) => {
	  e.preventDefault()
	  if (e.which == 32 || e.which == 13) {
	  	if (video.paused())
	  		video.play()
	  	else
	  		video.pause()
	  } else if (e.which == 70 || e.which == 122) {
		if (video.isFullscreen())
			video.exitFullscreen()
		else
			video.requestFullscreen()
	  } else if (e.which == 84) {

	  	player.notify(toHHMMSS(video.currentTime()) + ' / ' + toHHMMSS(video.duration()))

	  } else if (e.which == 221) {

	  	var newRate = video.playbackRate() + 0.5

	  	if (newRate > 2) newRate = 2

	  	video.playbackRate(newRate)

	    player.notify('Playback Rate '+newRate+'x')

	  } else if (e.which == 219) {

	  	var newRate = video.playbackRate() - 0.5

	  	if (newRate < 0.5) newRate = 0.5

	  	video.playbackRate(newRate)

	    player.notify('Playback Rate '+newRate+'x')

	  } else if (e.which == 187) {

	  	video.playbackRate(1)

	  	player.notify('Playback Rate 1x')

	  } else if (e.which == 77) {

	  	var isMuted = video.muted()

	  	if (isMuted) {
	  		player.notify('Volume ' + Math.floor(video.volume() * 100) + '%')
	  	} else {
	  		player.notify('Muted')
	  	}

	  	video.muted(!video.muted())

	  } else if (e.which == 66) {

	  	video.nextAudioTrack()

	  } else if (e.which == 65) {
	  	// aspect ratio
        const aspectRatios = subSettings['Aspect Ratio'];
        
        const oldValue = video.getLastResize()

        let currentIj = 0

        if (oldValue)
	        aspectRatios.some((el, ij) => {
	        	if (oldValue.aspect == el) {
	        		currentIj = ij
	        		return true
	        	}
	        })

	    if (currentIj == aspectRatios.length -1)
	    	currentIj = 0
	    else
	    	currentIj++

        video.handleResize({
            aspect: aspectRatios[currentIj],
            crop: 'Default',
            zoom: 1
        })

        player.notify('Aspect Ratio: ' + aspectRatios[currentIj])

	  } else if (e.which == 67) {
	  	// crop
        
        const crops = subSettings['Crop'];

        const oldValue = video.getLastResize()

        let currentIj = 0

        if (oldValue)
	        crops.some((el, ij) => {
	        	if (oldValue.crop == el) {
	        		currentIj = ij
	        		return true
	        	}
	        })

	    if (currentIj == crops.length -1)
	    	currentIj = 0
	    else
	    	currentIj++

        video.handleResize({
            aspect: 'Default',
            crop: crops[currentIj],
            zoom: 1
        })

        player.notify('Crop: ' + crops[currentIj])

	  } else if (e.which == 90) {
	  	// zoom

        const zooms = subSettings['Zoom'];

        const oldValue = video.getLastResize()

        let currentIj = 0

        if (oldValue)
	        zooms.some((el, ij) => {
	        	if (oldValue.zoom == el[1]) {
	        		currentIj = ij
	        		return true
	        	}
	        })

	    if (currentIj == zooms.length -1)
	    	currentIj = 0
	    else
	    	currentIj++

        video.handleResize({
            zoom: zooms[currentIj][1],
            crop: 'Default',
            aspect: 'Default'
        })

        player.notify('Zoom: ' + zooms[currentIj][0])
	  } else if (e.which == 27) {
	  	if (video && video.isFullscreen()) {
			video.exitFullscreen()
	  	}
	  }
}

const setSubtitleDelay = (newSubDelay) => {
	const tracks = video.tech_.textTracks_
	if (tracks[0] && selectedSubtitle > -1) {

		if (tracks[selectedSubtitle] && tracks[selectedSubtitle].cues && tracks[selectedSubtitle].cues.length) {

			for (var ij = 0; ij < tracks[selectedSubtitle].cues.length; ij++) {
				const cue = tracks[selectedSubtitle].cues[ij]
				cue.startTime = cue.startTime - oldManualSubDelay + newSubDelay
				cue.endTime = cue.endTime - oldManualSubDelay + newSubDelay
			}

			oldManualSubDelay = newSubDelay

		}

	}
}

const subDelaySetter = () => {
	setTimeout(() => {

		setSubtitleDelay(manualSubDelay)

	})
}

const setSubDelay = _.debounce(subDelaySetter, 500)

let manualSubDelay = 0

let oldManualSubDelay = 0

const newTimeSetter = (newTime) => {
	video.currentTime(newTime)
	video.player_.scrubbing(false)
	unfreezeControlbar()
}

const setNewTime = _.debounce(newTimeSetter, 500)

const newAudioDelaySetter = (newTime) => {
	video.setAudioDelay(tempAudioDelay)
	tempAudioDelay = 0
}

const setNewAudioDelay = _.debounce(newAudioDelaySetter, 500)

let tempAudioDelay = 0

const hotkeysKeyDown = (e) => {
	  e.preventDefault()
	  if (e.which == 38) {
	  	var newVolume = video.volume() + volumeStep
	  	if (newVolume > 1) newVolume = 1
		video.volume(newVolume)
		player.notify('Volume ' + Math.floor(newVolume * 100) + '%')
	  } else if (e.which == 40) {
	  	var newVolume = video.volume() - volumeStep
	  	if (newVolume < 0) newVolume = 0
		video.volume(newVolume)
		player.notify('Volume ' + Math.floor(newVolume * 100) + '%')
	  } else if (e.which == 71) {
	  	// sub delay down
	  	manualSubDelay -= 0.05
	  	player.notify('Subtitle Delay: ' + Math.round(1000 * manualSubDelay) + 'ms')
	  	setSubDelay()
	  } else if (e.which == 72) {
	  	// sub delay up
	  	manualSubDelay += 0.05
	  	player.notify('Subtitle Delay: ' + Math.round(1000 * manualSubDelay) + 'ms')
	  	setSubDelay()
	  } else if (e.which == 39) {

	  	// seek left

	  	var newTime = (video.player_.scrubbing() ? video.player_.scrubTime : video.currentTime()) + (video.duration() / 100 * seekStep)

	  	if (newTime > video.duration())
	  		newTime = video.duration()

	  	setNewTime(newTime)

	  	if (!video.scrubbing())
		  	video.player_.scrubbing(true)

	  	video.player_.scrubTime = newTime

	  	video.player_.trigger('handleScrubMove')

	  	player.notify('Seek to: ' + toHHMMSS(newTime))

		freezeControlbar()

	  } else if (e.which == 37) {

	  	// seek right

	  	var newTime = (video.player_.scrubbing() ? video.player_.scrubTime : video.currentTime()) - (video.duration() / 100 * seekStep)

	  	if (newTime < 0)
	  		newTime = 0

	  	setNewTime(newTime)

	  	if (!video.scrubbing())
		  	video.player_.scrubbing(true)

	  	video.player_.scrubTime = newTime

	  	video.player_.trigger('handleScrubMove')

	  	player.notify('Seek to: ' + toHHMMSS(newTime))

		freezeControlbar()

	  } else if (e.which == 74) {
	  	// audio delay left
	  	if (!tempAudioDelay)
	  		tempAudioDelay = video.getAudioDelay()

	  	tempAudioDelay -= 0.05

	  	setNewAudioDelay()

	  	player.notify('Audio Delay: ' + Math.round(1000 * tempAudioDelay) + 'ms')

	  } else if (e.which == 75) {
	  	// audio delay right
	  	if (!tempAudioDelay)
	  		tempAudioDelay = video.getAudioDelay()

	  	tempAudioDelay += 0.05

	  	setNewAudioDelay()

	  	player.notify('Audio Delay: ' + Math.round(1000 * tempAudioDelay) + 'ms')

	  }
}

const getConfig = (cfg) => {
	return JSON.parse(localStorage.getItem(cfg))
}

let config = {
	copyts: () => {
		return getConfig('copyts')
	},
	maxCompatibility: () => {
		return getConfig('maxCompatibility')
	},
	maxQuality: () => {
		return getConfig('maxQuality')
	},
	alwaysTranscode: () => {
		return getConfig('alwaysTranscode')
	},
	subSearch: () => {
		return getConfig('subSearch')
	},
	useMatroska: () => {
		return getConfig('useMatroska')
	}
}

const toHHMMSS = function (str) {
    var sec_num = parseInt(str, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
}

const clearFrozenPlayer = function() {
  if (document.getElementsByClassName('vjs-loading-spinner').length) {
    document.getElementsByClassName('vjs-loading-spinner')[0].classList.remove('forceSpinner')
  }
  if (typeof window.frozenTime !== 'undefined') {
    restartOnFail = 3
    restartPerType = {}
    delete window.frozenTime
    delete window.frozenProgress
    video.off('timeupdate', unfreezetime)
  }
}

let prevTime
let stopUnfreeze

const freezetime = function(time, progress) {
  console.log('freezetime')
  prevTime = 0
  stopUnfreeze = false
  if (document.getElementsByClassName('vjs-loading-spinner').length) {
    document.getElementsByClassName('vjs-loading-spinner')[0].classList.add('forceSpinner')
  }
  window.frozenTime = time
  window.frozenProgress = progress
  video.on('timeupdate', unfreezetime)
}

const unfreezetime = function() {
  const curTime = video.currentTime()
  if (!prevTime && curTime && !stopUnfreeze) prevTime = curTime
  if (prevTime > curTime) prevTime = curTime
  if (typeof window.frozenTime !== 'undefined' && curTime > prevTime && !stopUnfreeze) {
    stopUnfreeze = true
    prevTime = 0
    clearFrozenPlayer()
  }
}

window.frozenControlbar = false

const freezeControlbar = function() {
	if (!window.frozenControlbar)
		window.frozenControlbar = true
	if (!video.userActive_)
		video.userActive(true)
}

const unfreezeControlbar = function() {
	window.frozenControlbar = false
}

const unfocusButton = function() {
  this.blur()
}

const unfocusButtons = () => {
  var classname = document.getElementsByClassName('vjs-button');

  for (var i = 0; i < classname.length; i++) {
    classname[i].addEventListener('click', unfocusButton, false)
    classname[i].addEventListener('tap', unfocusButton, false)
  }
}

let isPlayerClosed = true

let notifModals = []

let notifModalClosing

let playlistModals = []

let settingsModals = []

let selectedSubtitle = -1

let subtitleStartDiff = 0

let audioSources = []

let selectedAudioTrack = -1

let audioRefresh = function() {}

let settingsMenuRefresh = function() {}

const player = {
	resetSettings: () => {
		_.each(defaultConfig, (el, ij) => {
			localStorage.setItem(ij, JSON.stringify(el))
		})
	},
	getPlayer: () => { return video },
	init: () => {

		if (video || !document.getElementById('video'))
			return

		video = videojs('video', {
			playbackRates: [0.5, 1, 1.5, 2],
			inactivityTimeout: 4000,
			persistTextTrackSettings: true,
			controlBar: {
				playbackRateMenuButton: false
			}
		})

// we remove "autoplay" because it doesn't work in all browsers
// some need the video muted for it to autoplay
// we'll do this manually and if it doesn't work, we'll just show
// a play button

		video.autoplay(false)
		video.controls(true)
		video.preload(true)

		var SettingsButton = videojs.getComponent('settingsButton')

		videojs.registerComponent('SettingsButton', SettingsButton)

		var Button = videojs.getComponent('Button');

		var MenuButton = videojs.getComponent('MenuButton')


	   var MenuItem = videojs.getComponent('MenuItem');

	   const AudioOption = videojs.extend(MenuItem, {

	      constructor: function(player, options) {
	         var source = options.source;

	         if (!_.isObject(source)) {
	            throw new Error('was not provided a "source" object, but rather: ' + (typeof source));
	         }

	         options = _.extend({
	            selectable: true,
	            label: source.label,
	         }, options);

	         MenuItem.call(this, player, options);

	         this.audioSource = source;

	      },

	      handleClick: function(event) {
	         MenuItem.prototype.handleClick.call(this, event);
	         video.audioChange(this.audioSource.idx)
	      },

	   });

	const AudioSelector = videojs.extend(MenuButton, {

      constructor: function(player, options) {

		audioRefresh = this.update.bind(this)

		this.controlText_ = 'Audio'

         MenuButton.call(this, player, options);

         this.controlText('Audio');

      },

      createItems: function() {

         if (!audioSources || audioSources.length < 1) {
            return [];
         }

         return _.map(audioSources, function(source) {
            return new AudioOption(video, {
               source: source,
               selected: selectedAudioTrack == -1 && source.idx == 0 ? true : selectedAudioTrack == source.idx ? true : false,
            });
         });
      },

      buildWrapperCSSClass: function() {
         return 'vjs-audio-selector ' + MenuButton.prototype.buildWrapperCSSClass.call(this);
      },

   });

   videojs.registerComponent('AudioSelector', AudioSelector);


	   const AdvancedSettingsOption = videojs.extend(MenuItem, {

	      constructor: function(player, options) {
	         var source = options.source;

	         options = _.extend({
	            selectable: false,
	            label: source.label,
	         }, options);

	         MenuItem.call(this, player, options);

			this.settingSource = source;

	      },

	      handleClick: function(event) {
	         MenuItem.prototype.handleClick.call(this, event);

     		if (this.settingSource.idx == 3) {
	     		let haveSubTracks = false
				const tracks = video.tech_.textTracks_
				if (tracks && tracks[0] && selectedSubtitle > -1) {
					haveSubTracks = true
				}
				if (!haveSubTracks) {
					player.notify('No Subtitle Selected')
					return
				}
			}

	         player.toggleSetting(this.settingSource.idx)
	      },

	   });

	const AdvancedSettingsButton = videojs.extend(MenuButton, {

      constructor: function(player, options) {

		settingsMenuRefresh = this.update.bind(this)

		this.fixedText_ = 'Show Advanced Settings'

         MenuButton.call(this, player, options);

         this.controlText('Show Advanced Settings');

      },

      createItems: function() {
         return _.map(AdvancedSettingsMenu, function(source, ij) {
            return new AdvancedSettingsOption(video, {
               source: { label: source, idx: ij },
               selected: false
            });
         });
      },

      buildWrapperCSSClass: function() {
         return 'vjs-audio-selector ' + MenuButton.prototype.buildWrapperCSSClass.call(this);
      },

   });

   videojs.registerComponent('AdvancedSettingsButton', AdvancedSettingsButton);

		var PrevButton = videojs.extend(Button, {
		  constructor: function() {
		    Button.apply(this, arguments);
		    this.addClass('fas')
		    this.addClass('fa-angle-left');
		    this.addClass('customPlayerButton')
		    this.addClass('customPrevButton')
		    this.controlText('Previous');
		  },

		  handleClick: function() {
		    this.blur()
		    if (typeof window.frozenTime !== 'undefined' && !window.frozenTime) 
		      return
		    video.playlistCustomPrev();
		  }
		});

		var NextButton = videojs.extend(Button, {
		  constructor: function() {
		    Button.apply(this, arguments);
		    this.addClass('fas')
		    this.addClass('fa-angle-right');
		    this.addClass('customPlayerButton')
		    this.addClass('customNextButton')
		    this.controlText('Next');
		  },

		  handleClick: function() {
		    this.blur()
		    if (typeof window.frozenTime !== 'undefined' && !window.frozenTime) 
		      return
		    video.playlistCustomNext();
		  }
		});

		videojs.registerComponent('PrevButton', PrevButton);
		videojs.registerComponent('NextButton', NextButton);

		video.getChild('controlBar').addChild('PrevButton', {}, 0);
		video.getChild('controlBar').addChild('NextButton', {}, 2);

		video.getChild('controlBar').addChild('SettingsButton', {
		  playbackRates: [0.5, 1, 1.5, 2],
		  inactivityTimeout: 4000,
		  setup: {
		    maxHeightOffset: 40
		  },
		  entries : [
		//    'subtitlesButton',
		//    'captionsButton',
			'advancedSettingsButton',
			'audioSelector',
		    'playbackRateMenuButton',
		    'qualitySelector'
		  ]
		}, 4);

		video.on('qualityRequested', (e, f) => {
			video.qualityChange(f.label)
	    })

	    video.on('ended', () => {
	    	video.endedHandle()
	    })

	    video.on('error', (err) => {
	    	video.errorHandle(err)
	    })

		unfocusButtons()

		if (isMobile.any)
			document.getElementById('video').classList.add('isMobile')

		if (isSafari)
			document.getElementById('video').classList.add('isSafari')

		browserSupport.init(video)

		document.getElementsByClassName('vjs-control-bar')[0].onmouseover = function() {
			freezeControlbar()
		}

		document.getElementsByClassName('vjs-control-bar')[0].onmouseout = function() {
			unfreezeControlbar()
		}

		document.getElementsByClassName('vjs-settings-panel')[0].onmouseover = function() {
			freezeControlbar()
		}

		document.getElementsByClassName('vjs-settings-panel')[0].onmouseout = function() {
			unfreezeControlbar()
		}

		// document.getElementsByClassName('vjs-title-bar-content')[0].onmouseover = function() {
		// 	freezeControlbar()
		// }

		// document.getElementsByClassName('vjs-title-bar-content')[0].onmouseout = function() {
		// 	unfreezeControlbar()
		// }

		video.on('fullscreenchange', () => {
			if (video.handleResize) {
				setTimeout(video.handleResize.bind(null,null), 0)
				setTimeout(video.handleResize.bind(null,null), 250)
				setTimeout(video.handleResize.bind(null,null), 500)
				setTimeout(video.handleResize.bind(null,null), 750)
				setTimeout(video.handleResize.bind(null,null), 1000)
			}
		})

		const handleResize = () => {
			if (video.handleResize)
				video.handleResize()
		}

		const resetSize = _.debounce(handleResize, 300)

		window.onresize = function(event) {
			resetSize()
		}

		video.tech_.on('subtitle-change', (e, newSub) => {
			if (newSub.id) {

		      	let subFound = false

		      	let subIj

				const tracks = video.tech_.textTracks_

		      	for (var kj = 0; tracks[kj] && !subFound; kj++) {

		      		if (tracks[kj].id == newSub.id) {

		      		  subFound = true

		      		  subIj = kj

				    }
				}

				if (subFound && tracks[subIj] && tracks[subIj].label) {
					if (newSub.active) {
						if (tracks[subIj].label != 'Custom Subtitle')
							localStorage.setItem('preferredSubtitle', JSON.stringify(tracks[subIj].label.split(' ')[0]))
					} else {
						if (tracks[subIj].label.startsWith(JSON.parse(localStorage.getItem('preferredSubtitle'))))
							localStorage.setItem('preferredSubtitle', JSON.stringify(false))
					}
				}

		      	if (shouldSyncSubtitles) {
		      		// if we're not preserving timestamp

					if (subFound) {

						if (!newSub.active) {

							if (subtitleStartDiff || manualSubDelay) {
								if (tracks[subIj] && tracks[subIj].cues && tracks[subIj].cues.length) {
									for (var ij = 0; ij < tracks[subIj].cues.length; ij++) {
										const cue = tracks[subIj].cues[ij]
										cue.startTime = cue.startTime + subtitleStartDiff - manualSubDelay
										cue.endTime = cue.endTime + subtitleStartDiff - manualSubDelay
									}

									manualSubDelay = 0
									oldManualSubDelay = 0

								}
							}
							if (selectedSubtitle == subIj) {
								selectedSubtitle = -1
							}
						} else {

							if (subtitleStartDiff) {
								const fixSubTimestamp = () => {
									tracks[subIj].off('loadeddata', fixSubTimestamp)
									for (var ij = 0; ij < tracks[subIj].cues.length; ij++) {
										const cue = tracks[subIj].cues[ij]
										cue.startTime = cue.startTime - subtitleStartDiff
										cue.endTime = cue.endTime - subtitleStartDiff
									}
									video.enableAudioTranscode()
								}

								if (tracks[subIj] && tracks[subIj].cues && tracks[subIj].cues.length) {
									fixSubTimestamp()
								} else {
									tracks[subIj].on('loadeddata', fixSubTimestamp)
								}
							}
							selectedSubtitle = subIj

						}

					}
				} else {
					if (!newSub.active) {
						if (subFound) {
							if (manualSubDelay) {
								if (tracks[subIj] && tracks[subIj].cues && tracks[subIj].cues.length) {
									for (var ij = 0; ij < tracks[subIj].cues.length; ij++) {
										const cue = tracks[subIj].cues[ij]
										cue.startTime = cue.startTime - manualSubDelay
										cue.endTime = cue.endTime - manualSubDelay
									}

									manualSubDelay = 0
									oldManualSubDelay = 0

								}
							}
							if (selectedSubtitle == subIj) {
								selectedSubtitle = -1
							}
						}
					} else {
						if (subFound) {
							selectedSubtitle = subIj
						}
					}
				}

			}

		})

        document.getElementsByClassName('vjs-control-bar')[0].classList.add('vjs-control-bar-with-subs')

	    var doubleClick = function doubleClick(event) {

	      // When controls are disabled, hotkeys will be disabled as well
	      if (video.controls()) {

	      	const pEl = video.el()

	        // Don't catch clicks if any control buttons are focused
	        var activeEl = event.relatedTarget || event.toElement || document.activeElement;

	        if (activeEl == pEl ||
	            activeEl == pEl.querySelector('.vjs-tech') ||
	            activeEl == pEl.querySelector('.iframeblocker') ||
	            activeEl == pEl.querySelector('.vjs-title-bar-content') ||
	            activeEl == pEl.querySelector('.video-container-hold') ||
	            activeEl == document.querySelector('.paper-dialog-0') ||
	            activeEl.tagName == 'BODY') {

	            if (video.isFullscreen()) {
	              video.exitFullscreen();
	            } else {
	              video.requestFullscreen();
	            }
	        }
	      }
		}

	    var mouseScroll = function mouseScroll(event) {
	      // When controls are disabled, hotkeys will be disabled as well
	      if (video.controls()) {

            event = window.event || event;

			var x = event.clientX, y = event.clientY,
			    activeEl = document.elementFromPoint(x, y);

	        const pEl = video.el()
	        if (activeEl == pEl ||
	            activeEl == pEl.querySelector('.vjs-tech') ||
	            activeEl == pEl.querySelector('.iframeblocker') ||
	            activeEl == pEl.querySelector('.vjs-control-bar') ||
	            activeEl == pEl.querySelector('.vjs-title-bar-content') ||
	            activeEl == pEl.querySelector('.video-container-hold')) {

	            var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
	            event.preventDefault();

	            if (delta == 1) {
				  	var newVolume = video.volume() + 0.01
				  	if (newVolume > 1) newVolume = 1
					video.volume(newVolume)
					player.notify('Volume ' + Math.floor(newVolume * 100) + '%')
	            } else if (delta == -1) {
				  	var newVolume = video.volume() - 0.01
				  	if (newVolume < 0) newVolume = 0
					video.volume(newVolume)
					player.notify('Volume ' + Math.floor(newVolume * 100) + '%')
	            }
	        }
	      }
	    }

	    const videoContainerHold = document.getElementsByClassName('video-container-hold')[0]

	    videoContainerHold.addEventListener('dblclick', doubleClick)
//        document.querySelector('video').addEventListener('dblclick', doubleClick)
	    videoContainerHold.addEventListener('mousewheel', mouseScroll)
	    videoContainerHold.addEventListener('DOMMouseScroll', mouseScroll)


		var timeout;
		var lastTap = 0;

		document.querySelector('video').addEventListener('touchend', function(event) {
		    var currentTime = new Date().getTime();
		    var tapLength = currentTime - lastTap;
		    clearTimeout(timeout);
		    if (tapLength < 500 && tapLength > 0) {
		        doubleClick(event)
		        event.preventDefault();
		    } else {
		    	if (video.paused()) {
		    		video.play()
		    	} else {
		    		video.pause()
		    	}
		        timeout = setTimeout(function() {
		            clearTimeout(timeout);
		        }, 500);
		    }
		    lastTap = currentTime;
		})

		const disallowBigPlayButton = () => {
			video.off('timeupdate', disallowBigPlayButton)
			document.getElementById('video').classList.remove('allowBigPlayButton')
		}

		const attemptAutoplay = () => {
			const playPromise = video.play()
			if (!playPromise || !playPromise.then || !playPromise.catch) {
				return
			}
			return playPromise.catch((e) => {
				// could not autoplay, showing play button
				console.log('autoplay fail')
				console.log(e)
				if (e && e.name && e.name == 'AbortError') {
					// presume autoplay failed, show play button
					document.getElementById('video').classList.add('allowBigPlayButton')
					video.on('timeupdate', disallowBigPlayButton)
				}
			})
		}

		video.on('loadstart', attemptAutoplay)

		document.querySelector('.vjs-control-bar .vjs-play-control').addEventListener('focus', () => {
			document.querySelector('.vjs-control-bar .vjs-play-control').blur()
		})

		// for samsung browser, tizen is also used on some phones,
		// it can be based on either mozilla or opera, if this breaks
		// other cases, we should check UA for "SMART-TV; Linux; Tizen"
		// instead of just "Tizen"
		// References:
		// Tizen UAs: http://www.webapps-online.com/online-tools/user-agent-strings/dv/operatingsystem589958/tizen
		// TV Browser UAs: https://udger.com/resources/ua-list/device-detail?device=Smart%20TV

		const forceVideoVisibility = JSON.parse(localStorage.getItem('forceVideoVisibility'))

		if (detectBrowser.isTizen && document.querySelector('.video-container'))
			document.querySelector('.video-container').style.opacity = 1

		if (document.getElementById('video') && forceVideoVisibility) {
			// aditional css styles for better video visibility
			// might not be needed, might also break Aspect Ratio, Crop, Zoom settings
			// this class also forces the Tizen hack from above
			document.getElementById('video').classList.add('force-visibility')
		}

	},

	toggleSetting: (idx, closeSettings) => {

		const settingName = AdvancedSettingsMenu[idx]

		const subMenuSettings = subSettings[settingName]

		function closeSettingsModal() {
			settingsModals.forEach((el, ij) => {
				el.close()
			})

			settingsModals = []
		}

		if (settingsModals.length || closeSettings) {
			closeSettingsModal()
			return
		}

	      if (document.getElementsByClassName('vjs-lock-showing').length) {
	        document.getElementsByClassName('vjs-lock-showing')[0].classList.remove('vjs-lock-showing')
	      }

		function openSettingsModal() {

			const oldValue = video.getLastResize()

			window.settingSelected = (settingName, value, idx) => {
				if (value == -1) {
					player.toggleSetting(0, true)
				} else {
					if (settingName == 'Aspect Ratio') {
				        video.handleResize({
				            aspect: value,
				            crop: 'Default',
				            zoom: 1
				        })
					} else if (settingName == 'Crop') {
						video.handleResize({
							aspect: 'Default',
							crop: value,
							zoom: 1
						})
					} else if (settingName == 'Zoom') {
						video.handleResize({
							aspect: 'Default',
							crop: 'Default',
							zoom: value
						})
					} else if (settingName == 'Subtitle Delay') {
						manualSubDelay = value/1000
						setSubtitleDelay(manualSubDelay)
					} else if (settingName == 'Audio Delay') {
						video.setAudioDelay(value/1000)
					}
					document.querySelector('.playlistItemSelected').classList.remove('playlistItemSelected')
					document.getElementsByClassName('playlistItem')[idx].classList.add('playlistItemSelected')
				}
			}

			const ModalDialog = videojs.getComponent('ModalDialog');

			const modalIdx = settingsModals.length

			settingsModals.push(new ModalDialog(video, {
				description: 'settings dialog',
				label: 'settings',
				uncloseable: true,
				pauseOnOpen: false,
				keepControls: true
			}))

			const settingsModal = settingsModals[modalIdx]

			settingsModal.addClass('settingsModal')

			video.addChild(settingsModal)

			settingsModal.on('modalopen', function() {
	          let newSetting = ''
              newSetting += '<div class="playlistItem" onClick="window.settingSelected(\''+settingName+'\', -1, 0)" onmouseover="window.player.freezeControlbar()" onmouseleave="window.player.unfreezeControlbar()">Close Menu</div>'
		      if (subMenuSettings && subMenuSettings.length) {
		      	const oldValue = video.getLastResize()

		        subMenuSettings.forEach((fl, ij) => {
			      	let selected = false

			      	if (settingName == 'Aspect Ratio') {
			      		if (oldValue.aspect == fl) {
			      			selected = true
			      		}
			      	} else if (settingName == 'Crop') {
			      		if (oldValue.crop == fl) {
			      			selected = true
			      		}
			      	} else if (settingName == 'Zoom') {
			      		if (oldValue.zoom == fl[1]) {
			      			selected = true
			      		}
			      	} else if (settingName == 'Subtitle Delay') {
			      		if (fl == Math.round(manualSubDelay * 1000)) {
			      			selected = true
			      		}
			      	} else if (settingName == 'Audio Delay') {
			      		if (fl == Math.round(video.getAudioDelay() * 1000)) {
			      			selected = true
			      		}
			      	}
		        	if (Array.isArray(fl)) {
		              newSetting += '<div class="playlistItem'+( selected ? ' playlistItemSelected' : '')+'" onClick="window.settingSelected(\''+settingName+'\', \''+fl[1]+'\', '+(ij+1)+')" onmouseover="window.player.freezeControlbar()" onmouseleave="window.player.unfreezeControlbar()">'+fl[0]+'</div>'
		        	} else {
		              newSetting += '<div class="playlistItem'+( selected ? ' playlistItemSelected' : '')+'" onClick="window.settingSelected(\''+settingName+'\', \''+fl+'\', '+(ij+1)+')" onmouseover="window.player.freezeControlbar()" onmouseleave="window.player.unfreezeControlbar()">'+(!isNaN(parseFloat(fl)) && isFinite(fl) ? fl + ' ms' : fl)+'</div>'
		            }
		        })
		      }
				settingsModal.contentEl().innerHTML = "<div class='playlistModalInner'>"+newSetting+"</div>"
			})

			settingsModal.open()

		}

		openSettingsModal()
	},

	togglePlaylist: (torrent, file, closePlaylist) => {


		function closePlaylistModal() {
			playlistModals.forEach((el, ij) => {
				el.close()
			})

			playlistModals = []
		}

		if (playlistModals.length || closePlaylist) {
			closePlaylistModal()
			return
		}

	      if (document.getElementsByClassName('vjs-lock-showing').length) {
	        document.getElementsByClassName('vjs-lock-showing')[0].classList.remove('vjs-lock-showing')
	      }

		function openPlaylistModal() {

			const ModalDialog = videojs.getComponent('ModalDialog');

			const modalIdx = playlistModals.length

			playlistModals.push(new ModalDialog(video, {
				description: 'playlist dialog',
				label: 'playlist',
				uncloseable: true,
				pauseOnOpen: false,
				keepControls: true
			}))

			const playlistModal = playlistModals[modalIdx]

			playlistModal.addClass('playlistModal')

			video.addChild(playlistModal)

			playlistModal.on('modalopen', function() {
	          let newPlaylist = ''
		      if (torrent && torrent.files) {
		        torrent.files.forEach((fl, ij) => {
		          if (fl.streamable) {
		            newPlaylist += '<div class="playlistItem'+(fl.id == file.id ? ' playlistItemSelected' : '')+'" onClick="player.playFile('+fl.id+')" onmouseover="window.player.freezeControlbar()" onmouseleave="window.player.unfreezeControlbar()">'+player.filename2title(fl.name)+'</div>'
		          }
		        })
		      }
				playlistModal.contentEl().innerHTML = "<div class='playlistModalInner'>"+newPlaylist+"</div>"
			})

			playlistModal.open()

		}

		openPlaylistModal()

	},

	notify: (msg) => {

		function closeNotifModal() {
			notifModals.forEach((el, ij) => {
				el.close()
			})

			notifModals = []
		}

		function openNotifModal() {

			notifModalClosing = setTimeout(() => {
				Array.from(document.getElementsByClassName('notifModal')).forEach(function(el) {
					el.classList.add('closingNotifModal')
				})
				notifModalClosing = setTimeout(() => {
					notifModalClosing = false
					closeNotifModal()
				}, 3001)
			}, 2000)

			const ModalDialog = videojs.getComponent('ModalDialog');

			const modalIdx = notifModals.length

			notifModals.push(new ModalDialog(video, {
				description: 'notification dialog',
				label: 'notif',
				uncloseable: true,
				pauseOnOpen: false,
				keepControls: true
			}))

			const notifModal = notifModals[modalIdx]

			notifModal.addClass('notifModal')

			video.addChild(notifModal)

			notifModal.on('modalopen', function() {
				notifModal.contentEl().innerHTML = "<div class='notifModalInner'>"+msg+"</div>"
			})

			notifModal.open()

		}

		if (notifModals.length) {
			if (notifModalClosing) {
				clearTimeout(notifModalClosing)
				notifModalClosing = false
			}
			closeNotifModal()
			openNotifModal()
		} else {
			openNotifModal()
		}

	},

	probeConfig: (parsed, prefQuality) => {

		const resPresets = [{
			height: 1080,
			width: 1920
		}, {
			height: 720,
			width: 1280
		}, {
			height: 480,
			width: 854
		}, {
			height: 360,
			width: 640
		}, {
			height: 240,
			width: 426
		}, {
			height: 144,
			width: 256
		}]

		qualities = []
		let duration = 0

	    if (parsed.format && parsed.format.duration && parsed.format.duration != 'N/A')
	      duration = parsed.format.duration

	    if (parsed.streams && parsed.streams.length) {

	      parsed.streams.some((elm) => {

	        if (elm.codec_type == 'video') {

	          if (elm.height && elm.width && !qualities.length) {
	            resPresets.some((resolution, ij) => {
	              if (elm.height >= resolution.height || elm.width >= resolution.width) {
	                for (let ijp = ij; ijp < resPresets.length; ijp++)
	                  qualities.push(resPresets[ijp].height+'p')
	                return true
	              }
	            })
	          }

	          if (!duration && elm.duration && elm.duration != 'N/A') {
	            duration = elm.duration
	            return true
	          }
	        }
	      })
	    }

	    audioSources = []

	    let audioCount = 1
	    parsed.streams.forEach((elm) => {
	    	if (elm.codec_type == 'audio') {
	    		audioSources.push({
	    			label: 'Track ' + audioCount,
	    			idx: audioCount - 1
	    		})
	    		audioCount++
	    	}
	    })

	    audioRefresh()

	    let quality

	    if (config.maxQuality()) {
	    	quality = qualities[0]
	    } else if (prefQuality && qualities.indexOf(prefQuality) > -1) {
	    	quality = prefQuality
	    } else {
	    	quality = '360p'
	    }

	    if (qualities.indexOf(quality) == -1) {
	      qualities.some((qual) => {
	        if (parseInt(qual) < parseInt(quality)) {
	          quality = qual
	          return true
	        }
	      })
	    }

	    return { qualities, quality, duration }

	},

	parsePlaylist: (torrent, files, el, isLocal, isYtdl) => {
	  let needsPlaylist = 0
	  const playlistArr = []
	  let playlistIj = -1

	  files.forEach((file, ij) => {
	    if (file.streamable) {
	      needsPlaylist++
	      playlistArr.push(file)
	      if (file.id == el.id) {
	        playlistIj = playlistArr.length -1
	      }
	    }
	  })

	  if (document.getElementsByClassName('vjs-control-bar') && document.getElementsByClassName('vjs-control-bar')[0] && document.getElementById('videoHold')) {

		  if (needsPlaylist > 1) {
		    document.getElementsByClassName('vjs-control-bar')[0].classList.add('vjs-control-bar-with-playlist')
		    document.getElementsByClassName('vjs-control-bar')[0].classList.remove('vjs-control-bar-no-playlist')
		    document.getElementById('videoHold').classList.add('videoHold-with-playlist')
		  } else {
		    document.getElementsByClassName('vjs-control-bar')[0].classList.add('vjs-control-bar-no-playlist')
		    document.getElementsByClassName('vjs-control-bar')[0].classList.remove('vjs-control-bar-with-playlist')
		    document.getElementById('videoHold').classList.remove('videoHold-with-playlist')
		  }

	  }

	  if (document.getElementsByClassName('customPrevButton') && document.getElementsByClassName('customPrevButton')[0]) {

		  if (playlistIj > 0) {
		    document.getElementsByClassName('customPrevButton')[0].classList.remove('customButtonFadded')
		  } else {
		    document.getElementsByClassName('customPrevButton')[0].classList.add('customButtonFadded')      
		  }

	  }

	  if (document.getElementsByClassName('customNextButton') && document.getElementsByClassName('customNextButton')[0]) {

		  if (playlistIj +1 < playlistArr.length) {
		    document.getElementsByClassName('customNextButton')[0].classList.remove('customButtonFadded')
		  } else {
		    document.getElementsByClassName('customNextButton')[0].classList.add('customButtonFadded')      
		  }

	  }


      video.playlistCustomPrev = () => {
        if (playlistIj > 0)
          player.modal.playFile(torrent, playlistArr[playlistIj -1], isLocal, isYtdl)
      }

      video.playlistCustomNext = () => {
        if (playlistIj +1 < playlistArr.length)
          player.modal.playFile(torrent, playlistArr[playlistIj +1], isLocal, isYtdl)
      }

	},

	preferredFormat: (meta) => {

		const meta2container = {
			'mov,mp4,m4a,3gp,3g2,mj2': 'mp4',
			'matroska,webm': 'webm',
			'ogg': 'ogv',
//			'mp3': 'mp3'
		}

		const codec2support = {
			// video:
			'h264': 'avc1.42E01E',
			'x264': 'avc1.42E01E',
			'vp8': 'vp8',
			'vp9': 'vp9',
			'theora': 'theora',

			// audio:
			'aac': 'mp4a.40.2',
			'vorbis': 'vorbis',
			'mp3': 'mp3'
		}

		const codecs = {
			video: {
				'mp4': {
					video: ['h264', 'x264'],
					audio: ['aac']
				},
				'webm': {
					video: ['vp8', 'vp9'],
					audio: ['vorbis']
				},
				'ogv': {
					video: ['theora'],
					audio: ['vorbis']
				},
			},
			audio: {
				'mp3': {
					audio: ['mp3']
				},
				'mp4': {
					audio: ['aac']
				},
				'oga': {
					audio: ['vorbis']
				}
			}
		}

		const contentTypes = {
			video: {
				'mp4': 'video/mp4',
				'webm': 'video/webm',
				'ogv': 'video/ogg',
			},
			audio: {
				'mp3': 'audio/mpeg',
				'oga': 'audio/ogg',
				'mp4': 'audio/mp4'
			}
		}

		const buildSupportTag = (container, vCodec, aCodec) => {
			return contentTypes[container] +'; codecs="' + (vCodec ? codec2support[vCodec] : '') + (aCodec ? (vCodec ? ', ' : '') + codec2support[aCodec] : '') + '"'
		}

		// const browserSupport = (container, vCodec, aCodec) => {
		// 	if ( video.canPlayType ) {
		// 		const canPlayAll = video.canPlayType( buildSupportTag(container, vCodec, aCodec) )
		// 		const canPlayVideo = video.canPlayType( buildSupportTag(container, vCodec, null) )
		// 		return container == 'mp4' ? !!(canPlayAll || canPlayVideo) : !!canPlayAll
		// 	} else {
		// 		// some older browsers don't support this at all, we should transcode anyway
		// 		return -1
		// 	}
		// }



		const codecSupport = (container, encoders) => {
			const supported = { maxHeight: 0, maxWidth: 0, needsAudio: -1, needsVideo: -1 }
			let vdInt = -1
			let audInt = -1
			meta.streams.forEach((stream) => {
				if (stream.codec_type == 'video') {
					vdInt++
					supported.maxHeight = stream.height > supported.maxHeight ? stream.height : supported.maxHeight
					supported.maxWidth = stream.width > supported.maxWidth ? stream.width : supported.maxWidth
					if (codecs[container].video.indexOf(stream.codec_name) > -1) {
						supported.needsVideo = vdInt
					}
				} else if (stream.codec_type == 'audio') {
					audInt++
					if (codecs[container].audio.indexOf(stream.codec_name) > -1) {
						supported.needsAudio = audInt
					}
				}
			})
			return supported
		}

	    const doesSupport = (format) => {
	      if ( video.canPlayType ) {
	          if (format == 'mpeg4') {
	            // Check for MPEG-4 support
	            return !!(video.canPlayType( 'video/mp4; codecs="mp4v.20.8"' ))
	          } else if (format == 'mp4') {
	            // Check for h264 support
	            return !!(video.canPlayType( 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' )
	                || video.canPlayType( 'video/mp4; codecs="avc1.42E01E"' ) )
	          } else if (format == 'webm') {
	            // Check for Webm support
	            return !!(video.canPlayType( 'video/webm; codecs="vp8, vorbis"' ))
	            // alternatively, we can can check for 'video/webm; codecs="vp9, vorbis"' too
	          } else if (format == 'ogv') {
	            // Check for Ogg support
	            return !!(video.canPlayType( 'video/ogg; codecs="theora, vorbis"' ))
	          } else {
	            return false
	          }

	          // other known values video:
	          // 'video/webm; codecs="vp9, vorbis"' (we only check for vp8 above)
	          //
	          // other known values audio:
	          // 'audio/ogg; codecs="vorbis"' ; 'audio/mp4; codecs="mp4a.40.5"', 'audio/mpeg' or 'audio/mpeg; codecs="mp3"' (these last two are mp3)
	      }
	      return false
	    }

	    let preferredFormat

	    let supported

	    if (meta && meta.format && meta.format.format_name && meta.streams && meta.streams.length) {
	    	// check supported
	    	const trySupport = meta2container[meta.format.format_name]

	    	if (trySupport && doesSupport(trySupport)) {
	    		supported = codecSupport(trySupport)
	    		if (supported.needsVideo > -1 || supported.needsAudio > -1) {
	    			// we set the container to the original then
	    			// as we will not transcode audio or video
	    			// here depending on circumstances
					preferredFormat = trySupport
				}
			}

	    }

	    if (!preferredFormat) {
		    const formats = ['mp4', 'webm', 'ogv']
		    formats.some((el) => {
		      if (doesSupport(el)) {
		        preferredFormat = el
		        return true
		      }
		    })
			supported = codecSupport(preferredFormat)
		}

		return {
			container: preferredFormat,
			needsAudio: supported.needsAudio,
			needsVideo: supported.needsVideo,
			maxHeight: supported.maxHeight,
			maxWidth: supported.maxWidth,
			contentType: contentTypes[preferredFormat]
		}

	},

	filename2title: (filename) => {
		const ext = filename.split('.').pop()
		return filename.replace(new RegExp('\.' + ext + '$', 'g'), '').replace(/\./g, ' ')
	},

	startForQuality: (torrent, el, prefQuality, startTime, preferredFormat, parseUrl, cb, isLocal, isYtdl) => {

		const newSrc = []

		let srcList = []

		const playerType = video.currentType()

		let dedicatedSrc

    	const copyts = config.copyts()

    	const forceTranscode = config.alwaysTranscode()

    	if (preferredFormat.isAudio) {
    		// audio file
    		qualities = ['audio']
    	}

		qualities.forEach((elm) => {

		  if (isMatroska && !config.useMatroska()) {
		  	isMatroska = false
		  }

	      const srcs = []

	      if (preferredFormat.container == 'all') {

			_.each(browserSupport.contentTypes.video, (contentType, format) => {

				const audioCodec = browserSupport.containerCodecs.video[format].audio[0]
				const videoCodec = browserSupport.containerCodecs.video[format].video[0]

				const webStreamQual = parseUrl({ type: window.location.origin + '/web/' + torrent.infoHash + '/' + el.id + '/' + elm + '.' + format }).substr(1) + '&maxHeight='+ preferredFormat.maxHeight + '&maxWidth='+ preferredFormat.maxWidth + '&needsAudio=' + preferredFormat.needsAudio + '&needsVideo=' + preferredFormat.needsVideo + '&a=' + audioCodec + '&v=' + videoCodec + '&forAudio=' + preferredFormat.forAudio + '&copyts=' + (copyts ? '1' : '-1') + '&forceTranscode=' + (forceTranscode ? '1' : '-1') + '&useMatroska=' + (isMatroska && !preferredFormat.isAudio ? '1' : '-1') + '&audioDelay=' + preferredFormat.audioDelay + (startTime ? '&start=' + startTime : '') + (isLocal ? '&isLocal=1' : '') + (isYtdl ? '&isYtdl=1' : '')

				if (playerType && playerType == contentType && prefQuality == elm) {
					dedicatedSrc = {
						src: webStreamQual,
						type: contentType
					}
				} else {

					srcs.push({
						src: webStreamQual,
						type: contentType
					})
				}
	      	})

		  } else {

		  	let audioCodec
		  	let videoCodec

		  	if (preferredFormat.isAudio) {
				audioCodec = preferredFormat.audio || browserSupport.containerCodecs.audio[preferredFormat.container].audio[0]
		  	} else {

				audioCodec = preferredFormat.audio || browserSupport.containerCodecs.video[preferredFormat.container].audio[0]
				videoCodec = preferredFormat.video || browserSupport.containerCodecs.video[preferredFormat.container].video[0]

			}

			const webStreamQual = parseUrl({ type: window.location.origin + '/web/' + torrent.infoHash + '/' + el.id + '/' + elm + '.' + preferredFormat.container }).substr(1) + '&maxHeight='+ preferredFormat.maxHeight + '&maxWidth='+ preferredFormat.maxWidth + '&needsAudio=' + preferredFormat.needsAudio + '&needsVideo=' + preferredFormat.needsVideo + '&a=' + audioCodec + '&v=' + videoCodec + '&forAudio=' + preferredFormat.forAudio + '&copyts=' + (copyts ? '1' : '-1') + '&forceTranscode=' + (forceTranscode ? '1' : '-1') + '&useMatroska=' + (isMatroska && !preferredFormat.isAudio ? '1' : '-1') + '&audioDelay=' + preferredFormat.audioDelay + (startTime ? '&start=' + startTime : '') + (isLocal ? '&isLocal=1' : '') + (isYtdl ? '&isYtdl=1' : '')

			srcs.push({
				src: webStreamQual,
				type: browserSupport.contentTypes.video[preferredFormat.container]
			})

		  }

			newSrc.push({
				src: '//',
				label: elm,
				selected: !!(prefQuality == elm)
			})

			if (prefQuality == elm || preferredFormat.isAudio) {
				srcList = srcs
			}

		})

		if (dedicatedSrc) {
			srcList.unshift(dedicatedSrc)
		}

		srcList = srcList.map((el) => { el.qualities = newSrc; return el })

		video.src(srcList)

		const isHls = ['application/x-mpegURL', 'application/vnd.apple.mpegurl'].indexOf(video.currentType()) > -1

		if (isHls && !startTime)
			video.oldCurrentTime(0)

		const atLoad = () => {
			video.off('loadeddata', atLoad)
//			console.log('loadeddata')
			cb && cb()
		}

		video.on('loadeddata', atLoad)

//		video.on('keydown', function(e) {})

		return true
	},

	setTitle: (title) => {
		const videoTitle = player.filename2title(title)
		if (isEmbedPlayer) {
			if (!document.getElementsByClassName('vjs-title-bar-content').length) {
				video.titleBar({ title: videoTitle });
			}
			setTimeout(() => {
				document.getElementsByClassName('vjs-title-bar-content')[0].innerHTML = '<div class="videoTitle">'+videoTitle+'</div><div class="playlistButton" onmouseover="window.player.playlistButtonHover(true)" onmouseleave="window.player.playlistButtonHover(false)"><paper-icon-button style="color: white; cursor: pointer; width: 35px; height: 35px; padding: 4px; margin-top: -5px; padding-right: 0" onClick="window.player.togglePlaylist()" icon="menu" noink /></div>'
			})
		} else {
			if (document.getElementsByClassName('vjs-title-bar-content').length) {
				document.getElementsByClassName('vjs-title-bar-content')[0].innerHTML = videoTitle
			} else {
				video.titleBar({ title: videoTitle });
			}
		}
	},

	syncSubtitle: (time, subtitleDiffTime) => {

      	if (shouldSyncSubtitles) {
      		// if we're not preserving timestamp, is not hls or chrome

			subtitleStartDiff = time

			setTimeout(() => {

				const tracks = video.tech_.textTracks_
				if (tracks[0] && selectedSubtitle > -1) {

					if (tracks[selectedSubtitle] && tracks[selectedSubtitle].cues && tracks[selectedSubtitle].cues.length)
						for (var ij = 0; ij < tracks[selectedSubtitle].cues.length; ij++) {
							const cue = tracks[selectedSubtitle].cues[ij]
							cue.startTime = cue.startTime - subtitleDiffTime
							cue.endTime = cue.endTime - subtitleDiffTime
						}

				}

			})

		}
	},

	modal: {

		playFile: (torrent, file, isLocal, isYtdl) => {

			console.log('is local? ' + isLocal)

		  const oldAudioTrack = selectedAudioTrack

		  if (!video.paused()) {
		    window.fakePauseButton = true
		    video.pause()
		  }

		  if (historyInterval) {
		    clearInterval(historyInterval)
		    historyInterval = false
		  }

		  video.oldCurrentTime(0)

		  clearFrozenPlayer()

		  freezetime(0,0)

		  player.modal.open(torrent, file, null, true, window.selectedQuality, oldAudioTrack, isLocal, isYtdl)
		},

		openUrl: (url) => {
			console.log('adding:')
			console.log({
				src: url
			})
			video.src({
				src: url
			})
			video.play()
		},

		openLive: (url, title) => {

			if (document.getElementById('video') && document.getElementById('video').classList && !document.getElementById('video').classList.contains('vjs-live'))
				document.getElementById('video').classList.add('vjs-live')

			if (!video && window.player)
				video = window.player

			if (video && video.handleResize)
				video.handleResize({
					aspect: 'Default',
					crop: 'Default',
					zoom: 1
				})

			isPlayerClosed = false

			document.removeEventListener('keyup', hotkeysKeyUp)

			document.removeEventListener('keydown', hotkeysKeyDown)

			document.addEventListener('keyup', hotkeysKeyUp)

			document.addEventListener('keydown', hotkeysKeyDown)

			player.setTitle(title)

			video.src({
				src: url
			})

			video.play()

			events.emit('openPlayer', {})

		},

		open: async (torrent, file, initTime, noLoader, prefQuality, oldAudioTrack, isLocal, isYtdl) => {

			console.log('is local 2? ' + isLocal)

			if (torrent) {
				if (torrent.pid && !torrent.infoHash) {
					torrent.infoHash = torrent.pid
					if (torrent.files && torrent.files.length)
						torrent.files = torrent.files.map((plItm) => { plItm.streamable = true; return plItm })
					if (torrent.extracted && !torrent.files)
						torrent.files = [file]
				}
			}

			if (document.getElementById('video') && document.getElementById('video').classList && document.getElementById('video').classList.contains('vjs-live'))
				document.getElementById('video').classList.remove('vjs-live')

			isPlayerClosed = false

			if (isEmbedPlayer) {
				noLoader = true
			}

			oldManualSubDelay = 0
			manualSubDelay = 0

			document.removeEventListener('keyup', hotkeysKeyUp)

			document.removeEventListener('keydown', hotkeysKeyDown)

			document.addEventListener('keyup', hotkeysKeyUp)

			document.addEventListener('keydown', hotkeysKeyDown)

			  unfreezeControlbar()

			  const copyts = config.copyts()

			  let isHls = false

			  selectedSubtitle = -1

			  subtitleStartDiff = initTime || 0

			  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

			  let startTime

			  if (initTime && Number(initTime) === initTime && initTime % 1 !== 0)
			    startTime = initTime

			  const el = file

			  if (iOS) {
			    noLoader = true
			    events.emit('openPlayer', { torrent, file: el, isLocal: isLocal || false, isYtdl: isYtdl || false })
			    video.requestFullscreen()
			  }

			  let canceledLoading = false

			  if (!noLoader) {
			    modals.open('loading')

				const didCancel = () => {
					events.off('canceledLoading', didCancel)
					canceledLoading = true

					video.pause()
					if (video.oldCurrentTime)
						video.oldCurrentTime(0)
					clearFrozenPlayer()
				}

				events.on('canceledLoading', didCancel)

			  }

			  player.setTitle(el.name)

			  const playlistObj = player.parsePlaylist(torrent, torrent.files, el, isLocal, isYtdl)

			  const parsed = await api.get({ type: '/meta/'+torrent.infoHash+'/'+el.id, json: true })

			  if (!file || file.id != el.id) return

			  if (parsed) {

//			    console.log('meta')
//			    console.log(parsed)

			    const videoSettings = player.probeConfig(parsed, prefQuality)

			    const duration = videoSettings.duration

			    if (document.getElementsByClassName('vjs-control-bar') && document.getElementsByClassName('vjs-control-bar')[0]) {
					if (duration && duration > 3600) {
						document.getElementsByClassName('vjs-control-bar')[0].classList.add('hour-long-video')
					} else {
						document.getElementsByClassName('vjs-control-bar')[0].classList.remove('hour-long-video')
					}
				}

			    const qualities = videoSettings.qualities

			    window.selectedQuality = videoSettings.quality

				video.qualityChange = (label, startAtTime) => {

					window.selectedQuality = label

					const time = startAtTime == -1 ? 0 : video.currentTime()

					freezetime(time, time / video.duration())

					let subtitleDiffTime = time > lastTime ? (time - lastTime) : ((lastTime - time) * (-1))

					lastTime = time

					player.syncSubtitle(time, subtitleDiffTime)

					player.startForQuality(torrent, el, label, time, preferredFormat, api.parseUrl, null, isLocal, isYtdl)

				}

				video.audioChange = (idx) => {
			        selectedAudioTrack = idx
					preferredFormat.forAudio = idx
					video.qualityChange(window.selectedQuality)
			        audioRefresh()
				}

				video.getAudioDelay = () => {
					return preferredFormat.audioDelay
				}

				video.setAudioDelay = (newAudioDelay) => {
					preferredFormat.audioDelay = newAudioDelay
					const copyts = config.copyts()
			  		const isHls = ['application/x-mpegURL', 'application/vnd.apple.mpegurl'].indexOf(video.currentType()) > -1
				  	shouldSyncSubtitles = preferredFormat.isAudio ? true : !!((preferredFormat.audioDelay && !isHls) || (!isHls && !isMatroska && !copyts))
				  	console.log('should sync subtitles: ' + shouldSyncSubtitles)
				  	video.qualityChange(window.selectedQuality)
				}

				video.nextAudioTrack = () => {
					if (preferredFormat.audioCount == 1) {
						player.notify('Audio Track 1')
					} else {
						let newTrack = (preferredFormat.forAudio > -1 ? preferredFormat.forAudio : 0) +1

						if (newTrack > preferredFormat.audioCount)
							newTrack = 0

						video.audioChange(newTrack)
						player.notify('Audio Track ' + (newTrack + 1))
					}
				}

				video.findSelectedSub = () => {
					const tracks = video.tech_.textTracks_
					if (tracks[0]) {
						for (var ij = 0; tracks[ij]; ij++) {
							if (tracks[ij].mode == 'showing') {
								selectedSubtitle = ij
								break;
							}
						}
					}
				}

				video.enableAudioTranscode = () => {
					if (preferredFormat.forAudio == -1 && preferredFormat.needsAudio > -1) {
						video.audioChange(0)
					}
				}

				video.replayAction = () => {
					video.qualityChange(window.selectedQuality, -1)
				}

			    video.endedHandle = () => {
			      if (historyInterval) {
			        clearInterval(historyInterval)
			        historyInterval = false
			      }
				  if (video && video.theDuration) {
				      api.get({ method: 'updateHistory', filename: el.name, time: 0, duration: video.theDuration, infohash: torrent.infoHash, fileID: el.id, ended: true, isLocal: isLocal ? '1' : undefined, isYtdl: isYtdl ? '1' : undefined })
				  }
			      video.playlistCustomNext()
			      clearFrozenPlayer()
			    }

			    video.togglePlaylist = player.togglePlaylist.bind(null, torrent, file)

			    video.closePlaylist = player.togglePlaylist.bind(null, null, null, true)

			    video.closeSettings = player.toggleSetting.bind(null, null, true)

			    window.shouldStopVideoIfCancel = true

			    const showVideo = () => {
			      if (canceledLoading) return

			      if (!noLoader || isEmbedPlayer)
			        modals.close()

			      delete window.shouldStopVideoIfCancel

			      if (!iOS) {
					events.emit('openPlayer', { torrent, file: el, isLocal: isLocal || false, isYtdl: isYtdl || false })
				  }

		  		  isHls = ['application/x-mpegURL', 'application/vnd.apple.mpegurl'].indexOf(video.currentType()) > -1

		  		  if (isHls) {
		  		  	// workaround for hls start position issue
		  		  	setTimeout(function() {
		  		  		if (video.currentTime() > 3)
				  		  	video.oldCurrentTime(0)
		  		  	}, 2000)
		  		  } else {

				//      video.off('timeupdate', showVideo)
					  if (video.paused())
					      video.play()

				  }

//				  console.log('is HLS: ' + isHls)
//				  console.log('is Matroska: ' + isMatroska)
//				  console.log('is copyts: ' + copyts)

				  if (!isHls && !isMatroska && !copyts)
				  	shouldSyncSubtitles = true

				  console.log('initial shouldSyncSubtitles: ' + shouldSyncSubtitles)

			      if (historyInterval)
			        clearInterval(historyInterval)

			      const updateHistory = function() {
			        const currentTime = video.currentTime()
			        if (currentTime && video.theDuration)
			          api.get({ method: 'updateHistory', filename: el.name, time: currentTime, duration: video.theDuration, infohash: torrent.infoHash, fileID: el.id, ended: false, isLocal: isLocal ? '1' : undefined, isYtdl: isYtdl ? '1' : undefined })
			      }

			      historyInterval = setInterval(updateHistory, 5000) // update history every 5s

			      updateHistory()

			      const textTracks = video.remoteTextTracks()

			      if (textTracks.length) {

			        let track = textTracks.length

			        while (track--)
			          video.removeRemoteTextTrack(textTracks[track])

//			        document.getElementsByClassName('vjs-control-bar')[0].classList.remove('vjs-control-bar-with-subs')
			      }

			      if (config.subSearch() && !isAudio && !isYtdl) {
				      setTimeout(() => {
				        api.findSubs(torrent, el, (subs) => {
				          if (subs && subs.length) {
	//			            document.getElementsByClassName('vjs-control-bar')[0].classList.add('vjs-control-bar-with-subs')

	//			            subs.forEach((sub) => {
	//			              video.addRemoteTextTrack(subs[0], false)
	//			            })

							const preferredSubtitle = JSON.parse(localStorage.getItem('preferredSubtitle'))
							let alreadySelected = false

				            subs.forEach((sub) => {

				            	if (preferredSubtitle && !alreadySelected && sub.label == preferredSubtitle) {
				            		sub.default = true
				            		alreadySelected = true
				            	}

				        		video.addRemoteTextTrack(sub, false)

				            })

				            if (alreadySelected)
				            	video.findSelectedSub()

				            player.notify('Subtitles Found')
				          } else {
				            player.notify('No Subtitles Found')
				          }
				        })
				      })
				  }
			    }

			//    video.on('timeupdate', showVideo)

				video.playFile = (flId) => {
					player.togglePlaylist()
					if (torrent && torrent.files) {
						torrent.files.some((fl) => {
							if (fl.id == flId) {
								player.modal.playFile(torrent, fl, isLocal, isYtdl)
								return true
							}
						})
					}
				}

			    video.duration = function() { return video.theDuration }

			    video.start = 0;

			    if (!video.oldCurrentTime)
			      video.oldCurrentTime = video.currentTime;

			    let lastTime = startTime || 0

			    const isAudio = browserSupport.isAudio(parsed)

			    if (document.getElementById('video') && document.getElementById('video').classList) {
				    if (isAudio) {
						if (!document.getElementById('video').classList.contains('vjs-audio-file'))
							document.getElementById('video').classList.add('vjs-audio-file')
				    } else {
						if (document.getElementById('video').classList.contains('vjs-audio-file'))
							document.getElementById('video').classList.remove('vjs-audio-file')
				    }
				}

			    const preferredFormat = browserSupport.isSupported(parsed, null, config.maxCompatibility())

			    if (config.alwaysTranscode()) {
					preferredFormat.needsAudio = -1
					preferredFormat.needsVideo = -1
					preferredFormat.maxHeight = 0
					preferredFormat.maxWidth = 0
					preferredFormat.audio = ''
					preferredFormat.video = ''
			    }

			    if (typeof oldAudioTrack !== 'undefined' && preferredFormat.audioCount > oldAudioTrack) {
			    	selectedAudioTrack = oldAudioTrack
			    	preferredFormat.forAudio = oldAudioTrack
			    } else {
				    selectedAudioTrack = preferredFormat.needsAudio
				}

			    audioRefresh()

			    console.log('preferred stuff')
			    console.log(preferredFormat)

				let seekOnce = true

				video.addCustomSub = function(localPath) {
					console.log('add custom sub')
					console.log(newSub)
					const newSub = {
						src: window.location.origin + '/srt2vtt/subtitle.vtt?token=' + localStorage.getItem('token') + '&from=' + btoa(localPath),
						label: 'Custom Subtitle',
						default: true
					}
		            video.addRemoteTextTrack(newSub, false)
					video.findSelectedSub()
				}

			    video.currentTime = function(time) {

			      if (time == undefined)
			          return video.oldCurrentTime() + (shouldSyncSubtitles || preferredFormat.isAudio ? lastTime : 0)

			      if (!seekOnce) return

			      seekOnce = false

			      setTimeout(() => { seekOnce = true }, 250)

			      let subtitleDiffTime

				  if (shouldSyncSubtitles || preferredFormat.isAudio) {
					  subtitleDiffTime = time > lastTime ? (time - lastTime) : ((lastTime - time) * (-1))

				      lastTime = time
				  }

			      freezetime(time, time / video.duration())

				  if (shouldSyncSubtitles) {

					  player.syncSubtitle(time, subtitleDiffTime)

				  }

			      player.startForQuality(torrent, el, window.selectedQuality, time, preferredFormat, api.parseUrl, null, isLocal, isYtdl)

			      return this
			    }

			    restartOnFail = 3

			    restartPerType = {}

			    video.errorHandle = (err) => {
			      console.log('PLAYER ERROR')
			      console.log(err)

			      const videoType = video.currentSource().type

			      const nextType = () => {
			      	if (video.currentSources().length > 1) {
				      	const sources = video.currentSources()
				      	sources.shift()
				      	setTimeout(() => {
					      	video.src(sources)
					    })
					}
			      }

			      if (typeof restartPerType[videoType] === 'undefined')
			      	restartPerType[videoType] = restartOnFail

			      if (!restartPerType[videoType]) {
			      	nextType()
			      	return
			      }

//			      if (typeof window.frozenTime != 'undefined') {
			        restartPerType[videoType]--
			        console.log('RESTARTING VIDEO')

			      	const sources = video.currentSources()

			      	console.log(sources)

			        video.src(sources)

//			        player.startForQuality(torrent, el, window.selectedQuality, window.frozenTime, preferredFormat, api.parseUrl, null, isLocal, isYtdl)

			        setTimeout(function() {
			          video.play();
			        }, 100);
//			      }
			    }

			    player.startForQuality(torrent, el, window.selectedQuality, startTime, preferredFormat, api.parseUrl, () => {
			      showVideo()
			    }, isLocal, isYtdl)

			    startTime = false

			    if (duration)
			      video.theDuration = Math.floor(duration);

				video.playlistButtonHover = (value) => {
					window.playlistButtonHovered = value
				}

				video.freezeControlbar = freezeControlbar

				video.unfreezeControlbar = unfreezeControlbar

				window.player = video

			  	let lastResize

			  	video.getLastResize = () => {
			  		return lastResize
			  	}

			    video.handleResize = (obj) => {
			    	if (!obj && !lastResize) return
			    	if (!obj) {
			    		obj = lastResize
			    	} else {
			    		lastResize = obj
			    	}
			        var canvas = document.getElementById('video_html5_api');
			        var canvasParent = document.getElementsByClassName('video-container')[0];
			        var container = document.getElementById('video');

			        // first reset all values

			        canvasParent.style.width = "100%";
			        canvasParent.style.height = "100%";

		            canvas.style.height = "100%";
		            canvas.style.width = "100%";

		            canvas.style['object-fit'] = "contain"

			        var width = preferredFormat.maxWidth;
			        var height = preferredFormat.maxHeight;
			        var sourceAspect = width / height;
			        var res
			        var ratio

			        if (obj.aspect != "Default" && obj.aspect.indexOf(":") > -1) {
			            canvas.style['object-fit'] = "fill"
			            res = obj.aspect.split(":");
			            ratio = gcd(width, height);
			        }

			        var destAspect = container.clientWidth / container.clientHeight;

			        if (ratio) sourceAspect = (ratio * parseFloat(res[0])) / (ratio * parseFloat(res[1]));
			        else sourceAspect = width / height;

			        if (obj.crop != "Default" && obj.crop.indexOf(":") > -1) {
			            canvas.style['object-fit'] = "cover"
			            res = obj.crop.split(":");
			            ratio = gcd(width, height);
			            sourceAspect = (ratio * parseFloat(res[0])) / (ratio * parseFloat(res[1]));
			        }

			        var cond = destAspect > sourceAspect;

			        if (obj.crop != "Default" && obj.crop.indexOf(":") > -1) {
			            if (cond) {
			                canvasParent.style.height = "100%";
			                canvasParent.style.width = (((container.clientHeight * sourceAspect) / container.clientWidth) * 100) + "%";
			            } else {
			                canvasParent.style.height = (((container.clientWidth / sourceAspect) / container.clientHeight) * 100) + "%";
			                canvasParent.style.width = "100%";
			            }
			            sourceAspect = width / height;
			            var futureWidth = (((canvasParent.offsetHeight * sourceAspect) / canvasParent.offsetWidth) * canvasParent.offsetWidth);
			            if (futureWidth < canvasParent.offsetWidth) {
			                sourceAspect = canvas.height / canvas.width;
			                canvas.style.width = canvasParent.offsetWidth + "px";
			                canvas.style.height = (((canvasParent.offsetWidth * sourceAspect) / canvasParent.offsetHeight) * canvasParent.offsetHeight) + "px";
			            } else {
			                canvas.style.height = canvasParent.offsetHeight + "px";
			                canvas.style.width = (((canvasParent.offsetHeight * sourceAspect) / canvasParent.offsetWidth) * canvasParent.offsetWidth) + "px";
			            }
			        } else {
			        	if (!res && obj.zoom > 1) {
			        		canvasParent.style.height = '100%'
			        		canvasParent.style.width = '100%'
				            canvas.style.height = (100 * obj.zoom) + "%";
				            canvas.style.width = (100 * obj.zoom) + "%";
			        	} else {
				            if (cond) {
				                canvasParent.style.height = (100 * obj.zoom) + "%";
				                canvasParent.style.width = (((container.clientHeight * sourceAspect) / container.clientWidth) * 100 * obj.zoom) + "%";
				            } else {
				                canvasParent.style.height = (((container.clientWidth / sourceAspect) / container.clientHeight) * 100 * obj.zoom) + "%";
				                canvasParent.style.width = (100 * player.zoom) + "%";
				            }
				            canvas.style.height = "100%";
				            canvas.style.width = "100%";
				        }
			        }

			    }

				video.handleResize({
					aspect: 'Default',
					crop: 'Default',
					zoom: 1
				})

			  }

		},

		close: () => {

			if (isPlayerClosed)
				return

			isPlayerClosed = true

			document.removeEventListener('keyup', hotkeysKeyUp)

			document.removeEventListener('keydown', hotkeysKeyDown)

			if (!video)
				video = window.player

			video.pause()

			const isHls = ['application/x-mpegURL', 'application/vnd.apple.mpegurl'].indexOf(video.currentType()) > -1

			if (!isHls && video.oldCurrentTime)
				video.oldCurrentTime(0)

			clearFrozenPlayer()

			if (historyInterval) {
				clearInterval(historyInterval)
				historyInterval = false
			}

			events.emit('closePlayer')

		}

	}


}

export default player
