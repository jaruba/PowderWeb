/**
 * videojs-overlay
 * @version 2.1.0
 * @copyright 2018 Brightcove, Inc.
 * @license Apache-2.0
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('video.js')) :
	typeof define === 'function' && define.amd ? define(['video.js'], factory) :
	(global.videojsOverlay = factory(global.videojs));
}(this, (function (videojs) { 'use strict';

videojs = videojs && videojs.hasOwnProperty('default') ? videojs['default'] : videojs;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof commonjsGlobal !== "undefined") {
    win = commonjsGlobal;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

var window_1 = win;

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};











var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var defaults = {
  align: 'top-left',
  class: '',
  content: 'This overlay will show up while the video is playing',
  debug: false,
  showBackground: true,
  attachToControlBar: false,
  overlays: [{
    start: 'playing',
    end: 'paused'
  }]
};

var Component = videojs.getComponent('Component');

var dom = videojs.dom || videojs;
var registerPlugin = videojs.registerPlugin || videojs.plugin;

/**
 * Whether the value is a `Number`.
 *
 * Both `Infinity` and `-Infinity` are accepted, but `NaN` is not.
 *
 * @param  {Number} n
 * @return {Boolean}
 */

/* eslint-disable no-self-compare */
var isNumber = function isNumber(n) {
  return typeof n === 'number' && n === n;
};
/* eslint-enable no-self-compare */

/**
 * Whether a value is a string with no whitespace.
 *
 * @param  {String} s
 * @return {Boolean}
 */
var hasNoWhitespace = function hasNoWhitespace(s) {
  return typeof s === 'string' && /^\S+$/.test(s);
};

/**
 * Overlay component.
 *
 * @class   Overlay
 * @extends {videojs.Component}
 */

var Overlay = function (_Component) {
  inherits(Overlay, _Component);

  function Overlay(player, options) {
    classCallCheck(this, Overlay);

    var _this = possibleConstructorReturn(this, _Component.call(this, player, options));

    ['start', 'end'].forEach(function (key) {
      var value = _this.options_[key];

      if (isNumber(value)) {
        _this[key + 'Event_'] = 'timeupdate';
      } else if (hasNoWhitespace(value)) {
        _this[key + 'Event_'] = value;

        // An overlay MUST have a start option. Otherwise, it's pointless.
      } else if (key === 'start') {
        throw new Error('invalid "start" option; expected number or string');
      }
    });

    // video.js does not like components with multiple instances binding
    // events to the player because it tracks them at the player level,
    // not at the level of the object doing the binding. This could also be
    // solved with Function.prototype.bind (but not videojs.bind because of
    // its GUID magic), but the anonymous function approach avoids any issues
    // caused by crappy libraries clobbering Function.prototype.bind.
    // - https://github.com/videojs/video.js/issues/3097
    ['endListener_', 'rewindListener_', 'startListener_'].forEach(function (name) {
      _this[name] = function (e) {
        return Overlay.prototype[name].call(_this, e);
      };
    });

    // If the start event is a timeupdate, we need to watch for rewinds (i.e.,
    // when the user seeks backward).
    if (_this.startEvent_ === 'timeupdate') {
      _this.on(player, 'timeupdate', _this.rewindListener_);
    }

    _this.debug('created, listening to "' + _this.startEvent_ + '" for "start" and "' + (_this.endEvent_ || 'nothing') + '" for "end"');

    _this.hide();
    return _this;
  }

  Overlay.prototype.createEl = function createEl() {
    var options = this.options_;
    var content = options.content;

    var background = options.showBackground ? 'vjs-overlay-background' : 'vjs-overlay-no-background';
    var el = dom.createEl('div', {
      className: '\n        vjs-overlay\n        vjs-overlay-' + options.align + '\n        ' + options.class + '\n        ' + background + '\n        vjs-hidden\n      '
    });

    if (typeof content === 'string') {
      el.innerHTML = content;
    } else if (content instanceof window_1.DocumentFragment) {
      el.appendChild(content);
    } else {
      dom.appendContent(el, content);
    }

    return el;
  };

  /**
   * Logs debug errors
   * @param  {...[type]} args [description]
   * @return {[type]}         [description]
   */


  Overlay.prototype.debug = function debug() {
    if (!this.options_.debug) {
      return;
    }

    var log = videojs.log;
    var fn = log;

    // Support `videojs.log.foo` calls.

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    if (log.hasOwnProperty(args[0]) && typeof log[args[0]] === 'function') {
      fn = log[args.shift()];
    }

    fn.apply(undefined, ['overlay#' + this.id() + ': '].concat(args));
  };

  /**
   * Overrides the inherited method to perform some event binding
   *
   * @return {Overlay}
   */


  Overlay.prototype.hide = function hide() {
    _Component.prototype.hide.call(this);

    this.debug('hidden');
    this.debug('bound `startListener_` to "' + this.startEvent_ + '"');

    // Overlays without an "end" are valid.
    if (this.endEvent_) {
      this.debug('unbound `endListener_` from "' + this.endEvent_ + '"');
      this.off(this.player(), this.endEvent_, this.endListener_);
    }

    this.on(this.player(), this.startEvent_, this.startListener_);

    return this;
  };

  /**
   * Determine whether or not the overlay should hide.
   *
   * @param  {Number} time
   *         The current time reported by the player.
   * @param  {String} type
   *         An event type.
   * @return {Boolean}
   */


  Overlay.prototype.shouldHide_ = function shouldHide_(time, type) {
    var end = this.options_.end;

    return isNumber(end) ? time >= end : end === type;
  };

  /**
   * Overrides the inherited method to perform some event binding
   *
   * @return {Overlay}
   */


  Overlay.prototype.show = function show() {
    _Component.prototype.show.call(this);
    this.off(this.player(), this.startEvent_, this.startListener_);
    this.debug('shown');
    this.debug('unbound `startListener_` from "' + this.startEvent_ + '"');

    // Overlays without an "end" are valid.
    if (this.endEvent_) {
      this.debug('bound `endListener_` to "' + this.endEvent_ + '"');
      this.on(this.player(), this.endEvent_, this.endListener_);
    }

    return this;
  };

  /**
   * Determine whether or not the overlay should show.
   *
   * @param  {Number} time
   *         The current time reported by the player.
   * @param  {String} type
   *         An event type.
   * @return {Boolean}
   */


  Overlay.prototype.shouldShow_ = function shouldShow_(time, type) {
    var start = this.options_.start;
    var end = this.options_.end;

    if (isNumber(start)) {

      if (isNumber(end)) {
        return time >= start && time < end;

        // In this case, the start is a number and the end is a string. We need
        // to check whether or not the overlay has shown since the last seek.
      } else if (!this.hasShownSinceSeek_) {
        this.hasShownSinceSeek_ = true;
        return time >= start;
      }

      // In this case, the start is a number and the end is a string, but
      // the overlay has shown since the last seek. This means that we need
      // to be sure we aren't re-showing it at a later time than it is
      // scheduled to appear.
      return Math.floor(time) === start;
    }

    return start === type;
  };

  /**
   * Event listener that can trigger the overlay to show.
   *
   * @param  {Event} e
   */


  Overlay.prototype.startListener_ = function startListener_(e) {
    var time = this.player().currentTime();

    if (this.shouldShow_(time, e.type)) {
      this.show();
    }
  };

  /**
   * Event listener that can trigger the overlay to show.
   *
   * @param  {Event} e
   */


  Overlay.prototype.endListener_ = function endListener_(e) {
    var time = this.player().currentTime();

    if (this.shouldHide_(time, e.type)) {
      this.hide();
    }
  };

  /**
   * Event listener that can looks for rewinds - that is, backward seeks
   * and may hide the overlay as needed.
   *
   * @param  {Event} e
   */


  Overlay.prototype.rewindListener_ = function rewindListener_(e) {
    var time = this.player().currentTime();
    var previous = this.previousTime_;
    var start = this.options_.start;
    var end = this.options_.end;

    // Did we seek backward?
    if (time < previous) {
      this.debug('rewind detected');

      // The overlay remains visible if two conditions are met: the end value
      // MUST be an integer and the the current time indicates that the
      // overlay should NOT be visible.
      if (isNumber(end) && !this.shouldShow_(time)) {
        this.debug('hiding; ' + end + ' is an integer and overlay should not show at this time');
        this.hasShownSinceSeek_ = false;
        this.hide();

        // If the end value is an event name, we cannot reliably decide if the
        // overlay should still be displayed based solely on time; so, we can
        // only queue it up for showing if the seek took us to a point before
        // the start time.
      } else if (hasNoWhitespace(end) && time < start) {
        this.debug('hiding; show point (' + start + ') is before now (' + time + ') and end point (' + end + ') is an event');
        this.hasShownSinceSeek_ = false;
        this.hide();
      }
    }

    this.previousTime_ = time;
  };

  return Overlay;
}(Component);

videojs.registerComponent('Overlay', Overlay);

/**
 * Initialize the plugin.
 *
 * @function plugin
 * @param    {Object} [options={}]
 */
var plugin = function plugin(options) {
  var _this2 = this;

  var settings = videojs.mergeOptions(defaults, options);

  // De-initialize the plugin if it already has an array of overlays.
  if (Array.isArray(this.overlays_)) {
    this.overlays_.forEach(function (overlay) {
      _this2.removeChild(overlay);
      if (_this2.controlBar) {
        _this2.controlBar.removeChild(overlay);
      }
      overlay.dispose();
    });
  }

  var overlays = settings.overlays;

  // We don't want to keep the original array of overlay options around
  // because it doesn't make sense to pass it to each Overlay component.
  delete settings.overlays;

  this.overlays_ = overlays.map(function (o) {
    var mergeOptions = videojs.mergeOptions(settings, o);
    var attachToControlBar = typeof mergeOptions.attachToControlBar === 'string' || mergeOptions.attachToControlBar === true;

    if (!_this2.controls() || !_this2.controlBar) {
      return _this2.addChild('overlay', mergeOptions);
    }

    if (attachToControlBar && mergeOptions.align.indexOf('bottom') !== -1) {
      var referenceChild = _this2.controlBar.children()[0];

      if (_this2.controlBar.getChild(mergeOptions.attachToControlBar) !== undefined) {
        referenceChild = _this2.controlBar.getChild(mergeOptions.attachToControlBar);
      }

      if (referenceChild) {
        var controlBarChild = _this2.controlBar.addChild('overlay', mergeOptions);

        _this2.controlBar.el().insertBefore(controlBarChild.el(), referenceChild.el());
        return controlBarChild;
      }
    }

    var playerChild = _this2.addChild('overlay', mergeOptions);

    _this2.el().insertBefore(playerChild.el(), _this2.controlBar.el());
    return playerChild;
  });
};

plugin.VERSION = '__VERSION__';

registerPlugin('overlay', plugin);

return plugin;

})));
