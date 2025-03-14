import React from "react";
import { UserAvatarFilledAlt } from "@carbon/icons-react";
import { Button, Tile, TextInput } from "@carbon/react";
import { Link } from "react-router-dom";
import { authStates, withAuth } from "../components/auth";
import { signOut, getUserData, updateUserData } from "../utils/firebase";
import Loader from "../components/loader";
import "../styles/profile.css";

function handleSignOut() {
  signOut()
    .then(() => console.log("Signed Out"))
    .catch(e => console.log("Error signing out", e));
}

class Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: undefined,
      isEditing: false, // Mode édition
      updatedUser: {},
    };
  }

  componentDidMount() {
    if (this.props.authState === authStates.LOGGED_IN) {
      getUserData(this.props.user?.email).then((user) => {
        this.setState({ user, updatedUser: { ...user } });
      });
    }
  }

  handleEditToggle = () => {
    this.setState((prevState) => ({
      isEditing: !prevState.isEditing,
      updatedUser: { ...prevState.user }, // Réinitialise les valeurs en cas d'annulation
    }));
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState((prevState) => ({
      updatedUser: { ...prevState.updatedUser, [name]: value },
    }));
  };

  handleSave = () => {
    const { surname, name, tag } = this.state.updatedUser;
    updateUserData(surname, name, tag).then(() => {
      this.setState({ user: { ...this.state.updatedUser }, isEditing: false });
    }).catch((error) => {
      console.log("Erreur lors de la mise à jour :", error);
    });
  };

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

    if (this.props.authState === authStates.LOGGED_IN && !this.state.user) {
        getUserData(this.props.user?.email).then((user) => {
            this.setState({ user });
        });
      return <Loader />;
    }

    return (
      <div className="profile-container">
        <Tile className="profile-card">
          <UserAvatarFilledAlt size={48} />
          
          {/* Mode Édition ON / OFF */}
          {this.state.isEditing ? (
            <>
              <TextInput
                id="tag"
                labelText="Tag"
                name="tag"
                value={this.state.updatedUser.tag}
                onChange={this.handleInputChange}
              />
              <TextInput
                id="name"
                labelText="Prénom"
                name="name"
                value={this.state.updatedUser.name}
                onChange={this.handleInputChange}
              />
              <TextInput
                id="surname"
                labelText="Nom"
                name="surname"
                value={this.state.updatedUser.surname}
                onChange={this.handleInputChange}
              />
              <Button kind="primary" onClick={this.handleSave}>Enregistrer</Button>
            </>
          ) : (
            <>
              <h1>{this.state.user.tag}</h1>
              <h2>{this.state.user.name} {this.state.user.surname}</h2>
              <p>{this.props.user?.email}</p>
              <Button kind="secondary" onClick={this.handleEditToggle}>Modifier</Button>
            </>
          )}

          <Button onClick={handleSignOut}>Se déconnecter</Button>
        </Tile>
      </div>
    );
  }
}

export default withAuth(Profile);
