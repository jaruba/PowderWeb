import React, { PureComponent } from 'react'
import { Button } from 'react-interface'
import { Form, GitHubButton, GoogleButton } from 'elements'

export default class Login extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      email: '',
      password: '',
    }
  }

  handleSubmit = e => {
    e.preventDefault()
    this.props.onSubmit(this.state)
  }

  handleChange = e => {
    this.setState({
      [e.target.name]: e.target.value,
    })
  }

  renderEmailForm () {
    const { providers } = this.props
    if (!providers.includes('email')) return null
    return (
      <Form onSubmit={this.handleSubmit}>
        <input type="text" name="email" placeholder="Email" onChange={this.handleChange} />
        <input type="password" name="password" placeholder="Password" onChange={this.handleChange} />
        <Button type="submit" onClick={this.handleSubmit}>Sign In</Button>
      </Form>
    )
  }

  render () {
    return (
      <div>
        {this.renderEmailForm()}
      </div>
    )
  }
}
