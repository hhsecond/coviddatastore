import React, { Component } from 'react'
import { reduxForm, Field } from 'redux-form'
import { compose } from 'redux'
import { connect } from 'react-redux'
import actions from '../../../actions'
import LoginComponent from '../../../components/Login'
import { Button, Card, CardBody, CardGroup, Col, Container, Form, InputGroup, InputGroupAddon, InputGroupText, Row } from 'reactstrap'

const {login, changeView} = actions
class Login extends Component {

  constructor(props) {
    super(props);
    this.state = {
      username: null,
      password: null,
    };
  }

  onChange=(e)=>{
    this.setState({[e.target.name]:e.target.value})
  }

  onSubmit = () => {
    this.props.login({password:this.state.password, user_name:this.state.username}, ()=> {
      this.props.history.push('/dashboard')
    })
  }

  render() {
    
    return (
      <React.Fragment>
      <LoginComponent onSubmit={this.onSubmit} onChange={this.onChange} password={this.state.password} username={this.props.username} />
      </React.Fragment>
    )
  }
}

function mapStateToProps(state) {
  return { errorMessage: state.auth.errorMessage }
}

export default compose(
  connect(mapStateToProps, {login, changeView}),
  reduxForm({ form: 'login' })
)(Login)
