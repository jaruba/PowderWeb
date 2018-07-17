(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsSettingsMenu = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){

/**
 * @file settings-menu-button.js
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _settingsMenuItemJs = require('./settings-menu-item.js');

var _settingsMenuItemJs2 = _interopRequireDefault(_settingsMenuItemJs);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

window.noDupEvents = false

// only one instance of babel-polyfill is allowed
// when imported with other videojs plygins
// import 'babel-polyfill';

var Button = _videoJs2['default'].getComponent('Button');
var Menu = _videoJs2['default'].getComponent('Menu');
var Component = _videoJs2['default'].getComponent('Component');

var SettingsButton = (function (_Button) {
  _inherits(SettingsButton, _Button);

  function SettingsButton(player, options) {
    _classCallCheck(this, SettingsButton);

    _get(Object.getPrototypeOf(SettingsButton.prototype), 'constructor', this).call(this, player, options);

    this.playerComponent = player;
    this.dialog = this.playerComponent.addChild('settingsDialog');
    this.dialogEl = this.dialog.el_;
    this.menu = null;
    this.panel = this.dialog.addChild('settingsPanel');
    this.panelChild = this.panel.addChild('settingsPanelChild');

    this.addClass('vjs-settings');
    this.el_.setAttribute('aria-label', 'Settings Button');

    // Event handlers
    this.addSettingsItemHandler = this.onAddSettingsItem.bind(this);
    this.disposeSettingsItemHandler = this.onDisposeSettingsItem.bind(this);
    this.playerClickHandler = this.onPlayerClick.bind(this);
    this.userInactiveHandler = this.onUserInactive.bind(this);

    this.buildMenu();
    this.bindEvents();
  }

  _createClass(SettingsButton, [{
    key: 'onPlayerClick',
    value: function onPlayerClick(event) {

      if (event.target.classList.contains('vjs-settings')) {
        return;
      }

      if (!this.dialog.hasClass('vjs-hidden')) {
        this.hideDialog();
      }
    }
  }, {
    key: 'onDisposeSettingsItem',
    value: function onDisposeSettingsItem(event, name) {
      if (name === undefined) {
        var children = this.menu.children();

        while (children.length > 0) {
          children[0].dispose();
          this.menu.removeChild(children[0]);
        }

        this.dom.addClass('vjs-hidden');
      } else {
        var item = this.menu.getChild(name);

        if (item) {
          item.dispose();
          this.menu.removeChild(item);
        }
      }

      this.hideDialog();

      if (this.options_.entries.length === 0) {
        this.dom.addClass('vjs-hidden');
      }
    }
  }, {
    key: 'onAddSettingsItem',
    value: function onAddSettingsItem(event, data) {
      var _data = _slicedToArray(data, 2);

      var entry = _data[0];
      var options = _data[1];

      this.addMenuItem(entry, options);
      this.dom.removeClass('vjs-hidden');
    }
  }, {
    key: 'onUserInactive',
    value: function onUserInactive() {
      if (!this.dialog.hasClass('vjs-hidden')) {
        this.hideDialog();
      }
    }
  }, {
    key: 'bindEvents',
    value: function bindEvents() {
      this.playerComponent.on('click', this.playerClickHandler);
      this.playerComponent.on('addsettingsitem', this.addSettingsItemHandler);
      this.playerComponent.on('disposesettingsitem', this.disposeSettingsItemHandler);
      this.playerComponent.on('userinactive', this.userInactiveHandler);
    }
  }, {
    key: 'buildCSSClass',
    value: function buildCSSClass() {
      // vjs-icon-cog can be removed when the settings menu is integrated in video.js
      return 'vjs-icon-cog ' + _get(Object.getPrototypeOf(SettingsButton.prototype), 'buildCSSClass', this).call(this);
    }
  }, {
    key: 'handleClick',
    value: function handleClick() {
      if (!window.noDupEvents) {
        window.noDupEvents = true
        setTimeout(function() { window.noDupEvents = false }, 200)
      } else {
        return
      }
      this.el_.blur()
      if (document.getElementsByClassName('vjs-lock-showing').length) {
        document.getElementsByClassName('vjs-lock-showing')[0].classList.remove('vjs-lock-showing')
      }
      // main menu open
      if (this.dialog.hasClass('vjs-hidden')) {
        if (this.menu && this.menu.children_ && this.menu.children_.length) {
          this.menu.children_.forEach(function(el) {
            if (el.update) el.update()
          })
        }

        this.playerComponent.closePlaylist()
        this.playerComponent.closeSettings()

        this.showDialog();
      } else {
        this.hideDialog();
      }
    }
  }, {
    key: 'showDialog',
    value: function showDialog() {
//      console.log('show dialog')
      this.menu.el_.style.opacity = '1';
//      console.log(this.dialog)

      this.dialog.removeClass('vjs-hidden')
//      var that = this
//      setTimeout(function() {
//        if (that.dialog.hasClass('vjs-hidden'))
//          that.dialog.removeClass('vjs-hidden')
//      })
//      this.dialog.show();
      this.setDialogSize(this.getComponentSize(this.menu));
    }
  }, {
    key: 'hideDialog',
    value: function hideDialog() {
//      console.log('hide dialog')
      this.dialog.addClass('vjs-hidden')
//      this.dialog.removeClass('vjs-shown')
//      this.dialog.el_.classList.remove('vjs-shown')
//      this.dialog.hide();
      this.setDialogSize(this.getComponentSize(this.menu));
      this.menu.el_.style.opacity = '1';
      this.resetChildren();
    }
  }, {
    key: 'getComponentSize',
    value: function getComponentSize(element) {
      var width = null;
      var height = null;

      // Could be component or just DOM element
      if (element instanceof Component) {
        width = element.el_.offsetWidth;
        height = element.el_.offsetHeight;

        // keep width/height as properties for direct use
        element.width = width;
        element.height = height;
      } else {
        width = element.offsetWidth;
        height = element.offsetHeight;
      }

      return [width, height];
    }
  }, {
    key: 'setDialogSize',
    value: function setDialogSize(_ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var width = _ref2[0];
      var height = _ref2[1];

      if (typeof height !== 'number') {
        return;
      }

      var offset = this.options_.setup.maxHeightOffset;
      var maxHeight = this.playerComponent.el_.offsetHeight - offset;

      if (height > maxHeight) {
        height = maxHeight;
        width += 17;
        this.panel.el_.style.maxHeight = height + 'px';
      } else if (this.panel.el_.style.maxHeight !== '') {
        this.panel.el_.style.maxHeight = '';
      }

      this.dialogEl.style.width = width + 'px';
      this.dialogEl.style.height = height + 'px';
    }
  }, {
    key: 'buildMenu',
    value: function buildMenu() {
      this.menu = new Menu(this.player());
      this.menu.addClass('vjs-main-menu');
      var entries = this.options_.entries;

      if (entries.length === 0) {
        this.dom.addClass('vjs-hidden');
        this.panelChild.addChild(this.menu);
        return;
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var entry = _step.value;

          this.addMenuItem(entry, this.options_);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator['return']) {
            _iterator['return']();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.panelChild.addChild(this.menu);
    }
  }, {
    key: 'addMenuItem',
    value: function addMenuItem(entry, options) {
      var openSubMenu = function openSubMenu() {
        if (_videoJs2['default'].dom.hasClass(this.el_, 'open')) {
          _videoJs2['default'].dom.removeClass(this.el_, 'open');
        } else {
          _videoJs2['default'].dom.addClass(this.el_, 'open');
        }
      };

      options.name = utils.toTitleCase(entry);
      var settingsMenuItem = new _settingsMenuItemJs2['default'](this.player(), options, entry, this);

      this.menu.addChild(settingsMenuItem);

      // Hide children to avoid sub menus stacking on top of each other
      // or having multiple menus open
      settingsMenuItem.on('click', _videoJs2['default'].bind(this, this.hideChildren));

      // Wether to add or remove selected class on the settings sub menu element
      settingsMenuItem.on('click', openSubMenu);
    }
  }, {
    key: 'resetChildren',
    value: function resetChildren() {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.menu.children()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var menuChild = _step2.value;

          menuChild.reset();
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }

    /**
     * Hide all the sub menus
     */
  }, {
    key: 'hideChildren',
    value: function hideChildren() {
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.menu.children()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var menuChild = _step3.value;

          menuChild.hideSubMenu();
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3['return']) {
            _iterator3['return']();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  }]);

  return SettingsButton;
})(Button);

var SettingsPanel = (function (_Component) {
  _inherits(SettingsPanel, _Component);

  function SettingsPanel(player, options) {
    _classCallCheck(this, SettingsPanel);

    _get(Object.getPrototypeOf(SettingsPanel.prototype), 'constructor', this).call(this, player, options);
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */

  _createClass(SettingsPanel, [{
    key: 'createEl',
    value: function createEl() {
      return _get(Object.getPrototypeOf(SettingsPanel.prototype), 'createEl', this).call(this, 'div', {
        className: 'vjs-settings-panel',
        innerHTML: '',
        tabIndex: -1
      });
    }
  }]);

  return SettingsPanel;
})(Component);

var SettingsPanelChild = (function (_Component2) {
  _inherits(SettingsPanelChild, _Component2);

  function SettingsPanelChild(player, options) {
    _classCallCheck(this, SettingsPanelChild);

    _get(Object.getPrototypeOf(SettingsPanelChild.prototype), 'constructor', this).call(this, player, options);
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */

  _createClass(SettingsPanelChild, [{
    key: 'createEl',
    value: function createEl() {
      return _get(Object.getPrototypeOf(SettingsPanelChild.prototype), 'createEl', this).call(this, 'div', {
        className: 'vjs-settings-panel-child',
        innerHTML: '',
        tabIndex: -1
      });
    }
  }]);

  return SettingsPanelChild;
})(Component);

var SettingsDialog = (function (_Component3) {
  _inherits(SettingsDialog, _Component3);

  function SettingsDialog(player, options) {
    _classCallCheck(this, SettingsDialog);

    _get(Object.getPrototypeOf(SettingsDialog.prototype), 'constructor', this).call(this, player, options);
    this.hide();
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */

  _createClass(SettingsDialog, [{
    key: 'createEl',
    value: function createEl() {
      var uniqueId = this.id_;
      var dialogLabelId = 'TTsettingsDialogLabel-' + uniqueId;
      var dialogDescriptionId = 'TTsettingsDialogDescription-' + uniqueId;

      return _get(Object.getPrototypeOf(SettingsDialog.prototype), 'createEl', this).call(this, 'div', {
        className: 'vjs-settings-dialog vjs-modal-overlay',
        innerHTML: '',
        tabIndex: -1
      }, {
        'role': 'dialog',
        'aria-labelledby': dialogLabelId,
        'aria-describedby': dialogDescriptionId
      });
    }
  }]);

  return SettingsDialog;
})(Component);

SettingsButton.prototype.controlText_ = 'Settings';

Component.registerComponent('SettingsButton', SettingsButton);
Component.registerComponent('SettingsDialog', SettingsDialog);
Component.registerComponent('SettingsPanel', SettingsPanel);
Component.registerComponent('SettingsPanelChild', SettingsPanelChild);

exports.SettingsButton = SettingsButton;
exports.SettingsDialog = SettingsDialog;
exports.SettingsPanel = SettingsPanel;
exports.SettingsPanelChild = SettingsPanelChild;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./settings-menu-item.js":2,"./utils":3}],2:[function(require,module,exports){
(function (global){
/**
 * @file settings-menu-item.js
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _videoJs = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _videoJs2 = _interopRequireDefault(_videoJs);

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var MenuItem = _videoJs2['default'].getComponent('MenuItem');
var component = _videoJs2['default'].getComponent('Component');

/**
 * The specific menu item type for selecting a setting
 *
 * @param {Player|Object} player
 * @param {Object=} options
 * @param {String=} entry
 * @extends MenuItem
 * @class SettingsMenuItem
 */

// var iu = 0

var SettingsMenuItem = (function (_MenuItem) {
  _inherits(SettingsMenuItem, _MenuItem);

  function SettingsMenuItem(player, options, entry, menuButton) {
    var _this = this;

    _classCallCheck(this, SettingsMenuItem);

    _get(Object.getPrototypeOf(SettingsMenuItem.prototype), 'constructor', this).call(this, player, options);

    this.settingsButton = menuButton;
    this.dialog = this.settingsButton.dialog;
    this.mainMenu = this.settingsButton.menu;
    this.panel = this.dialog.getChild('settingsPanel');
    this.panelChild = this.panel.getChild('settingsPanelChild');
    this.panelChildEl = this.panelChild.el_;

    this.size = null;

    // keep state of what menu type is loading next
    this.menuToLoad = 'mainmenu';

    var subMenuName = utils.toTitleCase(entry);
    var SubMenuComponent = _videoJs2['default'].getComponent(subMenuName);

    if (!SubMenuComponent) {
      throw new Error('Component ' + subMenuName + ' does not exist');
    }
    this.subMenu = new SubMenuComponent(this.player(), options, menuButton, this);

    this.eventHandlers();

    player.ready(function () {
//      iu++
//      if (iu > 4) return
//      console.log(1)
      _this.build();
//      console.log(2)
      _this.reset();
//      if (iu == 4) {
//        throw new Error('dummy error')
//      }
    });
  }

  /**
   * Setup event handlers
   *
   * @method eventHandlers
   */

  _createClass(SettingsMenuItem, [{
    key: 'eventHandlers',
    value: function eventHandlers() {
      this.submenuClickHandler = this.onSubmenuClick.bind(this);
      this.transitionEndHandler = this.onTransitionEnd.bind(this);
    }
  }, {
    key: 'onSubmenuClick',
    value: function onSubmenuClick(event) {

      if (!window.noDupEvents) {
        window.noDupEvents = true
        setTimeout(function() { window.noDupEvents = false }, 200)
      } else {
        return
      }

      var _this2 = this;

      var target = null;

      if (event.type === 'tap') {
        target = event.target;
      } else {
        target = event.currentTarget;
      }

this.settingsSubMenuEl_.classList.add('vjs-hidden')

      if (target.classList.contains('vjs-back-button')) {
//        this.settingsButton.showDialog()
//console.log(this)

//this.settingsSubMenuEl_.classList.add('vjs-hidden')

        this.loadMainMenu();
        return;
      }

//      this.settingsButton.hideDialog()

      window.reloadSettingMenu = this.update

      // To update the sub menu value on click, setTimeout is needed because
      // updating the value is not instant
      setTimeout(function () {
        _this2.update(event);
      }, 0);
    }

    /**
     * Create the component's DOM element
     *
     * @return {Element}
     * @method createEl
     */
  }, {
    key: 'createEl',
    value: function createEl() {
      var el = _videoJs2['default'].dom.createEl('li', {
        className: 'vjs-menu-item'
      });

      this.settingsSubMenuTitleEl_ = _videoJs2['default'].dom.createEl('div', {
        className: 'vjs-settings-sub-menu-title'
      });

      el.appendChild(this.settingsSubMenuTitleEl_);

      this.settingsSubMenuValueEl_ = _videoJs2['default'].dom.createEl('div', {
        className: 'vjs-settings-sub-menu-value'
      });

      el.appendChild(this.settingsSubMenuValueEl_);

      this.settingsSubMenuEl_ = _videoJs2['default'].dom.createEl('div', {
        className: 'vjs-settings-sub-menu'
      });

      return el;
    }

    /**
     * Handle click on menu item
     *
     * @method handleClick
     */
  }, {
    key: 'handleClick',
    value: function handleClick() {

      if (!window.noDupEvents) {
        window.noDupEvents = true
        setTimeout(function() { window.noDupEvents = false }, 200)
      } else {
        return
      }

      var _this3 = this;

      this.update()

      var el_ = this.subMenu.menu.backEl_ || this.subMenu.menu.el_
      if (el_) {
        if (el_.children[0].children[0].textContent != 'Back to Menu') {
          this.createBackButton();
          this.bindClickEvents();
        }
      }

//      var that = this
//      setTimeout(function() {
//        that.settingsButton.setDialogSize(this.settingsButton.getComponentSize(this.settingsSubMenuEl_));
//        that.settingsButton.setDialogSize(this.size);
//      })

      this.menuToLoad = 'submenu';
      // Remove open class to ensure only the open submenu gets this class
      _videoJs2['default'].dom.removeClass(this.el_, 'open');

      _get(Object.getPrototypeOf(SettingsMenuItem.prototype), 'handleClick', this).call(this);

      this.mainMenu.el_.style.opacity = '0';
      // Wether to add or remove vjs-hidden class on the settingsSubMenuEl element
      if (_videoJs2['default'].dom.hasClass(this.settingsSubMenuEl_, 'vjs-hidden')) {
        _videoJs2['default'].dom.removeClass(this.settingsSubMenuEl_, 'vjs-hidden');

        // animation not played without timeout
        setTimeout(function () {
          _this3.settingsSubMenuEl_.style.opacity = '1';
          _this3.settingsSubMenuEl_.style.marginRight = '0px';
        }, 0);

//        this.settingsButton.setDialogSize(this.size);
        this.settingsButton.setDialogSize(this.settingsButton.getComponentSize(this.settingsSubMenuEl_));
      } else {
         _videoJs2['default'].dom.addClass(this.settingsSubMenuEl_, 'vjs-hidden');
      }

    }

    /**
     * Create back button
     *
     * @method createBackButton
     */
  }, {
    key: 'createBackButton',
    value: function createBackButton() {
      var button = this.backButton;

      button = this.subMenu.menu.addChild('MenuItem', {}, 0);
      button.name_ = 'BackButton';
      button.addClass('vjs-back-button');
      button.el_.innerHTML = 'Back to Menu<span class="vjs-control-text">Back</span>';
      button.el_.innerText = 'Back to Menu';
    }

    /**
     * Add/remove prefixed event listener for CSS Transition
     *
     * @method PrefixedEvent
     */
  }, {
    key: 'PrefixedEvent',
    value: function PrefixedEvent(element, type, callback) {
      var action = arguments.length <= 3 || arguments[3] === undefined ? 'addEvent' : arguments[3];

      var prefix = ['webkit', 'moz', 'MS', 'o', ''];

      for (var p = 0; p < prefix.length; p++) {
        if (!prefix[p]) {
          type = type.toLowerCase();
        }

        if (action === 'addEvent') {
          element.addEventListener(prefix[p] + type, callback, false);
        } else if (action === 'removeEvent') {
          element.removeEventListener(prefix[p] + type, callback, false);
        }
      }
    }
  }, {
    key: 'onTransitionEnd',
    value: function onTransitionEnd(event) {
      if (event.propertyName !== 'margin-right') {
        return;
      }

      if (this.menuToLoad === 'mainmenu') {
        // hide submenu
        _videoJs2['default'].dom.addClass(this.settingsSubMenuEl_, 'vjs-hidden');

        // reset opacity to 0
        this.settingsSubMenuEl_.style.opacity = '0';
      }
    }
  }, {
    key: 'reset',
    value: function reset() {
      _videoJs2['default'].dom.addClass(this.settingsSubMenuEl_, 'vjs-hidden');
      this.settingsSubMenuEl_.style.opacity = '0';
      this.setMargin();
    }
  }, {
    key: 'loadMainMenu',
    value: function loadMainMenu() {
      var _this4 = this;

      this.menuToLoad = 'mainmenu';
      this.mainMenu.show();
      this.mainMenu.el_.style.opacity = '0';

      // back button will always take you to main menu, so set dialog sizes
      this.settingsButton.setDialogSize([this.mainMenu.width, this.mainMenu.height]);

      // animation not triggered without timeout (some async stuff ?!?)
      setTimeout(function () {
        // anitmate margin and opacity before hiding the submenu
        // this triggers CSS Transition event
        _this4.setMargin();
        _this4.mainMenu.el_.style.opacity = '1';
      }, 0);
    }
  }, {
    key: 'build',
    value: function build() {
//      console.log('build: ' + this.subMenu.controlText_)
//      if (!this.subMenu.menu.children_ && this.subMenu.menu.menuButton_ && this.subMenu.menu.menuButton_.children_)
//      if (!this.subMenu.menu.children_)
//        this.subMenu.menu.children_ = this.subMenu.menu.menuButton_.children_
//      if (!this.subMenu.menu.el_ && this.subMenu.menu.menuButton_ && this.subMenu.menu.menuButton_.el_)
//        this.subMenu.menu.el_ = this.subMenu.menu.menuButton_.el_
      this.settingsSubMenuTitleEl_.innerHTML = this.subMenu.fixedText_ ? this.subMenu.fixedText_ : (this.subMenu.controlText_ + ':');
//      if (!this.subMenu.menu.menuButton_)
//        return
//      console.log(this.subMenu.menu.menuButton_.el_)
//      console.log(this.subMenu.menu)
//      console.log(this.settingsSubMenuEl_)
//console.log(this.subMenu.menu.el_.innerHTML)

//console.log(this.subMenu.menu)
//console.log('innerHTML')
//console.log(this.subMenu.menu)
//console.log(this.subMenu.menu.el_.innerHTML)
      this.settingsSubMenuEl_.appendChild(this.subMenu.menu.backEl_ || this.subMenu.menu.el_);
//      this.settingsSubMenuEl_.appendChild(this.subMenu.menu.el_ || this.subMenu.menu.backEl_);
//      this.settingsSubMenuEl_.appendChild(this.subMenu.menu.el_);
      this.panelChildEl.appendChild(this.settingsSubMenuEl_);

      this.update();

      this.createBackButton();
      this.getSize();
      this.bindClickEvents();

      var that = this

      setTimeout(function() {
        if (that.subMenu.menu.el_)
          that.subMenu.menu.backEl_ = that.subMenu.menu.el_
      })

      // prefixed event listeners for CSS TransitionEnd
      this.PrefixedEvent(this.settingsSubMenuEl_, 'TransitionEnd', this.transitionEndHandler, 'addEvent');

    }

    /**
     * Update the sub menus
     *
     * @method update
     */
  }, {
    key: 'update',
    value: function update(event) {
      var target = null;
      var subMenu = this.subMenu.name();

      if (event && event.type === 'tap') {
        target = event.target;
      } else if (event) {
        target = event.currentTarget;
      }

      if (subMenu === 'PlaybackRateMenuButton') {
        // Playback rate menu button doesn't get a vjs-selected class
        // or sets options_['selected'] on the selected playback rate.
        // Thus we get the submenu value based on the labelEl of playbackRateMenuButton
        this.settingsSubMenuValueEl_.innerHTML = this.subMenu.labelEl_.innerHTML;
        this.loadMainMenu();
      } else {

        if (!this.settingsSubMenuEl_.innerHTML)
          this.settingsSubMenuEl_.appendChild(this.subMenu.menu.backEl_ || this.subMenu.menu.el_);

        // Loop trough the submenu items to find the selected child
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.subMenu.menu.children_[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var subMenuItem = _step.value;

            if (!(subMenuItem instanceof component)) {
              continue;
            }

            switch (subMenu) {
              case 'SubtitlesButton':
              case 'CaptionsButton':
                // subtitlesButton entering default check twice and overwriting
                // selected label in main manu
                if (subMenuItem.hasClass('vjs-selected')) {
                  this.settingsSubMenuValueEl_.innerHTML = subMenuItem.options_.label;
                }
                break;

              case 'QualitySelector':
                // subtitlesButton entering default check twice and overwriting
                // selected label in main manu
                if (subMenuItem.source && subMenuItem.source.label && subMenuItem.source.label == window.selectedQuality) {
                  this.settingsSubMenuValueEl_.innerHTML = subMenuItem.options_.label;
                }
                break;

              default:
                // Set submenu value based on what item is selected
                if (subMenuItem.options_.selected || subMenuItem.hasClass('vjs-selected')) {
                  this.settingsSubMenuValueEl_.innerHTML = subMenuItem.options_.label;
                }
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator['return']) {
              _iterator['return']();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        if (target && !target.classList.contains('vjs-back-button')) {
          this.settingsButton.hideDialog();
        }
      }
    }
  }, {
    key: 'bindClickEvents',
    value: function bindClickEvents() {
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = this.subMenu.menu.children()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var item = _step2.value;

          if (!(item instanceof component)) {
            continue;
          }
          item.on(['tap', 'click'], this.submenuClickHandler);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }
    }

    // save size of submenus on first init
    // if number of submenu items change dinamically more logic will be needed
  }, {
    key: 'getSize',
    value: function getSize() {
      this.dialog.removeClass('vjs-hidden');
      this.size = this.settingsButton.getComponentSize(this.settingsSubMenuEl_);
      this.setMargin();
      this.dialog.addClass('vjs-hidden');
      _videoJs2['default'].dom.addClass(this.settingsSubMenuEl_, 'vjs-hidden');
    }
  }, {
    key: 'setMargin',
    value: function setMargin() {
      var _size = _slicedToArray(this.size, 1);

      var width = _size[0];

      this.settingsSubMenuEl_.style.marginRight = '-' + width + 'px';
    }

    /**
     * Hide the sub menu
     */
  }, {
    key: 'hideSubMenu',
    value: function hideSubMenu() {
      // after removing settings item this.el_ === null
      if (!this.el_) {
        return;
      }

      if (_videoJs2['default'].dom.hasClass(this.el_, 'open')) {
        _videoJs2['default'].dom.addClass(this.settingsSubMenuEl_, 'vjs-hidden');
        _videoJs2['default'].dom.removeClass(this.el_, 'open');
      }
    }
  }]);

  return SettingsMenuItem;
})(MenuItem);

SettingsMenuItem.prototype.contentElType = 'button';

_videoJs2['default'].registerComponent('SettingsMenuItem', SettingsMenuItem);
exports['default'] = SettingsMenuItem;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./utils":3}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toTitleCase = toTitleCase;

function toTitleCase(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

;

},{}],4:[function(require,module,exports){
'use strict';

require('./components/settings-menu-button.js');

require('./components/settings-menu-item.js');

},{"./components/settings-menu-button.js":1,"./components/settings-menu-item.js":2}]},{},[4])(4)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvamFydWJhL0Rvd25sb2Fkcy92aWRlb2pzLXNldHRpbmdzLW1lbnUtbWFzdGVyL3NyYy9jb21wb25lbnRzL3NldHRpbmdzLW1lbnUtYnV0dG9uLmpzIiwiL1VzZXJzL2phcnViYS9Eb3dubG9hZHMvdmlkZW9qcy1zZXR0aW5ncy1tZW51LW1hc3Rlci9zcmMvY29tcG9uZW50cy9zZXR0aW5ncy1tZW51LWl0ZW0uanMiLCIvVXNlcnMvamFydWJhL0Rvd25sb2Fkcy92aWRlb2pzLXNldHRpbmdzLW1lbnUtbWFzdGVyL3NyYy9jb21wb25lbnRzL3V0aWxzLmpzIiwiL1VzZXJzL2phcnViYS9Eb3dubG9hZHMvdmlkZW9qcy1zZXR0aW5ncy1tZW51LW1hc3Rlci9zcmMvcGx1Z2luLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozt1QkNJb0IsVUFBVTs7OztrQ0FDRCx5QkFBeUI7Ozs7cUJBQy9CLFNBQVM7O0lBQXBCLEtBQUs7Ozs7OztBQUtqQixJQUFNLE1BQU0sR0FBRyxxQkFBUSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDOUMsSUFBTSxJQUFJLEdBQUcscUJBQVEsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzFDLElBQU0sU0FBUyxHQUFHLHFCQUFRLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQzs7SUFFOUMsY0FBYztZQUFkLGNBQWM7O0FBQ1AsV0FEUCxjQUFjLENBQ04sTUFBTSxFQUFFLE9BQU8sRUFBRTswQkFEekIsY0FBYzs7QUFFaEIsK0JBRkUsY0FBYyw2Q0FFVixNQUFNLEVBQUUsT0FBTyxFQUFFOztBQUV2QixRQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQztBQUM5QixRQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFD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QUFFLENBQUM7QUFDakIsVUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDbkMsMkJBQVEsUUFBUSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztLQUN6RDs7O1dBRVEscUJBQUc7aUNBQ0ksSUFBSSxDQUFDLElBQUk7O1VBQWxCLEtBQUs7O0FBRVYsVUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxXQUFXLFNBQU8sS0FBSyxPQUFJLENBQUM7S0FDM0Q7Ozs7Ozs7V0FLVSx1QkFBRzs7QUFFWixVQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNiLGVBQU87T0FDUjs7QUFFRCxVQUFJLHFCQUFRLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFO0FBQ3RDLDZCQUFRLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDeEQsNkJBQVEsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7T0FDdkM7S0FDRjs7O1NBbFRHLGdCQUFnQjtHQUFTLFFBQVE7O0FBc1R2QyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQzs7QUFFcEQscUJBQVEsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztxQkFDakQsZ0JBQWdCOzs7Ozs7Ozs7Ozs7O0FDNVV4QixTQUFTLFdBQVcsQ0FBQyxNQUFNLEVBQUU7QUFDbEMsU0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDekQ7O0FBQUEsQ0FBQzs7Ozs7UUNGSyxzQ0FBc0M7O1FBQ3RDLG9DQUFvQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlxuLyoqXG4gKiBAZmlsZSBzZXR0aW5ncy1tZW51LWJ1dHRvbi5qc1xuICovXG5pbXBvcnQgdmlkZW9qcyBmcm9tICd2aWRlby5qcyc7XG5pbXBvcnQgU2V0dGluZ3NNZW51SXRlbSBmcm9tICcuL3NldHRpbmdzLW1lbnUtaXRlbS5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzJztcbi8vIG9ubHkgb25lIGluc3RhbmNlIG9mIGJhYmVsLXBvbHlmaWxsIGlzIGFsbG93ZWRcbi8vIHdoZW4gaW1wb3J0ZWQgd2l0aCBvdGhlciB2aWRlb2pzIHBseWdpbnNcbi8vIGltcG9ydCAnYmFiZWwtcG9seWZpbGwnO1xuXG5jb25zdCBCdXR0b24gPSB2aWRlb2pzLmdldENvbXBvbmVudCgnQnV0dG9uJyk7XG5jb25zdCBNZW51ID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnUnKTtcbmNvbnN0IENvbXBvbmVudCA9IHZpZGVvanMuZ2V0Q29tcG9uZW50KCdDb21wb25lbnQnKTtcblxuY2xhc3MgU2V0dGluZ3NCdXR0b24gZXh0ZW5kcyBCdXR0b24ge1xuICBjb25zdHJ1Y3RvcihwbGF5ZXIsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihwbGF5ZXIsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5wbGF5ZXJDb21wb25lbnQgPSBwbGF5ZXI7XG4gICAgdGhpcy5kaWFsb2cgPSB0aGlzLnBsYXllckNvbXBvbmVudC5hZGRDaGlsZCgnc2V0dGluZ3NEaWFsb2cnKTtcbiAgICB0aGlzLmRpYWxvZ0VsID0gdGhpcy5kaWFsb2cuZWxfO1xuICAgIHRoaXMubWVudSA9IG51bGw7XG4gICAgdGhpcy5wYW5lbCA9IHRoaXMuZGlhbG9nLmFkZENoaWxkKCdzZXR0aW5nc1BhbmVsJyk7XG4gICAgdGhpcy5wYW5lbENoaWxkID0gdGhpcy5wYW5lbC5hZGRDaGlsZCgnc2V0dGluZ3NQYW5lbENoaWxkJyk7XG5cbiAgICB0aGlzLmFkZENsYXNzKCd2anMtc2V0dGluZ3MnKTtcbiAgICB0aGlzLmVsXy5zZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnLCAnU2V0dGluZ3MgQnV0dG9uJyk7XG5cbiAgICAvLyBFdmVudCBoYW5kbGVyc1xuICAgIHRoaXMuYWRkU2V0dGluZ3NJdGVtSGFuZGxlciA9IHRoaXMub25BZGRTZXR0aW5nc0l0ZW0uYmluZCh0aGlzKTtcbiAgICB0aGlzLmRpc3Bvc2VTZXR0aW5nc0l0ZW1IYW5kbGVyID0gdGhpcy5vbkRpc3Bvc2VTZXR0aW5nc0l0ZW0uYmluZCh0aGlzKTtcbiAgICB0aGlzLnBsYXllckNsaWNrSGFuZGxlciA9IHRoaXMub25QbGF5ZXJDbGljay5iaW5kKHRoaXMpO1xuICAgIHRoaXMudXNlckluYWN0aXZlSGFuZGxlciA9IHRoaXMub25Vc2VySW5hY3RpdmUuYmluZCh0aGlzKTtcblxuICAgIHRoaXMuYnVpbGRNZW51KCk7XG4gICAgdGhpcy5iaW5kRXZlbnRzKCk7XG4gIH1cblxuICBvblBsYXllckNsaWNrKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ3Zqcy1zZXR0aW5ncycpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmRpYWxvZy5oYXNDbGFzcygndmpzLWhpZGRlbicpKSB7XG4gICAgICB0aGlzLmhpZGVEaWFsb2coKTtcbiAgICB9XG4gIH1cblxuICBvbkRpc3Bvc2VTZXR0aW5nc0l0ZW0oZXZlbnQsIG5hbWUpIHtcbiAgICBpZiAobmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBsZXQgY2hpbGRyZW4gPSB0aGlzLm1lbnUuY2hpbGRyZW4oKTtcblxuICAgICAgd2hpbGUgKGNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY2hpbGRyZW5bMF0uZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm1lbnUucmVtb3ZlQ2hpbGQoY2hpbGRyZW5bMF0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmFkZENsYXNzKCd2anMtaGlkZGVuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBpdGVtID0gdGhpcy5tZW51LmdldENoaWxkKG5hbWUpO1xuXG4gICAgICBpZihpdGVtKSB7XG4gICAgICAgIGl0ZW0uZGlzcG9zZSgpO1xuICAgICAgICB0aGlzLm1lbnUucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5oaWRlRGlhbG9nKCk7XG5cbiAgICBpZih0aGlzLm9wdGlvbnNfLmVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmFkZENsYXNzKCd2anMtaGlkZGVuJyk7XG4gICAgfVxuICB9XG5cbiAgb25BZGRTZXR0aW5nc0l0ZW0oZXZlbnQsIGRhdGEpIHtcbiAgICBsZXQgW2VudHJ5LCBvcHRpb25zXSA9IGRhdGE7XG5cbiAgICB0aGlzLmFkZE1lbnVJdGVtKGVudHJ5LCBvcHRpb25zKTtcbiAgICB0aGlzLnJlbW92ZUNsYXNzKCd2anMtaGlkZGVuJyk7XG4gIH1cblxuICBvblVzZXJJbmFjdGl2ZSgpIHtcbiAgICBpZiAoIXRoaXMuZGlhbG9nLmhhc0NsYXNzKCd2anMtaGlkZGVuJykpIHtcbiAgICAgIHRoaXMuaGlkZURpYWxvZygpO1xuICAgIH1cbiAgfVxuXG4gIGJpbmRFdmVudHMoKSB7XG4gICAgdGhpcy5wbGF5ZXJDb21wb25lbnQub24oJ2NsaWNrJywgdGhpcy5wbGF5ZXJDbGlja0hhbmRsZXIpO1xuICAgIHRoaXMucGxheWVyQ29tcG9uZW50Lm9uKCdhZGRzZXR0aW5nc2l0ZW0nLCB0aGlzLmFkZFNldHRpbmdzSXRlbUhhbmRsZXIpO1xuICAgIHRoaXMucGxheWVyQ29tcG9uZW50Lm9uKCdkaXNwb3Nlc2V0dGluZ3NpdGVtJywgdGhpcy5kaXNwb3NlU2V0dGluZ3NJdGVtSGFuZGxlcik7XG4gICAgdGhpcy5wbGF5ZXJDb21wb25lbnQub24oJ3VzZXJpbmFjdGl2ZScsIHRoaXMudXNlckluYWN0aXZlSGFuZGxlcik7XG4gIH1cblxuICBidWlsZENTU0NsYXNzKCkge1xuICAgIC8vIHZqcy1pY29uLWNvZyBjYW4gYmUgcmVtb3ZlZCB3aGVuIHRoZSBzZXR0aW5ncyBtZW51IGlzIGludGVncmF0ZWQgaW4gdmlkZW8uanNcbiAgICByZXR1cm4gYHZqcy1pY29uLWNvZyAke3N1cGVyLmJ1aWxkQ1NTQ2xhc3MoKX1gO1xuICB9XG5cbiAgaGFuZGxlQ2xpY2soKSB7XG4gICAgaWYgKHRoaXMuZGlhbG9nLmhhc0NsYXNzKCd2anMtaGlkZGVuJykpIHtcbiAgICAgIHRoaXMuc2hvd0RpYWxvZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhpZGVEaWFsb2coKTtcbiAgICB9XG4gIH1cblxuICBzaG93RGlhbG9nKCkge1xuICAgIHRoaXMubWVudS5lbF8uc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgICB0aGlzLmRpYWxvZy5zaG93KCk7XG4gICAgdGhpcy5zZXREaWFsb2dTaXplKHRoaXMuZ2V0Q29tcG9uZW50U2l6ZSh0aGlzLm1lbnUpKTtcbiAgfVxuXG4gIGhpZGVEaWFsb2coKSB7XG4gICAgdGhpcy5kaWFsb2cuaGlkZSgpO1xuICAgIHRoaXMuc2V0RGlhbG9nU2l6ZSh0aGlzLmdldENvbXBvbmVudFNpemUodGhpcy5tZW51KSk7XG4gICAgdGhpcy5tZW51LmVsXy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIHRoaXMucmVzZXRDaGlsZHJlbigpO1xuICB9XG5cbiAgZ2V0Q29tcG9uZW50U2l6ZShlbGVtZW50KSB7XG4gICAgbGV0IHdpZHRoID0gbnVsbDtcbiAgICBsZXQgaGVpZ2h0ID0gbnVsbDtcblxuICAgIC8vIENvdWxkIGJlIGNvbXBvbmVudCBvciBqdXN0IERPTSBlbGVtZW50XG4gICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBDb21wb25lbnQpIHtcbiAgICAgIHdpZHRoID0gZWxlbWVudC5lbF8ub2Zmc2V0V2lkdGg7XG4gICAgICBoZWlnaHQgPSBlbGVtZW50LmVsXy5vZmZzZXRIZWlnaHQ7XG5cbiAgICAgIC8vIGtlZXAgd2lkdGgvaGVpZ2h0IGFzIHByb3BlcnRpZXMgZm9yIGRpcmVjdCB1c2VcbiAgICAgIGVsZW1lbnQud2lkdGggPSB3aWR0aDtcbiAgICAgIGVsZW1lbnQuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB3aWR0aCA9IGVsZW1lbnQub2Zmc2V0V2lkdGg7XG4gICAgICBoZWlnaHQgPSBlbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICB9XG5cbiAgICByZXR1cm4gW3dpZHRoLCBoZWlnaHRdO1xuICB9XG5cbiAgc2V0RGlhbG9nU2l6ZShbd2lkdGgsIGhlaWdodF0pIHtcbiAgICBpZiAodHlwZW9mIGhlaWdodCAhPT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsZXQgb2Zmc2V0ID0gdGhpcy5vcHRpb25zXy5zZXR1cC5tYXhIZWlnaHRPZmZzZXQ7XG4gICAgbGV0IG1heEhlaWdodCA9IHRoaXMucGxheWVyQ29tcG9uZW50LmVsXy5vZmZzZXRIZWlnaHQgLSBvZmZzZXQ7XG5cbiAgICBpZiAoaGVpZ2h0ID4gbWF4SGVpZ2h0KSB7XG4gICAgICBoZWlnaHQgPSBtYXhIZWlnaHQ7XG4gICAgICB3aWR0aCArPSAxNztcbiAgICAgIHRoaXMucGFuZWwuZWxfLnN0eWxlLm1heEhlaWdodCA9IGAke2hlaWdodH1weGA7XG4gICAgfSBlbHNlIGlmICh0aGlzLnBhbmVsLmVsXy5zdHlsZS5tYXhIZWlnaHQgIT09ICcnKSB7XG4gICAgICB0aGlzLnBhbmVsLmVsXy5zdHlsZS5tYXhIZWlnaHQgPSAnJztcbiAgICB9XG5cbiAgICB0aGlzLmRpYWxvZ0VsLnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xuICAgIHRoaXMuZGlhbG9nRWwuc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcbiAgfVxuXG4gIGJ1aWxkTWVudSgpIHtcbiAgICB0aGlzLm1lbnUgPSBuZXcgTWVudSh0aGlzLnBsYXllcigpKTtcbiAgICB0aGlzLm1lbnUuYWRkQ2xhc3MoJ3Zqcy1tYWluLW1lbnUnKTtcbiAgICBsZXQgZW50cmllcyA9IHRoaXMub3B0aW9uc18uZW50cmllcztcblxuICAgIGlmKGVudHJpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmFkZENsYXNzKCd2anMtaGlkZGVuJyk7XG4gICAgICB0aGlzLnBhbmVsQ2hpbGQuYWRkQ2hpbGQodGhpcy5tZW51KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICB0aGlzLmFkZE1lbnVJdGVtKGVudHJ5LCB0aGlzLm9wdGlvbnNfKTtcbiAgICB9XG5cbiAgICB0aGlzLnBhbmVsQ2hpbGQuYWRkQ2hpbGQodGhpcy5tZW51KTtcbiAgfVxuXG4gIGFkZE1lbnVJdGVtKGVudHJ5LCBvcHRpb25zKSB7XG4gICAgY29uc3Qgb3BlblN1Yk1lbnUgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh2aWRlb2pzLmhhc0NsYXNzKHRoaXMuZWxfLCAnb3BlbicpKSB7XG4gICAgICAgIHZpZGVvanMucmVtb3ZlQ2xhc3ModGhpcy5lbF8sICdvcGVuJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2aWRlb2pzLmFkZENsYXNzKHRoaXMuZWxfLCAnb3BlbicpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBvcHRpb25zLm5hbWUgPSB1dGlscy50b1RpdGxlQ2FzZShlbnRyeSk7XG4gICAgbGV0IHNldHRpbmdzTWVudUl0ZW0gPSBuZXcgU2V0dGluZ3NNZW51SXRlbSh0aGlzLnBsYXllcigpLCBvcHRpb25zLCBlbnRyeSwgdGhpcyk7XG5cbiAgICB0aGlzLm1lbnUuYWRkQ2hpbGQoc2V0dGluZ3NNZW51SXRlbSk7XG5cbiAgICAvLyBIaWRlIGNoaWxkcmVuIHRvIGF2b2lkIHN1YiBtZW51cyBzdGFja2luZyBvbiB0b3Agb2YgZWFjaCBvdGhlclxuICAgIC8vIG9yIGhhdmluZyBtdWx0aXBsZSBtZW51cyBvcGVuXG4gICAgc2V0dGluZ3NNZW51SXRlbS5vbignY2xpY2snLCB2aWRlb2pzLmJpbmQodGhpcywgdGhpcy5oaWRlQ2hpbGRyZW4pKTtcblxuICAgIC8vIFdldGhlciB0byBhZGQgb3IgcmVtb3ZlIHNlbGVjdGVkIGNsYXNzIG9uIHRoZSBzZXR0aW5ncyBzdWIgbWVudSBlbGVtZW50XG4gICAgc2V0dGluZ3NNZW51SXRlbS5vbignY2xpY2snLCBvcGVuU3ViTWVudSk7XG4gIH1cblxuICByZXNldENoaWxkcmVuKCkge1xuICAgIGZvciAobGV0IG1lbnVDaGlsZCBvZiB0aGlzLm1lbnUuY2hpbGRyZW4oKSkge1xuICAgICAgbWVudUNoaWxkLnJlc2V0KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEhpZGUgYWxsIHRoZSBzdWIgbWVudXNcbiAgICovXG4gIGhpZGVDaGlsZHJlbigpIHtcbiAgICBmb3IgKGxldCBtZW51Q2hpbGQgb2YgdGhpcy5tZW51LmNoaWxkcmVuKCkpIHtcbiAgICAgIG1lbnVDaGlsZC5oaWRlU3ViTWVudSgpO1xuICAgIH1cbiAgfVxuXG59XG5cbmNsYXNzIFNldHRpbmdzUGFuZWwgZXh0ZW5kcyBDb21wb25lbnQge1xuICBjb25zdHJ1Y3RvcihwbGF5ZXIsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihwbGF5ZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgY29tcG9uZW50J3MgRE9NIGVsZW1lbnRcbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogQG1ldGhvZCBjcmVhdGVFbFxuICAgKi9cbiAgY3JlYXRlRWwoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICBjbGFzc05hbWU6ICd2anMtc2V0dGluZ3MtcGFuZWwnLFxuICAgICAgaW5uZXJIVE1MOiAnJyxcbiAgICAgIHRhYkluZGV4OiAtMVxuICAgIH0pO1xuICB9XG59XG5cbmNsYXNzIFNldHRpbmdzUGFuZWxDaGlsZCBleHRlbmRzIENvbXBvbmVudCB7XG4gIGNvbnN0cnVjdG9yKHBsYXllciwgb3B0aW9ucykge1xuICAgIHN1cGVyKHBsYXllciwgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHRoZSBjb21wb25lbnQncyBET00gZWxlbWVudFxuICAgKlxuICAgKiBAcmV0dXJuIHtFbGVtZW50fVxuICAgKiBAbWV0aG9kIGNyZWF0ZUVsXG4gICAqL1xuICBjcmVhdGVFbCgpIHtcbiAgICByZXR1cm4gc3VwZXIuY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgIGNsYXNzTmFtZTogJ3Zqcy1zZXR0aW5ncy1wYW5lbC1jaGlsZCcsXG4gICAgICBpbm5lckhUTUw6ICcnLFxuICAgICAgdGFiSW5kZXg6IC0xXG4gICAgfSk7XG4gIH1cbn1cblxuY2xhc3MgU2V0dGluZ3NEaWFsb2cgZXh0ZW5kcyBDb21wb25lbnQge1xuICBjb25zdHJ1Y3RvcihwbGF5ZXIsIG9wdGlvbnMpIHtcbiAgICBzdXBlcihwbGF5ZXIsIG9wdGlvbnMpO1xuICAgIHRoaXMuaGlkZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSB0aGUgY29tcG9uZW50J3MgRE9NIGVsZW1lbnRcbiAgICpcbiAgICogQHJldHVybiB7RWxlbWVudH1cbiAgICogQG1ldGhvZCBjcmVhdGVFbFxuICAgKi9cbiAgY3JlYXRlRWwoKSB7XG4gICAgY29uc3QgdW5pcXVlSWQgPSB0aGlzLmlkXztcbiAgICBjb25zdCBkaWFsb2dMYWJlbElkID0gJ1RUc2V0dGluZ3NEaWFsb2dMYWJlbC0nICsgdW5pcXVlSWQ7XG4gICAgY29uc3QgZGlhbG9nRGVzY3JpcHRpb25JZCA9ICdUVHNldHRpbmdzRGlhbG9nRGVzY3JpcHRpb24tJyArIHVuaXF1ZUlkO1xuXG4gICAgcmV0dXJuIHN1cGVyLmNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICBjbGFzc05hbWU6ICd2anMtc2V0dGluZ3MtZGlhbG9nIHZqcy1tb2RhbC1vdmVybGF5JyxcbiAgICAgIGlubmVySFRNTDogJycsXG4gICAgICB0YWJJbmRleDogLTFcbiAgICB9LCB7XG4gICAgICAncm9sZSc6ICdkaWFsb2cnLFxuICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGRpYWxvZ0xhYmVsSWQsXG4gICAgICAnYXJpYS1kZXNjcmliZWRieSc6IGRpYWxvZ0Rlc2NyaXB0aW9uSWRcbiAgICB9KTtcbiAgfVxuXG59XG5cblNldHRpbmdzQnV0dG9uLnByb3RvdHlwZS5jb250cm9sVGV4dF8gPSAnU2V0dGluZ3MgQnV0dG9uJztcblxuQ29tcG9uZW50LnJlZ2lzdGVyQ29tcG9uZW50KCdTZXR0aW5nc0J1dHRvbicsIFNldHRpbmdzQnV0dG9uKTtcbkNvbXBvbmVudC5yZWdpc3RlckNvbXBvbmVudCgnU2V0dGluZ3NEaWFsb2cnLCBTZXR0aW5nc0RpYWxvZyk7XG5Db21wb25lbnQucmVnaXN0ZXJDb21wb25lbnQoJ1NldHRpbmdzUGFuZWwnLCBTZXR0aW5nc1BhbmVsKTtcbkNvbXBvbmVudC5yZWdpc3RlckNvbXBvbmVudCgnU2V0dGluZ3NQYW5lbENoaWxkJywgU2V0dGluZ3NQYW5lbENoaWxkKTtcblxuZXhwb3J0IHsgU2V0dGluZ3NCdXR0b24sIFNldHRpbmdzRGlhbG9nLCBTZXR0aW5nc1BhbmVsLCBTZXR0aW5nc1BhbmVsQ2hpbGQgfTtcbiIsIi8qKlxuICogQGZpbGUgc2V0dGluZ3MtbWVudS1pdGVtLmpzXG4gKi9cblxuaW1wb3J0IHZpZGVvanMgZnJvbSAndmlkZW8uanMnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IE1lbnVJdGVtID0gdmlkZW9qcy5nZXRDb21wb25lbnQoJ01lbnVJdGVtJyk7XG5jb25zdCBjb21wb25lbnQgPSB2aWRlb2pzLmdldENvbXBvbmVudCgnQ29tcG9uZW50Jyk7XG5cbi8qKlxuICogVGhlIHNwZWNpZmljIG1lbnUgaXRlbSB0eXBlIGZvciBzZWxlY3RpbmcgYSBzZXR0aW5nXG4gKlxuICogQHBhcmFtIHtQbGF5ZXJ8T2JqZWN0fSBwbGF5ZXJcbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmc9fSBlbnRyeVxuICogQGV4dGVuZHMgTWVudUl0ZW1cbiAqIEBjbGFzcyBTZXR0aW5nc01lbnVJdGVtXG4gKi9cbmNsYXNzIFNldHRpbmdzTWVudUl0ZW0gZXh0ZW5kcyBNZW51SXRlbSB7XG5cbiAgY29uc3RydWN0b3IocGxheWVyLCBvcHRpb25zLCBlbnRyeSwgbWVudUJ1dHRvbikge1xuICAgIHN1cGVyKHBsYXllciwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLnNldHRpbmdzQnV0dG9uID0gbWVudUJ1dHRvbjtcbiAgICB0aGlzLmRpYWxvZyA9IHRoaXMuc2V0dGluZ3NCdXR0b24uZGlhbG9nO1xuICAgIHRoaXMubWFpbk1lbnUgPSB0aGlzLnNldHRpbmdzQnV0dG9uLm1lbnU7XG4gICAgdGhpcy5wYW5lbCA9IHRoaXMuZGlhbG9nLmdldENoaWxkKCdzZXR0aW5nc1BhbmVsJyk7XG4gICAgdGhpcy5wYW5lbENoaWxkID0gdGhpcy5wYW5lbC5nZXRDaGlsZCgnc2V0dGluZ3NQYW5lbENoaWxkJyk7XG4gICAgdGhpcy5wYW5lbENoaWxkRWwgPSB0aGlzLnBhbmVsQ2hpbGQuZWxfO1xuXG4gICAgdGhpcy5zaXplID0gbnVsbDtcblxuICAgIC8vIGtlZXAgc3RhdGUgb2Ygd2hhdCBtZW51IHR5cGUgaXMgbG9hZGluZyBuZXh0XG4gICAgdGhpcy5tZW51VG9Mb2FkID0gJ21haW5tZW51JztcblxuICAgIGNvbnN0IHN1Yk1lbnVOYW1lID0gdXRpbHMudG9UaXRsZUNhc2UoZW50cnkpO1xuICAgIGNvbnN0IFN1Yk1lbnVDb21wb25lbnQgPSB2aWRlb2pzLmdldENvbXBvbmVudChzdWJNZW51TmFtZSk7XG5cbiAgICBpZiAoIVN1Yk1lbnVDb21wb25lbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50ICR7c3ViTWVudU5hbWV9IGRvZXMgbm90IGV4aXN0YCk7XG4gICAgfVxuICAgIHRoaXMuc3ViTWVudSA9IG5ldyBTdWJNZW51Q29tcG9uZW50KHRoaXMucGxheWVyKCksIG9wdGlvbnMsIG1lbnVCdXR0b24sIHRoaXMpO1xuXG4gICAgdGhpcy5ldmVudEhhbmRsZXJzKCk7XG5cbiAgICBwbGF5ZXIucmVhZHkoKCkgPT4ge1xuICAgICAgdGhpcy5idWlsZCgpO1xuICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHVwIGV2ZW50IGhhbmRsZXJzXG4gICAqXG4gICAqIEBtZXRob2QgZXZlbnRIYW5kbGVyc1xuICAgKi9cbiAgZXZlbnRIYW5kbGVycygpIHtcbiAgICB0aGlzLnN1Ym1lbnVDbGlja0hhbmRsZXIgPSB0aGlzLm9uU3VibWVudUNsaWNrLmJpbmQodGhpcyk7XG4gICAgdGhpcy50cmFuc2l0aW9uRW5kSGFuZGxlciA9IHRoaXMub25UcmFuc2l0aW9uRW5kLmJpbmQodGhpcyk7XG4gIH1cblxuICBvblN1Ym1lbnVDbGljayhldmVudCkge1xuICAgIGxldCB0YXJnZXQgPSBudWxsO1xuXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09ICd0YXAnKSB7XG4gICAgICB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQ7XG4gICAgfVxuXG4gICAgaWYgKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ3Zqcy1iYWNrLWJ1dHRvbicpKSB7XG4gICAgICB0aGlzLmxvYWRNYWluTWVudSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFRvIHVwZGF0ZSB0aGUgc3ViIG1lbnUgdmFsdWUgb24gY2xpY2ssIHNldFRpbWVvdXQgaXMgbmVlZGVkIGJlY2F1c2VcbiAgICAvLyB1cGRhdGluZyB0aGUgdmFsdWUgaXMgbm90IGluc3RhbnRcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMudXBkYXRlKGV2ZW50KTtcbiAgICB9LCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgdGhlIGNvbXBvbmVudCdzIERPTSBlbGVtZW50XG4gICAqXG4gICAqIEByZXR1cm4ge0VsZW1lbnR9XG4gICAqIEBtZXRob2QgY3JlYXRlRWxcbiAgICovXG4gIGNyZWF0ZUVsKCkge1xuICAgIGNvbnN0IGVsID0gdmlkZW9qcy5jcmVhdGVFbCgnbGknLCB7XG4gICAgICBjbGFzc05hbWU6ICd2anMtbWVudS1pdGVtJ1xuICAgIH0pO1xuXG4gICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVUaXRsZUVsXyA9IHZpZGVvanMuY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgIGNsYXNzTmFtZTogJ3Zqcy1zZXR0aW5ncy1zdWItbWVudS10aXRsZSdcbiAgICB9KTtcblxuICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuc2V0dGluZ3NTdWJNZW51VGl0bGVFbF8pO1xuXG4gICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVWYWx1ZUVsXyA9IHZpZGVvanMuY3JlYXRlRWwoJ2RpdicsIHtcbiAgICAgIGNsYXNzTmFtZTogJ3Zqcy1zZXR0aW5ncy1zdWItbWVudS12YWx1ZSdcbiAgICB9KTtcblxuICAgIGVsLmFwcGVuZENoaWxkKHRoaXMuc2V0dGluZ3NTdWJNZW51VmFsdWVFbF8pO1xuXG4gICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVFbF8gPSB2aWRlb2pzLmNyZWF0ZUVsKCdkaXYnLCB7XG4gICAgICBjbGFzc05hbWU6ICd2anMtc2V0dGluZ3Mtc3ViLW1lbnUnXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGNsaWNrIG9uIG1lbnUgaXRlbVxuICAgKlxuICAgKiBAbWV0aG9kIGhhbmRsZUNsaWNrXG4gICAqL1xuICBoYW5kbGVDbGljaygpIHtcbiAgICB0aGlzLm1lbnVUb0xvYWQgPSAnc3VibWVudSc7XG4gICAgLy8gUmVtb3ZlIG9wZW4gY2xhc3MgdG8gZW5zdXJlIG9ubHkgdGhlIG9wZW4gc3VibWVudSBnZXRzIHRoaXMgY2xhc3NcbiAgICB2aWRlb2pzLnJlbW92ZUNsYXNzKHRoaXMuZWxfLCAnb3BlbicpO1xuXG4gICAgc3VwZXIuaGFuZGxlQ2xpY2soKTtcblxuICAgIHRoaXMubWFpbk1lbnUuZWxfLnN0eWxlLm9wYWNpdHkgPSAnMCc7XG4gICAgLy8gV2V0aGVyIHRvIGFkZCBvciByZW1vdmUgdmpzLWhpZGRlbiBjbGFzcyBvbiB0aGUgc2V0dGluZ3NTdWJNZW51RWwgZWxlbWVudFxuICAgIGlmICh2aWRlb2pzLmhhc0NsYXNzKHRoaXMuc2V0dGluZ3NTdWJNZW51RWxfLCAndmpzLWhpZGRlbicpKSB7XG4gICAgICB2aWRlb2pzLnJlbW92ZUNsYXNzKHRoaXMuc2V0dGluZ3NTdWJNZW51RWxfLCAndmpzLWhpZGRlbicpO1xuXG4gICAgICAvLyBhbmltYXRpb24gbm90IHBsYXllZCB3aXRob3V0IHRpbWVvdXRcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLnNldHRpbmdzU3ViTWVudUVsXy5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgICAgICB0aGlzLnNldHRpbmdzU3ViTWVudUVsXy5zdHlsZS5tYXJnaW5SaWdodCA9ICcwcHgnO1xuICAgICAgfSwgMCk7XG5cbiAgICAgIHRoaXMuc2V0dGluZ3NCdXR0b24uc2V0RGlhbG9nU2l6ZSh0aGlzLnNpemUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2aWRlb2pzLmFkZENsYXNzKHRoaXMuc2V0dGluZ3NTdWJNZW51RWxfLCAndmpzLWhpZGRlbicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYmFjayBidXR0b25cbiAgICpcbiAgICogQG1ldGhvZCBjcmVhdGVCYWNrQnV0dG9uXG4gICAqL1xuICBjcmVhdGVCYWNrQnV0dG9uKCkge1xuICAgIGxldCBidXR0b24gPSB0aGlzLmJhY2tCdXR0b247XG5cbiAgICBidXR0b24gPSB0aGlzLnN1Yk1lbnUubWVudS5hZGRDaGlsZCgnTWVudUl0ZW0nLCB7fSwgMCk7XG4gICAgYnV0dG9uLm5hbWVfID0gJ0JhY2tCdXR0b24nO1xuICAgIGJ1dHRvbi5hZGRDbGFzcygndmpzLWJhY2stYnV0dG9uJyk7XG4gICAgYnV0dG9uLmVsXy5pbm5lckhUTUwgPSAnQmFjayB0byBtZW51PHNwYW4gY2xhc3M9XCJ2anMtY29udHJvbC10ZXh0XCI+QmFjazwvc3Bhbj4nO1xuICAgIGJ1dHRvbi5lbF8uaW5uZXJUZXh0ID0gJ0JhY2sgdG8gbWVudSc7XG4gIH1cblxuICAvKipcbiAgICogQWRkL3JlbW92ZSBwcmVmaXhlZCBldmVudCBsaXN0ZW5lciBmb3IgQ1NTIFRyYW5zaXRpb25cbiAgICpcbiAgICogQG1ldGhvZCBQcmVmaXhlZEV2ZW50XG4gICAqL1xuICBQcmVmaXhlZEV2ZW50KGVsZW1lbnQsIHR5cGUsIGNhbGxiYWNrLCBhY3Rpb24gPSAnYWRkRXZlbnQnKSB7XG4gICAgbGV0IHByZWZpeCA9IFsnd2Via2l0JywgJ21veicsICdNUycsICdvJywgJyddO1xuXG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPCBwcmVmaXgubGVuZ3RoOyBwKyspIHtcbiAgICAgIGlmICghcHJlZml4W3BdKSB7XG4gICAgICAgIHR5cGUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChhY3Rpb24gPT09ICdhZGRFdmVudCcpIHtcbiAgICAgICAgZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHByZWZpeFtwXSArIHR5cGUsIGNhbGxiYWNrLCBmYWxzZSk7XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbiA9PT0gJ3JlbW92ZUV2ZW50Jykge1xuICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIocHJlZml4W3BdICsgdHlwZSwgY2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBvblRyYW5zaXRpb25FbmQoZXZlbnQpIHtcbiAgICBpZiAoZXZlbnQucHJvcGVydHlOYW1lICE9PSAnbWFyZ2luLXJpZ2h0Jykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm1lbnVUb0xvYWQgPT09ICdtYWlubWVudScpIHtcbiAgICAgIC8vIGhpZGUgc3VibWVudVxuICAgICAgdmlkZW9qcy5hZGRDbGFzcyh0aGlzLnNldHRpbmdzU3ViTWVudUVsXywgJ3Zqcy1oaWRkZW4nKTtcblxuICAgICAgLy8gcmVzZXQgb3BhY2l0eSB0byAwXG4gICAgICB0aGlzLnNldHRpbmdzU3ViTWVudUVsXy5zdHlsZS5vcGFjaXR5ID0gJzAnO1xuICAgIH1cbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIHZpZGVvanMuYWRkQ2xhc3ModGhpcy5zZXR0aW5nc1N1Yk1lbnVFbF8sICd2anMtaGlkZGVuJyk7XG4gICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVFbF8uc3R5bGUub3BhY2l0eSA9ICcwJztcbiAgICB0aGlzLnNldE1hcmdpbigpO1xuICB9XG5cbiAgbG9hZE1haW5NZW51KCkge1xuICAgIHRoaXMubWVudVRvTG9hZCA9ICdtYWlubWVudSc7XG4gICAgdGhpcy5tYWluTWVudS5zaG93KCk7XG4gICAgdGhpcy5tYWluTWVudS5lbF8uc3R5bGUub3BhY2l0eSA9ICcwJztcblxuICAgIC8vIGJhY2sgYnV0dG9uIHdpbGwgYWx3YXlzIHRha2UgeW91IHRvIG1haW4gbWVudSwgc28gc2V0IGRpYWxvZyBzaXplc1xuICAgIHRoaXMuc2V0dGluZ3NCdXR0b24uc2V0RGlhbG9nU2l6ZShbdGhpcy5tYWluTWVudS53aWR0aCwgdGhpcy5tYWluTWVudS5oZWlnaHRdKTtcblxuICAgIC8vIGFuaW1hdGlvbiBub3QgdHJpZ2dlcmVkIHdpdGhvdXQgdGltZW91dCAoc29tZSBhc3luYyBzdHVmZiA/IT8pXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAvLyBhbml0bWF0ZSBtYXJnaW4gYW5kIG9wYWNpdHkgYmVmb3JlIGhpZGluZyB0aGUgc3VibWVudVxuICAgICAgLy8gdGhpcyB0cmlnZ2VycyBDU1MgVHJhbnNpdGlvbiBldmVudFxuICAgICAgdGhpcy5zZXRNYXJnaW4oKTtcbiAgICAgIHRoaXMubWFpbk1lbnUuZWxfLnN0eWxlLm9wYWNpdHkgPSAnMSc7XG4gICAgfSwgMCk7XG4gIH1cblxuICBidWlsZCgpIHtcbiAgICB0aGlzLnNldHRpbmdzU3ViTWVudVRpdGxlRWxfLmlubmVySFRNTCA9IHRoaXMuc3ViTWVudS5jb250cm9sVGV4dF8gKyAnOic7XG4gICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVFbF8uYXBwZW5kQ2hpbGQodGhpcy5zdWJNZW51Lm1lbnUuZWxfKTtcbiAgICB0aGlzLnBhbmVsQ2hpbGRFbC5hcHBlbmRDaGlsZCh0aGlzLnNldHRpbmdzU3ViTWVudUVsXyk7XG5cbiAgICB0aGlzLnVwZGF0ZSgpO1xuXG4gICAgdGhpcy5jcmVhdGVCYWNrQnV0dG9uKCk7XG4gICAgdGhpcy5nZXRTaXplKCk7XG4gICAgdGhpcy5iaW5kQ2xpY2tFdmVudHMoKTtcblxuICAgIC8vIHByZWZpeGVkIGV2ZW50IGxpc3RlbmVycyBmb3IgQ1NTIFRyYW5zaXRpb25FbmRcbiAgICB0aGlzLlByZWZpeGVkRXZlbnQoXG4gICAgICB0aGlzLnNldHRpbmdzU3ViTWVudUVsXyxcbiAgICAgICdUcmFuc2l0aW9uRW5kJyxcbiAgICAgIHRoaXMudHJhbnNpdGlvbkVuZEhhbmRsZXIsXG4gICAgICAnYWRkRXZlbnQnXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIHN1YiBtZW51c1xuICAgKlxuICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgKi9cbiAgdXBkYXRlKGV2ZW50KSB7XG4gICAgbGV0IHRhcmdldCA9IG51bGw7XG4gICAgbGV0IHN1Yk1lbnUgPSB0aGlzLnN1Yk1lbnUubmFtZSgpO1xuXG4gICAgaWYgKGV2ZW50ICYmIGV2ZW50LnR5cGUgPT09ICd0YXAnKSB7XG4gICAgICB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG4gICAgfSBlbHNlIGlmIChldmVudCkge1xuICAgICAgdGFyZ2V0ID0gZXZlbnQuY3VycmVudFRhcmdldDtcbiAgICB9XG5cbiAgICAvLyBQbGF5YmFjayByYXRlIG1lbnUgYnV0dG9uIGRvZXNuJ3QgZ2V0IGEgdmpzLXNlbGVjdGVkIGNsYXNzXG4gICAgLy8gb3Igc2V0cyBvcHRpb25zX1snc2VsZWN0ZWQnXSBvbiB0aGUgc2VsZWN0ZWQgcGxheWJhY2sgcmF0ZS5cbiAgICAvLyBUaHVzIHdlIGdldCB0aGUgc3VibWVudSB2YWx1ZSBiYXNlZCBvbiB0aGUgbGFiZWxFbCBvZiBwbGF5YmFja1JhdGVNZW51QnV0dG9uXG4gICAgaWYgKHN1Yk1lbnUgPT09ICdQbGF5YmFja1JhdGVNZW51QnV0dG9uJykge1xuICAgICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVWYWx1ZUVsXy5pbm5lckhUTUwgPSB0aGlzLnN1Yk1lbnUubGFiZWxFbF8uaW5uZXJIVE1MO1xuICAgICAgdGhpcy5sb2FkTWFpbk1lbnUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTG9vcCB0cm91Z2ggdGhlIHN1Ym1lbnUgaXRlbXMgdG8gZmluZCB0aGUgc2VsZWN0ZWQgY2hpbGRcbiAgICAgIGZvciAobGV0IHN1Yk1lbnVJdGVtIG9mIHRoaXMuc3ViTWVudS5tZW51LmNoaWxkcmVuXykge1xuICAgICAgICBpZiAoIShzdWJNZW51SXRlbSBpbnN0YW5jZW9mIGNvbXBvbmVudCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoc3ViTWVudSkge1xuICAgICAgICBjYXNlICdTdWJ0aXRsZXNCdXR0b24nOlxuICAgICAgICBjYXNlICdDYXB0aW9uc0J1dHRvbic6XG4gICAgICAgICAgLy8gc3VidGl0bGVzQnV0dG9uIGVudGVyaW5nIGRlZmF1bHQgY2hlY2sgdHdpY2UgYW5kIG92ZXJ3cml0aW5nXG4gICAgICAgICAgLy8gc2VsZWN0ZWQgbGFiZWwgaW4gbWFpbiBtYW51XG4gICAgICAgICAgaWYgKHN1Yk1lbnVJdGVtLmhhc0NsYXNzKCd2anMtc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgdGhpcy5zZXR0aW5nc1N1Yk1lbnVWYWx1ZUVsXy5pbm5lckhUTUwgPSBzdWJNZW51SXRlbS5vcHRpb25zXy5sYWJlbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAvLyBTZXQgc3VibWVudSB2YWx1ZSBiYXNlZCBvbiB3aGF0IGl0ZW0gaXMgc2VsZWN0ZWRcbiAgICAgICAgICBpZiAoc3ViTWVudUl0ZW0ub3B0aW9uc18uc2VsZWN0ZWQgfHwgc3ViTWVudUl0ZW0uaGFzQ2xhc3MoJ3Zqcy1zZWxlY3RlZCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNldHRpbmdzU3ViTWVudVZhbHVlRWxfLmlubmVySFRNTCA9IHN1Yk1lbnVJdGVtLm9wdGlvbnNfLmxhYmVsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0ICYmICF0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCd2anMtYmFjay1idXR0b24nKSkge1xuICAgICAgICB0aGlzLnNldHRpbmdzQnV0dG9uLmhpZGVEaWFsb2coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBiaW5kQ2xpY2tFdmVudHMoKSB7XG4gICAgZm9yIChsZXQgaXRlbSBvZiB0aGlzLnN1Yk1lbnUubWVudS5jaGlsZHJlbigpKSB7XG4gICAgICBpZiAoIShpdGVtIGluc3RhbmNlb2YgY29tcG9uZW50KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGl0ZW0ub24oWyd0YXAnLCAnY2xpY2snXSwgdGhpcy5zdWJtZW51Q2xpY2tIYW5kbGVyKTtcbiAgICB9XG4gIH1cblxuICAvLyBzYXZlIHNpemUgb2Ygc3VibWVudXMgb24gZmlyc3QgaW5pdFxuICAvLyBpZiBudW1iZXIgb2Ygc3VibWVudSBpdGVtcyBjaGFuZ2UgZGluYW1pY2FsbHkgbW9yZSBsb2dpYyB3aWxsIGJlIG5lZWRlZFxuICBnZXRTaXplKCkge1xuICAgIHRoaXMuZGlhbG9nLnJlbW92ZUNsYXNzKCd2anMtaGlkZGVuJyk7XG4gICAgdGhpcy5zaXplID0gdGhpcy5zZXR0aW5nc0J1dHRvbi5nZXRDb21wb25lbnRTaXplKHRoaXMuc2V0dGluZ3NTdWJNZW51RWxfKTtcbiAgICB0aGlzLnNldE1hcmdpbigpO1xuICAgIHRoaXMuZGlhbG9nLmFkZENsYXNzKCd2anMtaGlkZGVuJyk7XG4gICAgdmlkZW9qcy5hZGRDbGFzcyh0aGlzLnNldHRpbmdzU3ViTWVudUVsXywgJ3Zqcy1oaWRkZW4nKTtcbiAgfVxuXG4gIHNldE1hcmdpbigpIHtcbiAgICBsZXQgW3dpZHRoXSA9IHRoaXMuc2l6ZTtcblxuICAgIHRoaXMuc2V0dGluZ3NTdWJNZW51RWxfLnN0eWxlLm1hcmdpblJpZ2h0ID0gYC0ke3dpZHRofXB4YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlIHRoZSBzdWIgbWVudVxuICAgKi9cbiAgaGlkZVN1Yk1lbnUoKSB7XG4gICAgLy8gYWZ0ZXIgcmVtb3Zpbmcgc2V0dGluZ3MgaXRlbSB0aGlzLmVsXyA9PT0gbnVsbFxuICAgIGlmICghdGhpcy5lbF8pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodmlkZW9qcy5oYXNDbGFzcyh0aGlzLmVsXywgJ29wZW4nKSkge1xuICAgICAgdmlkZW9qcy5hZGRDbGFzcyh0aGlzLnNldHRpbmdzU3ViTWVudUVsXywgJ3Zqcy1oaWRkZW4nKTtcbiAgICAgIHZpZGVvanMucmVtb3ZlQ2xhc3ModGhpcy5lbF8sICdvcGVuJyk7XG4gICAgfVxuICB9XG5cbn1cblxuU2V0dGluZ3NNZW51SXRlbS5wcm90b3R5cGUuY29udGVudEVsVHlwZSA9ICdidXR0b24nO1xuXG52aWRlb2pzLnJlZ2lzdGVyQ29tcG9uZW50KCdTZXR0aW5nc01lbnVJdGVtJywgU2V0dGluZ3NNZW51SXRlbSk7XG5leHBvcnQgZGVmYXVsdCBTZXR0aW5nc01lbnVJdGVtO1xuIiwiZXhwb3J0IGZ1bmN0aW9uIHRvVGl0bGVDYXNlKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpO1xufTtcbiIsImltcG9ydCAnLi9jb21wb25lbnRzL3NldHRpbmdzLW1lbnUtYnV0dG9uLmpzJztcbmltcG9ydCAnLi9jb21wb25lbnRzL3NldHRpbmdzLW1lbnUtaXRlbS5qcyc7XG4iXX0=
