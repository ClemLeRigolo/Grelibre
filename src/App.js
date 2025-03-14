import React, {useState} from "react";
import { withAuth } from "./components/auth";
import { localHost } from "./utils/firebase";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import { Redirect } from "react-router-dom";

import ProtectedRoute from './components/protectedRoute';
import AppHeader from './components/AppHeader';
import Home from "./pages/home";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Terms from "./pages/terms";
import Reset from "./pages/reset";
import Verify from "./pages/verify";
import Profile from "./pages/profile";
import Locations from "./pages/localisations";

import "./App.css";
import "./styles/scrollbar.css";

import { initialize } from "./utils/firebase";

document.documentElement.style.setProperty('--selected-color', '#0f62fe');

// Initialisation de firebase avec les paramètres importants
initialize();
localHost();

function App(props) {
  const { authState, user } = props;

  const isMobile = () => {
    return window.innerWidth < 600;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(() => {
    return isMobile() ? false : true;
  });

  function toggleMenu() {
    setIsMenuOpen(prevState => !prevState);
  }

  // Liste des chemins où le header ne devrait pas être affiché
  const noHeaderPaths = ['/login', '/signup', '/reset', '/verify', '/terms'];

  // Fonction pour déterminer si le header doit être affiché
  const shouldShowHeader = (path) => {
    return !noHeaderPaths.some(noHeaderPath => path.startsWith(noHeaderPath));
  };

  return (
    <Router>
      <div className="app-container">
        <Route
          path="/"
          render={({ location }) => shouldShowHeader(location.pathname) && <AppHeader />}
        />
        <div className={shouldShowHeader(window.location.pathname) ? "main-content" : ""}>
          <Switch>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/reset" component={Reset} />
            <Route path="/verify" render={(props) => 
              <Verify {...props} />}
            />
            <Route path="/terms" component={Terms} />
            <Route path="/profile" component={Profile} />
            <Route path="/localisations" component={Locations} />
            <Route path="/" component={Home} />
          </Switch>
        </div>
      </div>
    </Router>
  );
}

export default withAuth(App);
