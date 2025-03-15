import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChoroplethMap, 
  Search,
  Notification,
  UserAvatar, 
  WatsonHealthImageAvailabilityLocal as Localisations,
  Event as Sorties,
  NetworkTimeProtocol as Horaires
} from '@carbon/icons-react';

import '../styles/AppHeader.css';

const AppHeader = () => {
  // Utiliser useLocation pour obtenir l'URL actuelle
  const location = useLocation();
  const currentPath = location.pathname;

  // Fonction pour déterminer si un lien est actif
  const isActive = (path) => {
    if (path === '/' && currentPath === '/') {
      return true;
    }
    if (path !== '/' && currentPath.startsWith(path)) {
      return true;
    }
    return false;
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <div className="header-logo">
            <Link to="/">GreLibre</Link>
          </div>
          <nav className="header-nav">
            <ul className="header-nav-list">
              <li>
                <Link to="/" className={`header-nav-item ${isActive('/') ? 'active' : ''}`}>
                  <ChoroplethMap /> Carte
                </Link>
              </li>
              <li>
                <Link to="/localisations" className={`header-nav-item ${isActive('/localisations') ? 'active' : ''}`}>
                  <Localisations/> Mes localisations
                </Link>
              </li>
              <li>
                <Link to="/sortie" className={`header-nav-item ${isActive('/sorties') ? 'active' : ''}`}>
                  <Sorties /> Sortie
                </Link>
              </li>
            </ul>
          </nav>
          <div className="mobile-nav">
            <Link to="/localisations" className={`mobile-nav-item ${isActive('/localisations') ? 'active' : ''}`}>
              <Localisations/> <span className="mobile-nav-text">Localisations</span>
            </Link>
            <Link to="/sortie" className={`mobile-nav-item ${isActive('/sorties') ? 'active' : ''}`}>
              <Sorties /> <span className="mobile-nav-text">Sortie</span>
            </Link>
          </div>
        </div>
        <div className="header-right">
          <div className="header-actions">
            <button className="header-action" aria-label="Horaires">
              <Link to="/horaires">
                <Horaires />
              </Link>
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