import React from 'react';
import { Link, Redirect } from "react-router-dom";
import {
  TextInput,
  Button,
  InlineNotification,
  Form,
  Stack,
  FormGroup,
  Tile,
  Checkbox
} from "@carbon/react";
import { UserFollow, ArrowLeft } from "@carbon/icons-react";

import { authStates, withAuth } from "../components/auth";
import fr from "../utils/i18n";
import Loader from "../components/loader";
import { createNewUser } from "../utils/firebase";
import { validateEmailPassword } from "../utils/helpers";
import PasswordCheck from "../components/passwordCheck";
import Password from '../components/password';

import "../styles/login.css";

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
      selectedImage: "ensimag",
      passwordRules: {
        length: false,
        uppercase: false,
        lowercase: false,
        specialChar: false,
      },
      samePasswords: false,
      acceptTerms: false,
      loading: false
    };
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
    if (retype && password !== retype) {
      this.setState({
        samePasswords: false,
        error: "Les mots de passe ne correspondent pas"
      });
    }
    else if (retype) {
      this.setState({
        samePasswords: true,
        error: ""
      });
    }
  }

  handleTermsChange(event) {
    this.setState({ acceptTerms: event.target.checked });
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

    this.setState({ loading: true });

    createNewUser(this.state.email, this.state.password, this.state.surname, this.state.name)
      .then(() => {
        console.log("Signed Up!");
      })
      .catch(e => {
        console.log("Error signing up", e);
        let errorMessage = "Une erreur s'est produite lors de l'inscription";
        
        if (e.code === "auth/email-already-in-use") {
          errorMessage = "Cette adresse e-mail est déjà utilisée";
        }
        
        this.setState({
          error: errorMessage,
          loading: false
        });
      });
  }

  render() {
    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.props.authState === authStates.LOGGED_IN) {
      return <Redirect to="/" />;
    }

    const { error, loading, passwordRules, acceptTerms } = this.state;
    const isPasswordValid = Object.values(passwordRules).every(rule => rule === true);

    return (
      <div className="auth-container">
        {/* Bouton de retour vers l'application principale */}
        <Link to="/" className="auth-back-button">
          <ArrowLeft size={20} /> Retour à l'application
        </Link>
        
        <Tile className="auth-tile">
          <Stack gap={7}>
            <div className="auth-header">
              <UserFollow size={32} className="auth-icon" />
              <h1 className="auth-title">Inscription</h1>
            </div>
            
            <Form onSubmit={this.handleSubmit}>
              {error && (
                <InlineNotification
                  kind="error"
                  title="Erreur"
                  subtitle={error}
                  hideCloseButton={false}
                  onCloseButtonClick={() => this.setState({ error: "" })}
                  lowContrast
                  className="auth-notification"
                />
              )}
              


              <FormGroup legendText="">
                <div className="auth-form-row">
                  <div className="auth-form-col">
                    <TextInput
                      id="name"
                      name="name"
                      labelText="Prénom"
                      placeholder="Prénom"
                      onChange={this.handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="auth-form-col">
                    <TextInput
                      id="surname"
                      name="surname"
                      labelText="Nom"
                      placeholder="Nom"
                      onChange={this.handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-spacer-small" />
                
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  labelText="Email"
                  placeholder="Email"
                  onChange={this.handleInputChange}
                  required
                />
                
                <div className="form-spacer-small" />
                
                <div className="auth-form-row">
                  <div className="auth-form-col">
                    <div className="password-container">
                      <Password 
                        onPasswordTextChanged={(password) => this.handlePassword(password)} 
                        placeholder="Mot de passe" 
                        labelText="Mot de passe"
                        required={true} 
                        name="password"
                      />
                    </div>
                  </div>
                  
                  <div className="auth-form-col">
                    <div className="password-container">
                      <Password 
                        onPasswordTextChanged={(retype) => this.handleRetype(retype)} 
                        placeholder="Confirmer" 
                        labelText="Confirmer le mot de passe"
                        required={true} 
                        name="retype"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="password-rules-container">
                  <PasswordCheck props={passwordRules} />
                </div>
                
                <div className="form-spacer-small" />
                
                <Checkbox
                  id="acceptTerms"
                  labelText={
                    <span>
                      J'accepte les <Link to="/terms" className="auth-link">conditions d'utilisation</Link>
                    </span>
                  }
                  checked={acceptTerms}
                  onChange={this.handleTermsChange}
                  required
                />
              </FormGroup>
              
              <Button
                type="submit"
                className="auth-submit-button"
                disabled={loading || !isPasswordValid || !acceptTerms}
              >
                {loading ? "Inscription en cours..." : "S'inscrire"}
              </Button>
              
              <div className="auth-alt-option">
                <p>Vous avez déjà un compte ?</p>
                <Link to="/login" className="auth-link">Se connecter</Link>
              </div>
              
              <div className="auth-skip-option">
                <Button 
                  kind="ghost" 
                  as={Link} 
                  to="/"
                  className="auth-skip-button"
                >
                  Continuer sans s'inscrire
                </Button>
              </div>
            </Form>
          </Stack>
        </Tile>
      </div>
    );
  }
}

export default withAuth(SignUp);