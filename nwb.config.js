const path = require('path')
const dotenv = require('dotenv')
const getPort = require('get-port')


let port

let peerflixProxy

if (process.env.PWFRONTPORT) {
  port = process.env.PWFRONTPORT
}

if (process.env.PWBACKPORT) {
  peerflixProxy = process.env.PWBACKPORT
}

// In development use a .env file for convenience
if (process.env.NODE_ENV === 'development') {
  dotenv.config()
}

module.exports = {
  type: 'react-app',
  webpack: {
    entry: [
     'babel-polyfill', // Load this first
     'react-hot-loader/patch', // This package already requires/loads react (but not react-dom). It must be loaded after babel-polyfill to ensure both react and react-dom use the same Symbol.
     'react', // Include this to enforce order
     'react-dom', // Include this to enforce order
     './index.js' // Path to your app's entry file
    ],
    aliases: {
      containers: path.resolve('src/containers'),
      components: path.resolve('src/components'),
      utils: path.resolve('src/utils'),
      middlewares: path.resolve('src/middlewares'),
      elements: path.resolve('src/elements'),
      HOC: path.resolve('src/HOC'),
      svg: path.resolve('src/svg'),
    },
    define: {
      AUTH0_ID: JSON.stringify(process.env.AUTH0_ID),
      AUTH0_DOMAIN: JSON.stringify(process.env.AUTH0_DOMAIN),
    },
  },
  devServer: {
    proxy: [{
      context: ["/playlist.m3u", "/getplaylist.m3u", "/getaceplaylist.m3u", "/getsopplaylist.m3u", "/getlocalplaylist.m3u", "/getytdlplaylist.m3u", "/srt2vtt/subtitle.vtt", "/404", "/actions", "/subUpload"],
      target: "http://localhost:" + port,
      proxyTimeout: Number.MAX_SAFE_INTEGER,
      onProxyReq: (proxyReq, req, res) => req.setTimeout(Number.MAX_SAFE_INTEGER)
    }, {
      context: ["/api/", "/web/", "/meta/", "/hls/", "/ace/", "/content/", "/sop/", "/local/", "/ytdl/"],
      target: "http://localhost:" + peerflixProxy,
      proxyTimeout: Number.MAX_SAFE_INTEGER,
      onProxyReq: (proxyReq, req, res) => req.setTimeout(Number.MAX_SAFE_INTEGER)
    }]
  }
}
