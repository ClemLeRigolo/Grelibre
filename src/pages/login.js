import React from "react";
import { Link, Redirect } from "react-router-dom";
import {
  TextInput,
  Button,
  InlineNotification,
  Form,
  Stack,
  FormGroup,
  Tile
} from "@carbon/react";
import { Login as LoginIcon, ArrowLeft } from "@carbon/icons-react"; // Ajout de l'icône de retour

import { authStates, withAuth } from "../components/auth";
import fr from "../utils/i18n";
import Loader from "../components/loader";
import { signIn } from "../utils/firebase";
import { validateEmail } from "../utils/helpers";

import "../styles/login.css";

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      error: "",
      loading: false
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    this.setState({
      [event.target.name]: event.target.value,
      error: ""
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { email, password } = this.state;

    // Validation
    if (!email) {
      this.setState({ error: fr.ERRORS.EMPTY_EMAIL });
      return;
    }

    // if (!validateEmail(email)) {
    //   this.setState({ error: fr.ERRORS.INVALID_EMAIL });
    //   return;
    // }

    if (!password) {
      this.setState({ error: fr.ERRORS.EMPTY_PASSWORD });
      return;
    }

    this.setState({ loading: true, error: "" });

    signIn(email, password)
      .catch(error => {
        console.error("Erreur de connexion:", error);
        this.setState({
          error: fr.ERRORS.AUTH,
          loading: false
        });
      });
  }

  render() {
    const { authState, user } = this.props;
    const { loading, error } = this.state;
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || '/';

    if (authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (user) {
      return <Redirect to={redirect} />;
    }

    return (
      <div className="auth-container">
        {/* Bouton de retour vers l'application principale */}
        <Link to="/" className="auth-back-button">
          <ArrowLeft size={20} /> Retour à l'application
        </Link>
        
        <Tile className="auth-tile">
          <Stack gap={7}>
            <div className="auth-header">
              <LoginIcon className="auth-icon" />
              <h1 className="auth-title">{fr.GREETINGS.LOGIN}</h1>
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
                <TextInput
                  id="email"
                  name="email"
                  type="email"
                  labelText={fr.FORM_FIELDS.EMAIL}
                  placeholder={fr.FORM_FIELDS.EMAIL}
                  onChange={this.handleInputChange}
                  required
                />
                
                <div className="form-spacer" />
                
                <TextInput.PasswordInput
                  id="password"
                  name="password"
                  labelText={fr.FORM_FIELDS.PASSWORD}
                  placeholder={fr.FORM_FIELDS.PASSWORD}
                  onChange={this.handleInputChange}
                  required
                />
              </FormGroup>
              
              <div className="auth-forgot-password">
                <Link to="/reset">{fr.FORM_FIELDS.FORGOT_PASSWORD}</Link>
              </div>
              
              <Button
                type="submit"
                className="auth-submit-button"
                disabled={loading}
              >
                {loading ? "Connexion en cours..." : fr.FORM_FIELDS.LOGIN}
              </Button>
              
              <div className="auth-alt-option">
                <p>{fr.FORM_FIELDS.LOGIN_ALT_TEXT}</p>
                <Link to="/signup" className="auth-link">{fr.FORM_FIELDS.SIGNUP}</Link>
              </div>
              
              <div className="auth-skip-option">
                <Button 
                  kind="ghost" 
                  as={Link} 
                  to="/"
                  className="auth-skip-button"
                >
                  Continuer sans se connecter
                </Button>
              </div>
            </Form>
          </Stack>
        </Tile>
      </div>
    );
  }
}

export default withAuth(Login);
