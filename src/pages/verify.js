import React from "react";
import { Redirect } from "react-router-dom";
import { signOut, resendMail } from "../utils/firebase";
import { authStates, withAuth } from "../components/auth";
import Loader from "../components/loader";

import fr from "../utils/i18n";
import "../styles/login.css";

class Verify extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      return: false,
    };
  }

  handleResend(event) {
    event.preventDefault();
    resendMail()
      .then(() => {
        console.log("Mail resent");
      })
      .catch((e) => {
        console.log("Error resending mail", e);
      });
  }

  handleBackTo(event) {
    event.preventDefault();
    signOut()
      .then(() => {
        this.setState({ return: true });
      })
      .catch((e) => {
        console.log("Error signing out", e);
      });
  }

  render() {

    const { authState } = this.props;

    if (authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.state.return || !this.props.user) {
      return <Redirect to="/login"></Redirect>;
    }

    //If email verified
    if (this.props.user && this.props.user.emailVerified) {
      return <Redirect to="/home"></Redirect>;
    }

    return (

      <div className="container">
        <meta httpEquiv="refresh" content="20" />
        <div className="content">
          <div className="login">
            <h2>{fr.GREETINGS.VERIFY}</h2>

            <p>{fr.VERIFY_EMAIL_TEXT}</p>

            <button
              onClick={this.handleResend.bind(this)}
              className="log-button"
            >
              {fr.FORM_FIELDS.RESEND}
            </button>

            <a
              href="/login"
              onClick={this.handleBackTo.bind(this)}
            >
              {fr.FORM_FIELDS.BACK_TO_LOGIN}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default withAuth(Verify);