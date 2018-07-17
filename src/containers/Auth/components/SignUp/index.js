import React, { PureComponent } from 'react'
import { Form, GitHubButton, GoogleButton } from 'elements'
import { Button } from 'react-interface'
import Wrapper from './Wrapper'

export default class SignUp extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      email: '',
      password: '',
      confirm: ''
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
        <input type="password" name="confirm" placeholder="Confirm Password" onChange={this.handleChange} />
        <Button type="submit" onClick={this.handleSubmit}>Sign Up</Button>
      </Form>
    )
  }

  render () {
    return (
      <Wrapper>
        {this.renderEmailForm()}
      </Wrapper>
    )
  }
}
