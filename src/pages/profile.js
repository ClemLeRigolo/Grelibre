import React from "react";
import { UserAvatarFilledAlt } from "@carbon/icons-react";
import { Button, Tile, TextInput } from "@carbon/react";
import { Link } from "react-router-dom";
import { authStates, withAuth } from "../components/auth";
import { signOut, getUserData, updateUserData, getUserDataById } from "../utils/firebase";
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
        viewingOtherUser: false,
        id: "",
        hasToReload: false
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
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");
    if ((userId && userId !== this.state.id) || (!userId && this.state.viewingOtherUser)) {
        this.setState({ id: userId, hasToReload: true, viewingOtherUser: false });
    }


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

    if ((this.props.authState === authStates.LOGGED_IN && !this.state.user) || this.state.hasToReload) {
        if (userId) {
        // Si on affiche un autre utilisateur
        getUserDataById(userId).then((user) => {
            this.setState({ user, viewingOtherUser: true, hasToReload: false });
        });
        } else if (this.props.authState === authStates.LOGGED_IN) {
        // Sinon, on affiche le profil de l'utilisateur connecté
        getUserData(this.props.user?.email).then((user) => {
            this.setState({ user, updatedUser: { ...user }, hasToReload: false });
        });
        }
      return <Loader />;
    }

    return (
        <div className="profile-container">
          <Tile className="profile-card">
            <div className="profile-header">
              <UserAvatarFilledAlt size={64} />
              <div>
                <h1>{this.state.user.tag}</h1>
                <h2>{this.state.user.name} {this.state.user.surname}</h2>
                <p className="profile-email">{this.state.user.email}</p>
              </div>
            </div>
  
            {this.state.viewingOtherUser ? (
              <p className="profile-viewing">Vous consultez le profil d’un autre utilisateur.</p>
            ) : this.state.isEditing ? (
              <div className="profile-edit">
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
                <div className="profile-buttons">
                  <Button kind="primary" onClick={this.handleSave}>Enregistrer</Button>
                  <Button kind="secondary" onClick={this.handleEditToggle}>Annuler</Button>
                </div>
              </div>
            ) : (
              <div className="profile-actions">
                <Button kind="tertiary" onClick={this.handleEditToggle}>Modifier mon profil</Button>
                <Button kind="danger" onClick={handleSignOut}>Se déconnecter</Button>
              </div>
            )}
          </Tile>
        </div>
      );
  }
}

export default withAuth(Profile);
