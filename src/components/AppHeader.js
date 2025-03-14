import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChoroplethMap, 
  Search,
  Notification,
  UserAvatar
} from '@carbon/icons-react';

import '../styles/AppHeader.css';

const AppHeader = () => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <div className="header-logo">
            <Link to="/">GreLibre</Link>
          </div>
          <nav className="header-nav">
            <ul>
              <li>
                <Link to="/" className="header-nav-item active">
                  <ChoroplethMap /> Carte
                </Link>
              </li>
              <li>
                <Link to="/transports" className="header-nav-item">
                  Transports
                </Link>
              </li>
              <li>
                <Link to="/itineraires" className="header-nav-item">
                  Itinéraires
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <button className="header-action" aria-label="Recherche">
              <Search />
            </button>
            <button className="header-action" aria-label="Notifications">
              <Notification />
            </button>
            <button className="header-action user-profile" aria-label="Profil">
              <Link to="/profile">
                <UserAvatar />
              </Link>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;