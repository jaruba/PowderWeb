
export const getParameterByName = (name, url) => {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export const readableSize = (fileSizeInBytes) => {

	if (!fileSizeInBytes) return '0.0 kB';

	var i = -1;
	var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
	do {
		fileSizeInBytes = fileSizeInBytes / 1024;
		i++;
	} while (fileSizeInBytes > 1024);

	return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

export const humanReadableTime = (secs) => {
    var numhours = Math.floor(((secs % 31536000) % 86400) / 3600);
    var numminutes = Math.floor((((secs % 31536000) % 86400) % 3600) / 60);
    var numseconds = (((secs % 31536000) % 86400) % 3600) % 60;
    return (numhours ? (numhours + 'h ') : '') + (numminutes ? (numminutes + 'm ') : '') + (numseconds ? (numseconds + 's') : '');
}

export const jackettLinkAnchor = () => {

	var OSName = 'Unknown OS'

	if (navigator.appVersion.indexOf('Win') != -1) OSName = 'Windows'
	if (navigator.appVersion.indexOf('Mac') != -1) OSName = 'MacOS'
	if (navigator.appVersion.indexOf('X11') != -1) OSName = 'UNIX'
	if (navigator.appVersion.indexOf('Linux') != -1) OSName = 'Linux'

	var linkAnchor = ''

	if (['Unknown OS', 'Windows'].indexOf(OSName) > -1) {
		linkAnchor = 'installation-on-windows'
	} else if (['MacOS'].indexOf(OSName) > -1) {
		linkAnchor = 'installation-on-macos'
	} else if (['UNIX', 'Linux'].indexOf(OSName) > -1) {
		linkAnchor = 'installation-on-linux'
	}

	return linkAnchor

}

export default {}