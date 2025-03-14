import React from "react";
import { UserAvatarFilledAlt } from "@carbon/icons-react";
import { Button, Tile } from "@carbon/react";
import { Link } from "react-router-dom";
import { authStates, withAuth } from "../components/auth";
import { signOut } from "../utils/firebase";
import Loader from "../components/loader";
import "../styles/profile.css";

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
        <div className="profile-unauthorized">
          <p>Vous devez vous connecter pour accéder à cette page</p>
          <Link className="button" to={`/login?redirect=${currentUrl}`}>Se connecter</Link>
        </div>
      );
    }

    return (
      <div className="profile-container">
        <Tile className="profile-card">
          <UserAvatarFilledAlt size={48} />
          <h2>{this.props.user?.displayName || "Utilisateur"}</h2>
          <p>{this.props.user?.email || "Email non disponible"}</p>
          <Button onClick={handleSignOut}>
            Se déconnecter
          </Button>
        </Tile>
      </div>
    );
  }
}

export default withAuth(Profile);
