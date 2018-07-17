# Powder Web

Modern Bittorrent Client with Web UI and Torrent Streaming Capabilities.


## Possible use cases include:

- Use your PC as a Torrent Streaming Server for all your Devices either for your Entire Home, or for when you're On the Go
- Streaming Torrents to your Browser
- Finding Subtitles Easily for Videos in Torrents (subtitles are fetched automatically for the Web Player, there is also a button to manually get and download subtitles if you prefer using a different player)
- Watch with Friends from a Distance, you can Sync Playback with one or more Friends (supports creating accounts for the web view, if multiple people log in on the same account, you can sync playback with what others are watching by using the history feature)
- Allowing Websites to Embed Torrent Streaming (for security reasons users need to allow websites to embed torrents through Powder Web individually, either allowing one session or always allowing that specific website)
- Replace your Favorite Torrent Sites with one Search that searches them all (supports [Jackett](https://github.com/Jackett/Jackett), 'nuf said)


## Features:

- Streaming to your preferred video player (by generating M3U playlists)
- Streaming to your browser (works on all Devices and all Browsers)
- Find Subtitles for every video file in torrents (either automatically in the Web Player, or by using the "Find Subtitles" button in the torrent file settings to find / download subtitles)
- Supports Embedding in Websites (user needs to approve website)
- Advanced Web Player (playlist, searches for subtitles automatically, add local subtitle file, aspect ratio, crop, zoom, subtitle delay, audio delay, [hotkeys](https://github.com/jaruba/PowderWeb/wiki/Web-Player-Hotkeys))
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

```
npm run build
npm run package
```

