# Powder Web

Modern Bittorrent Client with Web UI and Torrent Streaming Capabilities.


## Possible use cases include:

- Use your PC as a Torrent Streaming Server for all your Devices either for your Entire Home, or for when you're On the Go
- Streaming Torrents to your Browser (works on all Devices and all Browsers)
- Finding Subtitles Easily for Videos in Torrents (subtitles are fetched automatically for the Web Player, there is also a button to manually get and download subtitles if you prefer using a different player)
- Watch with Friends from a Distance, you can Sync Playback with one or more Friends (supports creating accounts for the web view, if multiple people log in on the same account, you can sync playback with what others are watching by using the history feature)
- Allowing Websites to Embed Torrent Streaming (for security reasons users need to allow websites to embed torrents through Powder Web individually, either allowing one session or always allowing that specific website)
- Replace your Favorite Torrent Sites with one Search that searches them all (supports [Jackett](https://github.com/Jackett/Jackett), 'nuf said)


## Features:

- Streaming to your Preferred Video Player (by generating M3U playlists)
- Streaming to your Browser (works on all Devices and all Browsers)
- Find Subtitles for every Video File in Torrents (either automatically in the Web Player, or by using the "Find Subtitles" button in the torrent file settings to find / download subtitles)
- Supports Embedding in Websites (user needs to approve website)
- Advanced Web Player (playlist, searches for subtitles automatically, add local subtitle file, quality selection, playback speed, aspect ratio, crop, zoom, subtitle delay, audio delay, [hotkeys](https://github.com/jaruba/PowderWeb/wiki/Web-Player-Hotkeys))
- Advanced Torrent Settings
- Managing Multiple Torrents


## Install:

```
npm install
cd public
bower install
```


## Running:

Run Front-end:

```
npm start
```


Run Back-end (in a different terminal):

```
npm run electron
```


## Building:

Requires babel (`npm i babel-cli -g`), because of a node module that is written in ES6 and breaks building the front-end of the application.

```
babel node_modules/hue-name/index.js --out-file node_modules/hue-name/index.js --presets=env
npm run build
npm run package
```


## Embedding in Websites

Can be started with either Magnet Link or Torrent File HTTP(S) Link.

Add Script to `<head>`:

```
<script src="http://powder.media/embed.js"></script>
```


Start Web Player on a `<div>`:

```
<div id="testEmbed"></div>
<script>
  window.powder.stream(

    '#testEmbed',

    'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F'

  )
</script>
```
