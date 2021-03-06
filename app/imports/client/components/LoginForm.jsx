import React, { Component, } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { Meteor } from 'meteor/meteor';
import Button from '@material-ui/core/Button';

// Import components
import TextField from '/imports/client/components/TextField.jsx';

class LoginForm extends Component {

  constructor(props) {
    super(props);

    this.state = { user: false }
  }

  setUser(error, users) {
    if(!error && (users.length >0)) {
      this.setState({ user: users[0]});
    }
  }

  handleChange(e) {
    var email = $(e.target).val();
    if(email.includes('@')) {
      Meteor.call('login.finduser', $(e.target).val(), this.setUser.bind(this));
    }
  };

  // submitForm :: Event -> void
  submitForm(e) {
    e.preventDefault();

    // Function that gets the value of an input field referenced by ref="name"
    const val = name => ReactDOM.findDOMNode(this.refs[name]).value;

    // If there's an account with this email address already:
    if(this.state.user) {
      // Login
      this.props.loginHandler({
        username: val('email'),
        password: val('password')
      });
    }

    // If no account was found with this email adress:
    else{
      // SignUp
      this.props.signUpHandler({
        email: val('email'),
        password: val('password'),
        password2: val('password2')
      });
    }
  }

  render() {
    return (
      <form style={s.base} onSubmit={this.submitForm.bind(this)} method="post">

        <div style={s.label}>E-mailadres</div>
        <TextField type="email" ref="email" placeholder="Your e-mailadress" name="email" style={s.textField} onChange={this.handleChange.bind(this)} />

        <div style={s.label}>Wachtwoord</div>
        <TextField type="password" ref="password" placeholder="Fill in an unique password" name="password" style={s.textField} />

        <div style={Object.assign({display: 'block', maxWidth: '100%'}, this.state.user && {display: 'none'})}>
          <div style={s.label}>Herhaal je wachtwoord</div>
          <TextField type="password" ref="password2" placeholder="Repeat your password" name="password2" style={s.textField} />
        </div>
        
        <div>
          <Button style={{color:'black', backgroundColor: 'white'}}variant='outlined' type='submit'>{this.state.user? 'LOGIN':'REGISTER' } </Button>
        </div>

      </form>
    )
  }

};

var s = {
  base: {
    display: 'flex',
    flexDirection: 'column',
    // flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center'
  },
  label: {
    display: 'none',
  },
  textField: {
    display: 'inline-block',
    width: '300px',
    maxWidth: '100%',
  },
  button: {
    marginTop: '5px',
    marginBottom: '5px',
    width: '300px',
    maxWidth: '100%'
  }
}

LoginForm.propTypes = {
  loginHandler: PropTypes.any.isRequired,
  signUpHandler: PropTypes.any.isRequired
};

export default LoginForm;
