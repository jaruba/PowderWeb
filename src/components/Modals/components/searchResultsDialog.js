import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import _ from 'lodash'

import api from 'utils/api'

import events from 'utils/events'

let activeSearchId

const readableSize = (fileSizeInBytes) => {
    
    if (!fileSizeInBytes) return '0.0 kB';
    
    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
        fileSizeInBytes = fileSizeInBytes / 1024;
        i++;
    } while (fileSizeInBytes > 1024);
    
    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      searchResults: [],
      query: ''
    }
  }

  componentDidMount = () => {

    this.setState({
      query: this.props.query,
      searchResults: []
    })

    const search = (query) => {

//      activeSearchQuery = query

      const getSearch = async (searchId) => {
        const parsed = await api.get({ method: 'search', utime: searchId, json: true })
        if (parsed) {
          if (activeSearchId == searchId) {
            if (parsed.results && parsed.results.length) {
              this.setState({
                searchResults: _.orderBy(this.state.searchResults.concat(parsed.results), ['seeders'], ['desc'])
              })
              setTimeout(() => {
                getSearch(searchId)
              }, 500)
            } else if (parsed.ended) {
              if (document.getElementById('search-spinner'))
                document.getElementById('search-spinner').active = false
            } else {
              setTimeout(() => {
                getSearch(searchId)
              }, 500)
            }
          }
        } else {
//          console.log('no parse')
        }
      }

      const doSearch = async (query) => {
        const parsed = await api.get({ method: 'search', query, json: true })

        if (parsed && parsed.value) {
          const searchId = parsed.value
          activeSearchId = searchId
          getSearch(searchId)
        }

      }

      doSearch(query)

    }

    search(this.props.query)

    document.getElementById('search-spinner').active = true

  }

  componentWillUnmount = () => {

  }

  torrent2magnet() {

    var fileInput = document.getElementById('fileInput')
    if (fileInput && fileInput.files && fileInput.files.length) {
      const file = fileInput.files[0]
      const reader = new FileReader()

      reader.onload = () => {

        const view = new Uint8Array(reader.result)
        const buffer = new Buffer(view.byteLength)

        for (let i = 0; i < buffer.length; ++i)
          buffer[i] = view[i]

        api.addMagnet(parseTorrent.toMagnetURI(parseTorrent(buffer)))

      }

      reader.readAsArrayBuffer(file)
    }
  }

  closingSearchDialog() {
    document.getElementById("doSearchDialog").removeEventListener('iron-overlay-canceled', this.closingSearchDialog)
    document.getElementById("addSearchQuery").value = ''
  }

  cancelSearchResults() {
    document.getElementById("searchResultsDialog").close()
    activeSearchId = false
  }

  handleSearching(query) {
    document.getElementById("searchResultsDialog").close()
    activeSearchId = false
    api.addMagnet(query)
  }

  torrentList() {
    let fileList = []

    let backColor = '#3e3e3e'

    _.forEach(this.state.searchResults, (el, ij) => {

      backColor = backColor == '#444' ? '#3e3e3e' : '#444'

      const newFile = (
          <div key={ij} className="dashboardFile" style={{backgroundColor: backColor, padding: '0'}}>
              <div className="torrentFile" onClick={this.handleSearching.bind(this, (el.magneturl || el.link))} style={{height: '62px', padding: '0 15px'}}>
                  <div className="torrentFileDetails" style={{margin: '0', textAlign: 'left'}}>
                      <div className="torrentFileName">{el.title} - {readableSize(el.size)}</div>
                      <div className="torrentFileSubtitle">{el.seeders} / {el.peers} - {el.indexer}</div>
                  </div>
                  <div style={{clear: 'both'}} />
              </div>
              <div style={{clear: 'both'}} />
          </div>
      );
      fileList.push(newFile);
    })

    return fileList
  }

  render() {
    return (

        <paper-dialog
            id="searchResultsDialog"
            horizontal-align="left"
            horizontal-offset="0"
            style={{display: 'none', maxWidth: '100%', width: '100%', padding: '0', marginTop: '57px', marginBottom: '0px', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center', borderRadius: '0', height: 'calc(100% - 57px)'}}
            on-iron-overlay-closed={this.closingSearchDialog}
            opened={true}
            with-backdrop >
            <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'left', padding: '0', marginBottom: '6px', lineHeight: '39px', fontSize: '15px', opacity: '0.7', marginLeft: '8px'}}>
              {this.state.query}
            </div>
            <div style={{marginTop: '0', marginBottom: '0', display: 'inline-block', float: 'right', padding: '0', marginBottom: '6px'}}>
              <paper-spinner id="search-spinner" className="white" style={{ width: '18px', height: '18px', margin: '8px', verticalAlign: 'middle', marginRight: '12px', opacity: '0.8' }} active></paper-spinner>
              <paper-icon-button style={{color: '#cacaca', cursor: 'pointer', width: '40px', height: '40px'}} onClick={this.cancelSearchResults.bind(this)} icon="close" />
            </div>
            <div style={{clear: 'both'}}/>
            <div id="searchResultsList" class="modalScroll">
              {this.torrentList()}
            </div>
        </paper-dialog>

    )
  }
}
