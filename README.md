# Powder Web

Modern Bittorrent Client with Web UI and Torrent Streaming Capabilities. Also Supports Acestream and SopCast Live Streams.

[See Screenshots](https://imgur.com/a/Jnxf0wf)

[Guide](https://github.com/jaruba/PowderWeb/wiki/Guide)

[Chat](https://gitter.im/jaruba/PowderWeb)


## Possible use cases include:

- Use your PC as a Streaming Server for all your Devices either for your Entire Home, or for when you're On the Go
- Streaming Torrents, Acestream, SopCast to your Smart TV's Browser (no other devices or direct conectivity needed), or your Phone's Browser, or any device that has a browser!
- Stream Local Media to Any Device
- Associate Magnet / Acestream / SopCast Links or Torrent Files to Powder Web and configure it to start playback automatically with your favorite video player (or even the web player)
- Finding Subtitles Easily for Videos in Torrents (subtitles are fetched automatically for the Web Player, there is also a button to manually get and download subtitles if you prefer using a different player)
- Watch with Friends from a Distance, you can Sync Playback with one or more Friends (supports creating accounts for the web view, if multiple people log in on the same account, you can sync playback with what others are watching by using the history feature)
- Allowing Websites to Embed Torrent Streaming (for security reasons users need to allow websites to embed torrents through Powder Web individually, either allowing one session or always allowing that specific website)
- Replace your Favorite Torrent Sites with one Search that searches them all (supports [Jackett](https://github.com/Jackett/Jackett), 'nuf said)
- Web Player that is embeddable in Websites! If you're a web developer, you can create websites that support torrent, acestream and sopcast streaming in the browser through Powder Web


## Features:

- Supports Streaming Torrents (both video and audio files)
- Supports Acestream Live Streams
- Supports SopCast Live Streams
- Supports Streaming Local Files (can add individual files or entire folders)
- Streaming to your Preferred Video Player (by generating M3U playlists)
- Streaming to your Browser (works on all Devices and all Browsers)
- Find Subtitles for every Video File in Torrents (either automatically in the Web Player, or by using the "Find Subtitles" button in the torrent file settings to find / download subtitles)
- Supports Embedding in Websites (user needs to approve website)
- Supports Allowing User Registration (default is 0 users)
- Advanced Web Player (playlist, searches for subtitles automatically, add local subtitle file, quality selection, playback speed, aspect ratio, crop, zoom, subtitle delay, audio delay, [hotkeys](https://github.com/jaruba/PowderWeb/wiki/Web-Player-Hotkeys))
- Searching for Torrents with [Jackett](https://github.com/Jackett/Jackett)
- Associate with Magnet / Acestream / SopCast Links or Torrent Files
- Supports SSL (users can activate Self Signed Certificates)
- Supports Secondary Torrent Client (you can set a secondary torrent client that will be used if the torrent does not include any video files)
- Advanced Torrent and Web Server Settings
- Managing Multiple Torrents, Live Streams, Local Media


## Install:

```
npm install
cd public
bower install
```


## Running:

```
npm start
```


## Building:

```
npm run build
```


## Embedding in Websites

Can be started with either Magnet Links, Acestream Links, SopCast Links or Torrent File HTTP(S) Link.

Add Script to `<head>`:

```
<script src="https://powder.media/embed.js"></script>
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

[Embed Demo](http://powder.media/embed-test.html)

**Note**: Embedding will not work on websites that use SSL unless [users follow this guide](https://github.com/jaruba/PowderWeb/wiki/Guide#enabling-ssl) to enable SSL in Powder Web too.


### Technologies Used

[Electron](https://electronjs.org/), [React](https://reactjs.org/), [Polymer](https://www.polymer-project.org/), [Peerflix](https://github.com/mafintosh/peerflix), [FFmpeg](https://www.ffmpeg.org/) and many others listed in the dependencies section of the `package.json` file.
