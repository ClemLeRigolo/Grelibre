import React from "react";
import { Link } from "react-router-dom";

import { authStates, withAuth } from "../components/auth";
import fr from "../utils/i18n";
import Loader from "../components/loader";
import { resetPassword } from "../utils/firebase";
import { validateEmail } from "../utils/helpers";
import { Redirect } from "react-router-dom";

import "../styles/login.css";

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
      error: "",
      sent: false,
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
    const errorMsg = validateEmail(
      this.state.email
    );

    if (errorMsg) {
      this.setState({
        error: errorMsg,
      });
      return;
    }

    resetPassword(this.state.email)
        .then(() => {
            console.log("Reset password email sent");
            this.setState({
                sent: true,
            });
        })
        .catch(e => {
            console.log("Error sending reset password email", e);
            this.setState({
            error: "Error sending reset password email",
            });
        });
  }
  render() {
    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.props.user) {
      return <Redirect to="/"></Redirect>;
    }

    const errorMsg = this.state.error;

    if (this.state.sent) {
        return (
            <div className="container">
            <form onSubmit={this.handleSubmit}>
                <div className="content">
                <div className="login">
                <h2>{fr.GREETINGS.RESET_MAIL_SENT}</h2>
                <button
                  className="log-button"
                  onClick={() => window.location.href = "/login"}
                >
                    {fr.GREETINGS.BACK_TO_LOGIN}
                </button>
                </div>
                </div>
            </form>
                </div>
            );
    } else {
        return (
        <div className="container">
        <form onSubmit={this.handleSubmit}>
            <div className="content">
            <div className="login">
            <h2>{fr.GREETINGS.RESET}</h2>

            <input
                type="text"
                placeholder={fr.FORM_FIELDS.EMAIL}
                name="email"
                onChange={this.handleInputChange}
                className="easy-nput"
                required
            />

            {errorMsg && <p className="error">{errorMsg}</p>}
            <button id="login-button" className="log-button" type="submit">
                {fr.FORM_FIELDS.RESET}
            </button>
            <Link to="/login">{fr.FORM_FIELDS.LOGIN}</Link>

            <p>{fr.FORM_FIELDS.LOGIN_ALT_TEXT}</p>
            <Link to="/signup">Créer un compte</Link>
            </div>
            </div>
        </form>
            </div>
        );
    }
  }
}

export default withAuth(Login);
