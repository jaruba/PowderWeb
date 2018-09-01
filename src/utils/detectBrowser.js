// please note, 
// that IE11 now returns undefined again for window.chrome
// and new Opera 30 outputs true for window.chrome
// but needs to check if window.opr is not undefined
// and new IE Edge outputs to true now for window.chrome
// and if not iOS Chrome check
// so use the below updated condition
var isChromium = window.chrome;
var winNav = window.navigator;
var ua = winNav.userAgent;
var vendorName = winNav.vendor;
var isOpera = typeof window.opr !== "undefined";
var isIEedge = ua.indexOf("Edge") > -1;
var isIOSChrome = ua.match("CriOS");
var isFirefox = ua.toLowerCase().indexOf('firefox') > -1
var isIE = ((ua.indexOf('MSIE ') > -1) || (ua.indexOf('Trident/') > -1))
var isSafari = /^((?!chrome|android).)*safari/i.test(ua)
var isTizen = ua.indexOf('Tizen') > -1

var isChrome = function() {
	if (isIOSChrome) {
	   // is Google Chrome on IOS
	   return false // chrome on iOS uses HLS
	} else if(
	  isChromium !== null &&
	  typeof isChromium !== "undefined" &&
	  vendorName === "Google Inc." &&
	  isOpera === false &&
	  isIEedge === false
	) {
		return true
	   // is Google Chrome
	} else { 
		return false
	   // not Google Chrome 
	}
}

module.exports = {
	isChrome: isChrome(),
	isEdge: isIEedge,
	isOpera: isOpera,
	isFirefox: isFirefox,
	isIE: isIE,
	isSafari: isSafari,
	isTizen: isTizen
}