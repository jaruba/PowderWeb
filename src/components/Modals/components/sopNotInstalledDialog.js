import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

export default class Modals extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {}
  }

  componentWillMount = () => {}

  componentDidMount = async () => {}

  componentWillUnmount = () => {}

  render() {
    return (
        <paper-dialog
            id="sopInstallDialog"
            style={{width: '440px', textAlign: 'left', borderRadius: '3px', maxWidth: '90%', backgroundColor: '#303030', color: 'white', padding: '20px', textAlign: 'center'}}
            opened={true}
            with-backdrop >
            
            <div style={{margin: '0', marginBottom: '5px', fontSize: '16px'}}>
                Sopcast is not installed, use Powder Web with the admin account to install Sopcast.
            </div>

        </paper-dialog>
    )
  }
}
