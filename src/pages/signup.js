import React from 'react';
import { Link, Redirect } from "react-router-dom";
import { authStates, withAuth } from "../components/auth";
import { createNewUser } from "../utils/firebase";
import { validateEmailPassword } from "../utils/helpers";
import Loader from "../components/loader";
import PasswordCheck from "../components/passwordCheck";

import "../styles/login.css";
import Password from '../components/password';

class SignUp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      surname: "",
      name: "",
      email: "",
      password: "",
      retype: "",
      error: "",
      selectedImage: "ensimag", // Par défaut, sélectionnez la première image
      selectedColor: "#008437", // Par défaut, sélectionnez la première couleur
      passwordRules: {
        length: false,
        uppercase: false,
        lowercase: false,
        specialChar: false,
      },
      samePasswords: false,
      acceptTerms: false,
    };
    document.documentElement.style.setProperty('--selected-color', this.state.selectedColor)
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleTermsChange = this.handleTermsChange.bind(this);
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

  handlePassword(password) {
    if (password) {
      const passwordRules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        specialChar: /[!@#$%^&*().?,/+-]/.test(password)
      };
      this.setState({
        password: password,
        passwordRules: passwordRules
      });
      this.samePasswords(password, this.state.retype);
    }
  }


  handleRetype(retype) {
    if (retype) {
      this.setState({retype});
      this.samePasswords(this.state.password, retype);
    }
  }

  samePasswords(password, retype) {
    if (password !== retype) {
      this.setState({samePasswords : false});
      this.setState({
        error : "Les mots de passe ne correspondent pas"
      });
    }
    else {
      this.setState({samePasswords : true});
      this.setState({
        error : ""
      });
    }
  }

  handleSubmit(event) {
    event.preventDefault();

    if (this.state.error) {
      return;
    }

    // Valider l'email et le mot de passe
    const errorMsg = validateEmailPassword(
      this.state.email,
      this.state.password,
      false
    );

    if (errorMsg) {
      this.setState({
        error: errorMsg,
      });
      return;
    }

    createNewUser(this.state.email, this.state.password, this.state.surname, this.state.name)
      .then(() => {
        console.log("Signed Up!");
        //sendVerificationEmail();
      })
      .catch(e => {
        console.log("Error signing up", e);
        if (e.code === "auth/email-already-in-use") {
          this.setState({
            error: "Adresse e-mail déjà utilisée",
          });
        }
      });
  }

  handleTermsChange(event) {
    this.setState({ acceptTerms: event.target.checked });
  }

  render() {
    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.props.authState === authStates.LOGGED_IN) {
      return <Redirect to="/" />;
    }

    const errorMsg = this.state.error;

    return (
      <div className="container">
        <form onSubmit={this.handleSubmit}>
          <div className="content">
            <div className="login">
              <h2>Inscription</h2>

              <input
                type="text"
                placeholder="Prénom"
                name="name"
                onChange={this.handleInputChange}
                required
                className="easy-nput name"
              />

              <input
                type="text"
                placeholder="Nom"
                name="surname"
                onChange={this.handleInputChange}
                className="easy-nput name"
                required
              />

              <input
                type="text"
                placeholder="Email"
                name="email"
                onChange={this.handleInputChange}
                className="easy-nput"
                required
              />

              <Password onPasswordTextChanged={(password) => this.handlePassword(password)} placeholder="Mot de passe" required={true} name="password"/>
              <Password onPasswordTextChanged={(retype) => this.handleRetype(retype)} placeholder="Confirmer le mot de passe" required={true} name="retype"/>

              <PasswordCheck props={this.state.passwordRules}/>

              {/* <label>
                <input
                  name="acceptTerms"
                  type="checkbox"
                  checked={this.state.acceptTerms}
                  onChange={this.handleTermsChange} />
                J'accepte les conditions d'utilisation
              </label> */}

              {errorMsg && <p className="error">Erreur: {errorMsg}</p>}
              <div className="log-button-container">
                {/* Checkbox */}
                <div className="checkbox-container">
                  <input type="checkbox" id="acceptTerms" name="acceptTerms" onChange={this.handleTermsChange} required/>
                  <label htmlFor="acceptTerms">J'accepte les <Link to="/terms">conditions d'utilisation</Link></label>
                </div>
                <button type="submit" disabled={!this.state.acceptTerms} className="log-button">S'inscrire</button>
              </div>

              <p>Vous avez déjà un compte ?</p>
              <Link to="/login">Se connecter</Link>
            </div>
          </div>
        </form>
      </div>
    );
  }
}

export default withAuth(SignUp);
