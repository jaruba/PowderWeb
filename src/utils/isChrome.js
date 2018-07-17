// please note, 
// that IE11 now returns undefined again for window.chrome
// and new Opera 30 outputs true for window.chrome
// but needs to check if window.opr is not undefined
// and new IE Edge outputs to true now for window.chrome
// and if not iOS Chrome check
// so use the below updated condition
var isChromium = window.chrome;
var winNav = window.navigator;
var vendorName = winNav.vendor;
var isOpera = typeof window.opr !== "undefined";
var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
var isIOSChrome = winNav.userAgent.match("CriOS");

module.exports = function() {
	if (isIOSChrome) {
	   // is Google Chrome on IOS
	   return false // chrome on iOS uses HLS
	} else if(
	  isChromium !== null &&
	  typeof isChromium !== "undefined" &&
	  vendorName === "Google Inc." &&

	// opera is still chrome for us transcoding wise
	//  isOpera === false &&
	  isIEedge === false
	) {
		return true
	   // is Google Chrome
	} else { 
		return false
	   // not Google Chrome 
	}
}
