import React from "react";
import { Redirect } from "react-router-dom";
import MapComponent from '../components/MapComponent';
import '../styles/home.css';

import { authStates, withAuth } from "../components/auth";
import { signOut } from "../utils/firebase";
import Loader from "../components/loader";
import { Link } from "react-router-dom";

function handleSignOut() {
  signOut()
    .then(() => {
      console.log("Signed Out");
    })
    .catch(e => {
      console.log("Error signing out", e);
    });
}

class Profile extends React.Component {
  render() {
    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    if (this.props.authState === authStates.LOGGED_OUT) {
        const currentUrl = window.location.pathname;
        return (
            <div style={
                {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    flexDirection: 'column'
                }
            }>
              <p>Vous devez vous connecter pour accéder à cette page</p>
              <Link className="button" to={`/login?redirect=${currentUrl}`}>Se connecter</Link>
            </div>
          );
    }

    return (
      <div className="home-container">
        
      </div>
    );
  }
}

export default withAuth(Profile);
