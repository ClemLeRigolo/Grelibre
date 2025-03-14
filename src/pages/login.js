import React from "react";
import { Link, Redirect } from "react-router-dom";

import { authStates, withAuth } from "../components/auth";
import fr from "../utils/i18n";
import Loader from "../components/loader";
import { getUserData, signIn } from "../utils/firebase";
import { validateEmailPassword } from "../utils/helpers";

import "../styles/login.css";
import Password from "../components/password";

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: undefined,
      surname: "",
      name: "",
      email: "",
      password: "",
      retype: "",
      error: ""
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.value;
    const name = target.name;

    this.setState({
      [name]: value,
      error: "",
    });
  }

  handleSubmit(event) {
    event.preventDefault();

    if (this.state.error) {
      return;
    }

    //Validate email & password
    const errorMsg = validateEmailPassword(
      this.state.email,
      this.state.password,
      true
    );

    if (errorMsg) {
      this.setState({
        error: errorMsg,
      });
      return;
    }

    signIn(this.state.email, this.state.password)
      .then(() => {
        getUserData(this.state.email)
        .then((userData) => {
          // Récupérer le nom et le prénom de l'utilisateur
          const { firstName, lastName } = userData;

          this.setState({
            firstName,
            lastName,
          });
        })
        .catch((error) => {
          console.log("Erreur lors de la récupération des informations de l'utilisateur", error);
        });
      })
      .catch(e => {
        console.log("Error signing in", e);
        this.setState({
          error: "Incorrect email/password",
        });
      });
  }
  render() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');

    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.props.authState === authStates.LOGGED_IN) {
      return <Redirect to={`${redirect}`}></Redirect>;
    }

    const errorMsg = this.state.error;

    return (
      <div className="container">
      <form onSubmit={this.handleSubmit}>
        <div className="content">
          <div className="login">
          <h2>{fr.GREETINGS.LOGIN}</h2>

          <input
            type="text"
            placeholder={fr.FORM_FIELDS.EMAIL}
            name="email"
            onChange={this.handleInputChange}
            className="easy-nput"
            required
          />

          <Password
            onPasswordTextChanged={(password) => this.setState({password : password})}
            placeholder={fr.FORM_FIELDS.PASSWORD}
            required={true}
            name="password"
          />
          {errorMsg && <p className="error">{errorMsg}</p>}
          <button id="login-button" className="log-button" type="submit">
            {fr.FORM_FIELDS.LOGIN}
          </button>
          <Link to="/reset" data-cy='reset'>{fr.FORM_FIELDS.FORGOT_PASSWORD}</Link>

          <p>{fr.FORM_FIELDS.LOGIN_ALT_TEXT}</p>
          <Link to={`/signup?redirect=${redirect}`}>Créer un compte</Link>
          </div>
        </div>
      </form>
      </div>
    );
  }
}

export default withAuth(Login);
