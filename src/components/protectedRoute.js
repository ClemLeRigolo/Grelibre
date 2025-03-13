import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { withAuth, authStates } from "../components/auth";
import Loader from "../components/loader";

const ProtectedRoute = ({ component: Component, authState, user, ...rest }) => {
  if (authState === authStates.INITIAL_VALUE) {
    return <Loader />;
  }

  if (authState === authStates.LOGGED_OUT) {
    return <Redirect to="/login" />;
  }

  if (authState === authStates.LOGGED_IN && !user.emailVerified) {
    return <Redirect to="/verify" />;
  }

  return <Route {...rest} render={(props) => <Component {...props} />} />;
};

export default withAuth(ProtectedRoute);