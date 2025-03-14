import React from "react";
import { Redirect } from "react-router-dom";
import MapComponent from '../components/MapComponent';
import '../styles/home.css';

import { authStates, withAuth } from "../components/auth";
import { signOut } from "../utils/firebase";
import Loader from "../components/loader";

function handleSignOut() {
  signOut()
    .then(() => {
      console.log("Signed Out");
    })
    .catch(e => {
      console.log("Error signing out", e);
    });
}

class Home extends React.Component {
  render() {
    if (this.props.authState === authStates.INITIAL_VALUE) {
      return <Loader />;
    }

    return (
      <div className="home-container">
        {/* <h1>Carte de Grenoble avec données mTag</h1> */}
        <div className="map-wrapper">
          <MapComponent />
        </div>
        <div className="inner">
          <button onClick={handleSignOut}> Se déconnecter </button>
        </div>
      </div>
    );
  }
}

export default withAuth(Home);
