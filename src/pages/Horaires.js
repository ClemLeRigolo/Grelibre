// src/pages/HorairesPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Accordion,
  AccordionItem,
  Tabs,
  Tab,
  Loading,
  Button,
  InlineNotification,
  Search,
  ClickableTile,
  Tag,
  Tile
} from 'carbon-components-react';
import { Train, Bus, Information, Time, Location, Star, StarFilled } from '@carbon/icons-react';
import '../styles/Horaires.css';

const SMMAG_API_BASE_URL = 'https://data.mobilites-m.fr/api';

const Horaires = () => {
  // États pour gérer les données et l'UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState(0); // 0 = aller, 1 = retour
  const [stops, setStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [transportTypes, setTransportTypes] = useState({
    trams: [],
    buses: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteStops, setFavoriteStops] = useState([]);
  const [viewMode, setViewMode] = useState(localStorage.getItem('horaires-view-preference') || 'routes'); // 'routes', 'stops', 'schedules' ou 'favorites'

  // Charger les lignes au chargement du composant
  useEffect(() => {
    loadRoutes();
    loadFavoriteStops();
  }, []);

  // Charger les routes de transport
  const loadRoutes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SMMAG_API_BASE_URL}/routers/default/index/routes`);
      
      // Charger les données complémentaires depuis routes.txt
      const routesData = await fetchRoutesData();
      
      // Fusionner les données et s'assurer que les IDs sont uniques
      const routesMap = new Map(); // Utiliser un Map pour garantir l'unicité
      
      response.data.forEach(route => {
        const routeInfo = routesData.find(r => r.route_short_name === route.shortName);
        const enhancedRoute = {
          ...route,
          uniqueId: `${route.id}-${route.shortName}`, // Créer un ID véritablement unique
          color: routeInfo ? routeInfo.route_color : "CCCCCC",
          textColor: routeInfo ? routeInfo.route_text_color : "000000",
          type: routeInfo ? parseInt(routeInfo.route_type) : 3
        };
        
        routesMap.set(enhancedRoute.uniqueId, enhancedRoute);
      });
      
      const enhancedRoutes = Array.from(routesMap.values());
      
      // Trier et organiser par type
      const trams = enhancedRoutes.filter(route => route.type === 0)
        .sort((a, b) => a.shortName.localeCompare(b.shortName));
      
      const buses = enhancedRoutes.filter(route => route.type === 3)
        .sort((a, b) => a.shortName.localeCompare(b.shortName));
      
      setTransportTypes({ trams, buses });
      setRoutes(enhancedRoutes);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des lignes:", error);
      setError("Impossible de charger les lignes de transport");
      setLoading(false);
    }
  };

  // Charger les données depuis routes.txt
  const fetchRoutesData = async () => {
    try {
      const response = await fetch('/data/txt/routes.txt');
      const text = await response.text();
      
      // Parser le fichier CSV
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      return lines.slice(1).map(line => {
        if (!line.trim()) return null;
        
        const values = line.split(',');
        const routeData = {};
        
        headers.forEach((header, index) => {
          routeData[header] = values[index];
        });
        
        return routeData;
      }).filter(Boolean);
    } catch (error) {
      console.error("Erreur lors du chargement de routes.txt:", error);
      return [];
    }
  };

  // Modifions la fonction loadStops pour gérer correctement le format de réponse
const loadStops = async (routeId) => {
  try {
    setLoading(true);
    
    console.log("Chargement des arrêts pour la ligne:", routeId);
    
    // Utiliser l'API de fiche horaire pour obtenir les arrêts
    const now = Date.now();
    const response = await axios.get(`${SMMAG_API_BASE_URL}/ficheHoraires/json`, {
      params: {
        route: routeId,
        time: now,
        nbTrips: 5
      }
    });
    
    console.log("Réponse API ficheHoraires:", response.data);
    
    // Vérifier que la réponse existe
    if (!response.data) {
      console.error("Réponse invalide: données manquantes");
      setError("Format de réponse incorrect pour les horaires");
      setLoading(false);
      return;
    }
    
    // Les directions semblent être directement les propriétés numériques de l'objet
    // Convertissons l'objet en tableau de directions
    const directions = [];
    
    // Parcourir les propriétés numériques de l'objet
    for (const key in response.data) {
      if (Object.prototype.hasOwnProperty.call(response.data, key) && !isNaN(parseInt(key))) {
        const direction = response.data[key];
        
        // Vérifier que chaque direction a des arrêts
        if (direction && Array.isArray(direction.arrets)) {
          // Ajouter le nom de la direction basé sur le premier et dernier arrêt
          const firstStop = direction.arrets[0]?.stopName || "";
          const lastStop = direction.arrets[direction.arrets.length - 1]?.stopName || "";
          const directionName = `${firstStop} → ${lastStop}`;
          
          directions.push({
            ...direction,
            directionName: directionName
          });
        }
      }
    }
    
    console.log("Directions formatées:", directions);
    
    if (directions.length >= 1) {
      setStops(directions);
      setSelectedDirection(0);
      setViewMode('stops');
    } else {
      console.error("Aucune direction trouvée dans la réponse");
      setError("Aucun arrêt trouvé pour cette ligne");
    }
    
    setLoading(false);
  } catch (error) {
    console.error("Erreur lors du chargement des arrêts:", error);
    
    // Log plus détaillé de l'erreur
    if (error.response) {
      console.error("Données de l'erreur:", error.response.data);
      console.error("Statut:", error.response.status);
      setError(`Erreur ${error.response.status}: ${error.response.data.message || "Impossible de charger les arrêts"}`);
    } else if (error.request) {
      console.error("Pas de réponse reçue:", error.request);
      setError("Pas de réponse du serveur");
    } else {
      console.error("Erreur de configuration:", error.message);
      setError(`Erreur: ${error.message}`);
    }
    
    setLoading(false);
  }
};

  // Mettre à jour la fonction loadSchedules avec une meilleure gestion des erreurs
const loadSchedules = async (stopId) => {
  try {
    setLoading(true);
    
    console.log("Chargement des horaires pour l'arrêt:", stopId);
    console.log("État actuel - stops:", stops);
    console.log("État actuel - selectedDirection:", selectedDirection);
    
    // Déterminer l'index réel à utiliser
    let directionIndex = selectedDirection;
    if (typeof selectedDirection === 'object' && selectedDirection !== null && 'selectedIndex' in selectedDirection) {
      directionIndex = selectedDirection.selectedIndex;
      console.log("Index extrait de l'objet:", directionIndex);
    }
    
    // Vérifier que la direction est valide
    if (!stops || stops.length === 0 || directionIndex >= stops.length) {
      console.error("Données de direction invalides", { stops, directionIndex });
      setError("Impossible de trouver la direction sélectionnée");
      setLoading(false);
      return;
    }
    
    const currentDirection = stops[directionIndex];
    
    if (!currentDirection || !currentDirection.arrets) {
      console.error("Structure de direction invalide", currentDirection);
      setError("Structure de données incorrecte pour cette direction");
      setLoading(false);
      return;
    }
    
    const selectedStopData = currentDirection.arrets.find(stop => stop.stopId === stopId);
    
    console.log("Données de l'arrêt sélectionné:", selectedStopData);
    
    if (!selectedStopData) {
      console.error("Arrêt non trouvé dans la direction", { stopId, arrets: currentDirection.arrets });
      setError("Impossible de trouver les données pour cet arrêt");
      setLoading(false);
      return;
    }
    
    // Essayons maintenant de récupérer les horaires directement depuis l'API pour cet arrêt
    try {
      console.log("Récupération des horaires pour l'arrêt depuis l'API...");
      
      // Formatage de la date pour l'API (format YYYYMMDD)
      const today = new Date();
      const dateStr = today.getFullYear() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
      
      // Appel API pour récupérer les horaires à cet arrêt
      const stoptimesResponse = await axios.get(
        `${SMMAG_API_BASE_URL}/routers/default/index/stops/${stopId}/stoptimes/${dateStr}`
      );
      console.log("Réponse de l'API stoptimes:", stoptimesResponse.data);
      
      if (stoptimesResponse.data && Array.isArray(stoptimesResponse.data) && stoptimesResponse.data.length > 0) {
        // L'API renvoie un tableau de patterns, chacun contenant un tableau de times
        // Nous devons extraire les horaires de tous les patterns
        
        // Filtrer pour ne garder que les patterns liés à notre ligne (si possible)
        const relevantPatterns = selectedRoute 
          ? stoptimesResponse.data.filter(pattern => pattern.pattern.id.includes(selectedRoute.id))
          : stoptimesResponse.data;
        
        console.log("Patterns pertinents pour cette ligne:", relevantPatterns);
        
        if (relevantPatterns.length > 0) {
          // Extraire tous les horaires de tous les patterns
          const allTimes = [];
          relevantPatterns.forEach(patternData => {
            if (patternData.times && Array.isArray(patternData.times)) {
              patternData.times.forEach(time => {
                // Convertir les secondes en timestamp
                const scheduledArrival = time.serviceDay * 1000 + time.scheduledArrival * 1000;
                const realtimeArrival = time.serviceDay * 1000 + time.realtimeArrival * 1000;
                
                allTimes.push({
                  scheduledArrival: scheduledArrival,
                  realtimeArrival: realtimeArrival,
                  patternDesc: patternData.pattern.desc,
                  tripId: time.tripId
                });
              });
            }
          });
          
          // Trier par heure d'arrivée
          const sortedTimes = allTimes.sort((a, b) => a.realtimeArrival - b.realtimeArrival);
          
          // Filtrer pour ne garder que les prochains passages (après maintenant)
          const now = Date.now();
          const upcomingTimes = sortedTimes.filter(time => time.realtimeArrival > now);
          
          console.log("Horaires triés et filtrés:", upcomingTimes);
          
          if (upcomingTimes.length > 0) {
            setSelectedStop(selectedStopData);
            setSchedules(upcomingTimes);
            setViewMode('schedules');
          } else {
            console.log("Aucun passage futur trouvé");
            
            // Afficher quand même les horaires programmés même s'ils sont passés
            setSelectedStop(selectedStopData);
            setSchedules(sortedTimes.slice(0, 5)); // Prendre les 5 premiers horaires
            setViewMode('schedules');
          }
        } else {
          console.log("Aucun pattern correspondant à cette ligne");
          
          // Fallback: afficher tous les horaires si on ne peut pas filtrer par ligne
          const allTimes = [];
          stoptimesResponse.data.forEach(patternData => {
            if (patternData.times && Array.isArray(patternData.times)) {
              patternData.times.forEach(time => {
                const scheduledArrival = time.serviceDay * 1000 + time.scheduledArrival * 1000;
                const realtimeArrival = time.serviceDay * 1000 + time.realtimeArrival * 1000;
                
                allTimes.push({
                  scheduledArrival: scheduledArrival,
                  realtimeArrival: realtimeArrival,
                  patternDesc: patternData.pattern.desc,
                  tripId: time.tripId
                });
              });
            }
          });
          
          const sortedTimes = allTimes.sort((a, b) => a.realtimeArrival - b.realtimeArrival);
          setSelectedStop(selectedStopData);
          setSchedules(sortedTimes.slice(0, 10)); // Prendre les 10 premiers horaires
          setViewMode('schedules');
        }
      } else {
        console.log("Format de réponse inattendu ou vide pour les stoptimes");
        
        // Fallback: utiliser les données de l'arrêt si disponibles
        setSelectedStop(selectedStopData);
        setSchedules(selectedStopData.trips || []);
        setViewMode('schedules');
      }
    } catch (apiError) {
      console.error("Erreur lors de l'appel à l'API stoptimes:", apiError);
      
      // En cas d'erreur avec l'API, utiliser les données de l'arrêt si disponibles
      setSelectedStop(selectedStopData);
      setSchedules(selectedStopData.trips || []);
      setViewMode('schedules');
    }
    
    setLoading(false);
  } catch (error) {
    console.error("Erreur lors du chargement des horaires:", error);
    setError("Impossible de charger les horaires");
    setLoading(false);
  }
};

  // Sélectionner une ligne
  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    loadStops(route.id);
  };

  // Modifions la fonction handleDirectionChange pour extraire correctement l'index
const handleDirectionChange = (index) => {
  // Si index est un objet avec selectedIndex, l'extraire
  if (typeof index === 'object' && index !== null && 'selectedIndex' in index) {
    setSelectedDirection(index.selectedIndex);
  } else {
    // Sinon, utiliser la valeur directement
    setSelectedDirection(index);
  }
  
  console.log("Direction changée pour:", typeof index === 'object' ? index.selectedIndex : index);
};

    // Sélectionner un arrêt
    const handleStopSelect = (stopId) => {
        if (!stopId) {
        console.error("ID d'arrêt manquant");
        return;
        }
        console.log("Sélection de l'arrêt:", stopId);
        loadSchedules(stopId);
    };

  // Retour à la sélection de ligne
  const backToRoutes = () => {
    setViewMode('routes');
    setSelectedRoute(null);
  };

  // Retour à la sélection d'arrêts
  const backToStops = () => {
    setViewMode('stops');
    setSelectedStop(null);
  };

  // Filtrer les lignes par recherche
  const filteredRoutes = {
    trams: transportTypes.trams
      .filter(route => route.id.startsWith('SEM:'))
      .filter(route => 
        route.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.longName.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    buses: transportTypes.buses
      .filter(route => route.id.startsWith('SEM:'))
      .filter(route => 
        route.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.longName.toLowerCase().includes(searchTerm.toLowerCase())
      )
  };

  // Formater l'heure (HH:MM)
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Calculer le temps d'attente
  const getWaitTime = (timestamp) => {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff < 0) return "Passé";
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
  };

  // Ajouter dans useEffect pour charger les favoris au démarrage
useEffect(() => {
  loadRoutes();
  loadFavoriteStops();
}, []);

// Fonction pour charger les arrêts favoris depuis localStorage
const loadFavoriteStops = () => {
  try {
    const storedFavorites = localStorage.getItem('horaires-favorite-stops');
    if (storedFavorites) {
      const favorites = JSON.parse(storedFavorites);
      setFavoriteStops(favorites);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des arrêts favoris:", error);
  }
};

// Fonction pour sauvegarder les favoris dans localStorage
const saveFavoriteStops = (favorites) => {
  try {
    localStorage.setItem('horaires-favorite-stops', JSON.stringify(favorites));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des arrêts favoris:", error);
  }
};

// Fonction pour ajouter/supprimer un arrêt des favoris
const toggleFavoriteStop = (stop, routeInfo) => {
  const favoriteExists = favoriteStops.find(fav => fav.stopId === stop.stopId);
  
  let updatedFavorites;
  if (favoriteExists) {
    // Supprimer des favoris
    updatedFavorites = favoriteStops.filter(fav => fav.stopId !== stop.stopId);
  } else {
    // Ajouter aux favoris avec les informations de la ligne
    updatedFavorites = [...favoriteStops, {
      stopId: stop.stopId,
      stopName: stop.stopName,
      routeId: routeInfo.id,
      routeName: routeInfo.shortName,
      routeColor: routeInfo.color,
      routeTextColor: routeInfo.textColor,
      directionName: typeof selectedDirection === 'object' && selectedDirection !== null && 'selectedIndex' in selectedDirection
        ? stops[selectedDirection.selectedIndex]?.directionName
        : stops[selectedDirection]?.directionName
    }];
  }
  
  setFavoriteStops(updatedFavorites);
  saveFavoriteStops(updatedFavorites);
};

// Fonction pour vérifier si un arrêt est dans les favoris
const isStopFavorite = (stopId) => {
  return favoriteStops.some(fav => fav.stopId === stopId);
};

// Fonction pour charger les horaires d'un arrêt favori
const loadFavoriteStopSchedules = async (favorite) => {
  setSelectedStop({
    stopId: favorite.stopId,
    stopName: favorite.stopName
  });
  
  setSelectedRoute({
    id: favorite.routeId,
    shortName: favorite.routeName,
    color: favorite.routeColor,
    textColor: favorite.routeTextColor
  });
  
  // Charger directement les horaires pour cet arrêt
  await loadSchedules(favorite.stopId);
};

// Ajouter cette fonction
const promptInstallPwa = () => {
  const deferredPrompt = window.deferredPrompt;
  
  if (deferredPrompt) {
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('L\'utilisateur a accepté l\'installation de l\'application');
      } else {
        console.log('L\'utilisateur a refusé l\'installation de l\'application');
      }
      // Réinitialiser le prompt différé
      window.deferredPrompt = null;
    });
  } else {
    // Afficher un message alternatif pour ajouter à l'écran d'accueil
    alert('Pour ajouter cette application à votre écran d\'accueil : \n\n' +
          '1. Appuyez sur le bouton de partage/menu de votre navigateur\n' +
          '2. Sélectionnez "Ajouter à l\'écran d\'accueil" ou "Installer"');
  }
};

  // Rendu du composant
  return (
    <div className="horaires-container carbon-styled">
      <div className="horaires-header">
        <h1>Fiches horaires des transports</h1>
        <p>Consultez les horaires des transports en commun de Grenoble</p>
      </div>

      {error && (
        <InlineNotification
          kind="error"
          title="Erreur"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
          className="horaires-error-notification"
        />
      )}

      {loading ? (
        <div className="horaires-loading-container">
          <Loading description="Chargement des données..." withOverlay={false} />
        </div>
      ) : (
        <div className="horaires-content">
          {/* Navigation */}
          {!loading && (
            <div className="horaires-navigation">
              <Button 
                kind={viewMode === 'routes' || viewMode === 'stops' || viewMode === 'schedules' ? 'primary' : 'secondary'} 
                onClick={() => setViewMode('routes')}
                className="horaires-nav-button"
              >
                Toutes les lignes
              </Button>
              <Button 
                kind={viewMode === 'favorites' ? 'primary' : 'secondary'} 
                onClick={() => setViewMode('favorites')}
                className="horaires-nav-button"
                renderIcon={StarFilled}
              >
                Mes favoris
              </Button>
            </div>
          )}

          {viewMode === 'routes' && (
            <>
              <Search
                labelText="Rechercher une ligne"
                placeholder="Entrez le nom ou numéro d'une ligne"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="horaires-route-search"
              />
              
              <Accordion>
                {/* Section Tramways */}
                <AccordionItem
                  title={
                    <div className="horaires-transport-type-title">
                      <Train size={24} /> Tramways ({filteredRoutes.trams.length})
                    </div>
                  }
                  open={true}
                >
                  <div className="horaires-route-list">
                    {filteredRoutes.trams.map((route, index) => (
                      <div
                        key={`tram-${route.id}-${index}`}  // Ajout de l'index pour garantir l'unicité
                        className="horaires-route-item"
                        onClick={() => handleRouteSelect(route)}
                      >
                        <div
                          className="horaires-route-badge"
                          style={{
                            backgroundColor: `#${route.color}`,
                            color: `#${route.textColor}`
                          }}
                        >
                          {route.shortName}
                        </div>
                        <div className="horaires-route-info">
                          <span className="horaires-route-name">{route.longName}</span>
                        </div>
                      </div>
                    ))}
                    
                    {filteredRoutes.trams.length === 0 && (
                      <div className="horaires-empty-routes">
                        Aucun tram ne correspond à votre recherche
                      </div>
                    )}
                  </div>
                </AccordionItem>

                {/* Section Bus */}
                <AccordionItem
                  title={
                    <div className="horaires-transport-type-title">
                      <Bus size={24} /> Bus ({filteredRoutes.buses.length})
                    </div>
                  }
                  open={true}
                >
                  <div className="horaires-route-list">
                    {filteredRoutes.buses.map((route, index) => (
                      <div
                        key={`bus-${route.id}-${index}`}  // Ajout de l'index pour garantir l'unicité
                        className="horaires-route-item"
                        onClick={() => handleRouteSelect(route)}
                      >
                        <div
                          className="horaires-route-badge"
                          style={{
                            backgroundColor: `#${route.color}`,
                            color: `#${route.textColor}`
                          }}
                        >
                          {route.shortName}
                        </div>
                        <div className="horaires-route-info">
                          <span className="horaires-route-name">{route.longName}</span>
                        </div>
                      </div>
                    ))}
                    
                    {filteredRoutes.buses.length === 0 && (
                      <div className="horaires-empty-routes">
                        Aucun bus ne correspond à votre recherche
                      </div>
                    )}
                  </div>
                </AccordionItem>
              </Accordion>
            </>
          )}

          {viewMode === 'stops' && selectedRoute && (
            <>
              <div className="horaires-route-header">
                <Button kind="ghost" onClick={backToRoutes} className="horaires-back-button">
                  Retour aux lignes
                </Button>
                <div
                  className="horaires-selected-route-badge"
                  style={{
                    backgroundColor: `#${selectedRoute.color}`,
                    color: `#${selectedRoute.textColor}`
                  }}
                >
                  {selectedRoute.shortName}
                </div>
                <h2>{selectedRoute.longName}</h2>
              </div>

              <Tabs selected={selectedDirection} onChange={handleDirectionChange}>
                {stops.map((direction, index) => (
                  <Tab key={index} label={direction.directionName || `Direction ${index + 1}`}>
                    <div className="horaires-stops-list">
                      {direction.arrets.map((stop, stopIndex) => (
                        <ClickableTile
                          key={`stop-${stop.stopId}-${stopIndex}`}
                          className="horaires-stop-item"
                          onClick={() => handleStopSelect(stop.stopId)}
                        >
                          <div className="horaires-stop-content">
                            <Location size={16} className="horaires-stop-icon" />
                            <span className="horaires-stop-name">{stop.stopName}</span>
                          </div>
                          
                          <button 
                            className="horaires-favorite-button"
                            onClick={(e) => {
                              e.stopPropagation(); // Empêcher le déclenchement du onClick du ClickableTile
                              toggleFavoriteStop(stop, selectedRoute);
                            }}
                            title={isStopFavorite(stop.stopId) ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            {isStopFavorite(stop.stopId) 
                              ? <StarFilled size={20} className="horaires-star-filled" />
                              : <Star size={20} className="horaires-star-empty" />
                            }
                          </button>
                        </ClickableTile>
                      ))}
                      
                      {direction.arrets.length === 0 && (
                        <div className="horaires-empty-stops">
                          Aucun arrêt disponible pour cette direction
                        </div>
                      )}
                    </div>
                  </Tab>
                ))}
              </Tabs>
            </>
          )}

          {viewMode === 'schedules' && selectedStop && (
            <>
              <div className="horaires-route-header">
                <Button kind="ghost" onClick={backToStops} className="horaires-back-button">
                  Retour aux arrêts
                </Button>
                <div
                  className="horaires-selected-route-badge"
                  style={{
                    backgroundColor: `#${selectedRoute.color}`,
                    color: `#${selectedRoute.textColor}`
                  }}
                >
                  {selectedRoute.shortName}
                </div>
                <h2>{selectedStop.stopName}</h2>
              </div>

              <div className="horaires-schedule-section">
                <div className="horaires-schedule-header">
                  <h3>Prochains passages</h3>
                  <span className="horaires-direction-name">
                    Direction : {
                      typeof selectedDirection === 'object' && selectedDirection !== null && 'selectedIndex' in selectedDirection
                        ? stops[selectedDirection.selectedIndex]?.directionName
                        : stops[selectedDirection]?.directionName
                    }
                  </span>
                </div>
                
                <div className="horaires-schedules-list">
                  {schedules.map((trip, index) => (
                    <Tile key={index} className="horaires-schedule-tile">
                      <div className="horaires-schedule-item">
                        <div className="horaires-schedule-time">
                          <Time size={20} />
                          {formatTime(trip.realtimeArrival || trip.scheduledArrival)}
                        </div>
                        
                        <div className="horaires-schedule-info">
                          {trip.patternDesc && (
                            <span className="horaires-schedule-destination">
                              Destination: {trip.patternDesc}
                            </span>
                          )}
                          <div className="horaires-wait-time">
                            <Information size={16} />
                            {getWaitTime(trip.realtimeArrival || trip.scheduledArrival)}
                          </div>
                        </div>
                        
                        {trip.realtimeArrival !== trip.scheduledArrival && (
                          <Tag 
                            type={trip.realtimeArrival > trip.scheduledArrival ? "red" : "green"}
                            title={trip.realtimeArrival > trip.scheduledArrival ? "Retard" : "Avance"}
                          >
                            {trip.realtimeArrival > trip.scheduledArrival ? 'Retard' : 'Avance'}
                          </Tag>
                        )}
                      </div>
                    </Tile>
                  ))}
                  
                  {schedules.length === 0 && (
                    <div className="horaires-no-schedule">
                      Aucun passage prévu prochainement
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {viewMode === 'favorites' && (
            <>
              <h2 className="horaires-favorites-title">Mes arrêts favoris</h2>
              
              {favoriteStops.length === 0 ? (
                <div className="horaires-empty-favorites">
                  <p>Vous n'avez pas encore d'arrêts favoris.</p>
                  <p>Pour ajouter un arrêt aux favoris, naviguez vers une ligne et cliquez sur l'étoile à côté d'un arrêt.</p>
                </div>
              ) : (
                <div className="horaires-favorites-list">
                  {favoriteStops.map((favorite, index) => (
                    <ClickableTile
                      key={`favorite-${index}`}
                      className="horaires-favorite-item"
                      onClick={() => loadFavoriteStopSchedules(favorite)}
                    >
                      <div className="horaires-favorite-item-header">
                        <div 
                          className="horaires-favorite-route-badge"
                          style={{
                            backgroundColor: `#${favorite.routeColor}`,
                            color: `#${favorite.routeTextColor}`
                          }}
                        >
                          {favorite.routeName}
                        </div>
                        <span className="horaires-favorite-stop-name">{favorite.stopName}</span>
                      </div>
                      
                      <div className="horaires-favorite-direction">
                        <Information size={16} />
                        <span>{favorite.directionName || "Direction non spécifiée"}</span>
                      </div>
                      
                      <button 
                        className="horaires-remove-favorite" 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavoriteStop({ stopId: favorite.stopId });
                        }}
                        title="Retirer des favoris"
                      >
                        <StarFilled size={16} /> Retirer
                      </button>
                    </ClickableTile>
                  ))}
                </div>
              )}
              {viewMode === 'favorites' && favoriteStops.length > 0 && (
                <Button 
                  kind="tertiary"
                  onClick={promptInstallPwa}
                  className="horaires-install-button"
                >
                  Ajouter un widget à l'écran d'accueil
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Horaires;