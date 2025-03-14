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

  return (
    <Router>
      <div className="app-container">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/reset" component={Reset} />
          <Route path="/verify" render={(props) => 
            <Verify {...props} />}
          />
          <Route path="/terms" component={Terms} />
          <Route path="/">
            <AppHeader />
            <ProtectedRoute path="/" component={Home} />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default withAuth(App);
