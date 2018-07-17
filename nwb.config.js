const path = require('path')
const dotenv = require('dotenv')
const getPortSync = require('get-port-sync')

let port
let peerflixProxy

for (let maybePort = 11485; maybePort -1 != port; maybePort++)
  port = getPortSync({ port: maybePort })

for (let maybePort = port+1; maybePort -1 != peerflixProxy; maybePort++)
  peerflixProxy = getPortSync({ port: maybePort })

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
      context: ["/playlist.m3u", "/getplaylist.m3u", "/srt2vtt/subtitle.vtt", "/404", "/actions", "/subUpload"],
      target: "http://localhost:" + port,
      proxyTimeout: Number.MAX_SAFE_INTEGER,
      onProxyReq: (proxyReq, req, res) => req.setTimeout(Number.MAX_SAFE_INTEGER)
    }, {
      context: ["/api", "/web", "/meta"],
      target: "http://localhost:" + peerflixProxy,
      proxyTimeout: Number.MAX_SAFE_INTEGER,
      onProxyReq: (proxyReq, req, res) => req.setTimeout(Number.MAX_SAFE_INTEGER)
    }]
  }
}
