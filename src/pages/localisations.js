import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button, Tile, TextInput } from "@carbon/react";
import { TrashCan, ArrowDown, Home } from "@carbon/icons-react";
import { authStates, withAuth } from "../components/auth";
import { getUserData, updateUserData } from "../utils/firebase";
import Loader from "../components/loader";
import { Link } from "react-router-dom";
import '../styles/localisations.css';

// Token d'accès Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVyZ2VvbmgiLCJhIjoiY204OG0zdWJhMGx4MzJtczVjYWZkZTN0NiJ9.zL-NC_caiJbgVsp9DV-yiA';

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [5.724524, 45.188529]; // [longitude, latitude]

const GRENOBLE_BBOX = [5.6, 45.1, 5.9, 45.3]; // Ajustez ces valeurs selon vos besoins

function Locations(props) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const [favoriteLocations, setFavoriteLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [newLocationCoords, setNewLocationCoords] = useState([]);
  const markersRef = useRef([]);
  const [searchAddress, setSearchAddress] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Add this to your existing state variables
  const [showMapOnMobile, setShowMapOnMobile] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  // Add this toggle function
  const toggleMapOnMobile = () => {
    if (showMapOnMobile) {
      setShowMapOnMobile(false);
    } else { 
      setShowMapOnMobile(true);
    }
    // Need to resize map after state changes
    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    }, 50);
  };
  
  useEffect(() => {
    if (mapInstance.current && mapInitialized) {
      const handleResize = () => {
        mapInstance.current.resize();
      };
      
      // Handle resize for mobile toggle
      if (showMapOnMobile) {
        handleResize();
      }
      
      // Listen for window resize events
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showMapOnMobile, mapInitialized]);

  // Charger les données utilisateur
  useEffect(() => {
    if (props.authState === authStates.LOGGED_IN) {
      getUserData(props.user?.email).then((userData) => {
        if (userData && userData.favoriteLocations) {
          setFavoriteLocations(userData.favoriteLocations);
        }
        setIsLoading(false);
      });
    } else if (props.authState === authStates.LOGGED_OUT) {
      setIsLoading(false);
    }
  }, [props.authState, props.user]);

  // Initialisation de la carte
  useEffect(() => {
    if (!mapInstance.current && mapContainerRef.current && !isLoading && props.authState === authStates.LOGGED_IN) {
      mapInstance.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: GRENOBLE_CENTER,
        zoom: 13
      });

      const map = mapInstance.current;
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Événement au clic sur la carte pour ajouter un nouveau lieu
      map.on('click', (e) => {
        const coordinates = [e.lngLat.lng, e.lngLat.lat];

        // First, remove any existing temporary click marker
        if (window.tempClickMarker) {
            window.tempClickMarker.remove();
        }

        // Add a new marker at the clicked location
        const marker = new mapboxgl.Marker({
            color: "#3470cc",
            draggable: true
        })
        .setLngLat(coordinates)
        .addTo(map);
        
        // Store reference to this temporary marker
        window.tempClickMarker = marker;
        
        // Add a popup with options
        const popup = new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
            <div>
                <p><strong>Position:</strong> ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</p>
            </div>
            `);
        
        marker.setPopup(popup);
        marker.togglePopup(); // Show the popup immediately
        
        // Géocoder les coordonnées pour obtenir l'adresse
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}`)
          .then(response => response.json())
          .then(data => {
            const address = data.features[0]?.place_name || 'Adresse inconnue';
            setNewLocationCoords(coordinates);
            setNewLocationAddress(address);
            setNewLocationName('');

            // Update popup with the address
            popup.setHTML(`
                <div>
                <p><strong>Position:</strong> ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</p>
                <p><strong>Adresse:</strong> ${address}</p>
                </div>
            `);
          });
      });

      // Chargement terminé
      map.on('load', () => {
        refreshMarkers();
      });
    }

    setMapInitialized(true);
    
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [isLoading, props.authState]);

  // Mettre à jour les marqueurs quand les favoris changent
  useEffect(() => {
    refreshMarkers();
  }, [favoriteLocations]);

  // Rafraîchir les marqueurs sur la carte
  const refreshMarkers = () => {
    if (!mapInstance.current || !mapInstance.current.loaded()) return;
    
    // Supprimer les marqueurs existants
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Ajouter des marqueurs pour chaque lieu favori
    favoriteLocations.forEach(location => {
      const marker = new mapboxgl.Marker()
        .setLngLat(location.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div>
              <h3>${location.name}</h3>
              <p>${location.address}</p>
            </div>
          `))
        .addTo(mapInstance.current);
      
      markersRef.current.push(marker);
    });
  };

  // Fonction pour rechercher des adresses en temps réel
  const searchAddressWithDebounce = (value) => {
    setSearchAddress(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // URL avec les paramètres optimisés pour Grenoble
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${mapboxgl.accessToken}`
          + `&proximity=${GRENOBLE_CENTER.join(',')}`  // Centre de recherche
          + `&bbox=${GRENOBLE_BBOX.join(',')}`         // Zone de restriction
          + `&country=fr`                              // Limiter à la France
          + `&types=address,poi,postcode,place`        // Types de résultats à inclure
          + `&language=fr`                             // Résultats en français
          + `&limit=5`                                 // Limiter à 5 résultats
        );
        
        const data = await response.json();
        
        // Filtrer les résultats pour être sûr qu'ils sont dans la zone voulue
        const filteredResults = data.features.filter(feature => {
          // Vérifier si les coordonnées sont dans la bounding box
          const [lng, lat] = feature.center;
          return (
            lng >= GRENOBLE_BBOX[0] && 
            lat >= GRENOBLE_BBOX[1] && 
            lng <= GRENOBLE_BBOX[2] && 
            lat <= GRENOBLE_BBOX[3]
          );
        });
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Erreur lors de la recherche d\'adresse:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Gestion de la sélection d'une suggestion
  const selectSearchResult = (result) => {
    if (result && result.geometry && result.geometry.coordinates) {
      const coordinates = result.geometry.coordinates;
      const address = result.place_name || 'Adresse inconnue';
      
      // Effacer le champ de recherche
      setSearchAddress('');
      
      // Effacer les résultats
      setSearchResults([]);
      
      // Définir la nouvelle localisation
      setNewLocationCoords(coordinates);
      setNewLocationAddress(address);
      setNewLocationName('');
      
      // Centrer la carte sur la localisation sélectionnée
      if (mapInstance.current) {
        mapInstance.current.flyTo({
          center: coordinates,
          zoom: 15
        });
        
        // Créer un marqueur temporaire
        new mapboxgl.Marker({ color: '#FF0000' })
          .setLngLat(coordinates)
          .addTo(mapInstance.current);
      }
    }
  };

  const searchAddressByText = async () => {
    if (!searchAddress.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${mapboxgl.accessToken}&proximity=${GRENOBLE_CENTER.join(',')}`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      alert('Erreur lors de la recherche d\'adresse');
    } finally {
      setIsSearching(false);
    }
  };

  // Ajouter un nouveau lieu
  const addLocation = async () => {
    if (!newLocationName.trim() || !newLocationCoords.length) {
      alert('Veuillez entrer un nom et sélectionner un lieu sur la carte');
      return;
    }
    
    const newLocation = {
      id: `loc_${Date.now()}`,
      name: newLocationName,
      address: newLocationAddress,
      coordinates: newLocationCoords,
    };
    
    const updatedLocations = [...favoriteLocations, newLocation];
    
    try {
      await updateUserData(undefined, undefined, undefined, { favoriteLocations: updatedLocations });
      setFavoriteLocations(updatedLocations);
      setNewLocationName('');
      setNewLocationAddress('');
      setNewLocationCoords([]);
      // Remove the temporary marker
      if (window.tempClickMarker) {
        window.tempClickMarker.remove();
        window.tempClickMarker = null;
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Supprimer un lieu favori
  const deleteLocation = async (locationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) return;
    
    const updatedLocations = favoriteLocations.filter(loc => loc.id !== locationId);
    
    try {
      await updateUserData(undefined, undefined, undefined, { favoriteLocations: updatedLocations });
      setFavoriteLocations(updatedLocations);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Utiliser un lieu comme point de départ ou d'arrivée
  const locationAs = (location, type) => {
    // Récupérer l'URL actuelle
    const currentUrl = new URL(window.location.href);
    
    // Créer une nouvelle URL pour la page d'accueil
    const newUrl = new URL('/', currentUrl.origin);
    
    // Ajouter le paramètre approprié (from ou to)
    newUrl.searchParams.set(type, encodeURIComponent(location.name));
    
    // Ajouter également les coordonnées pour une meilleure précision
    newUrl.searchParams.set(`${type}_coords`, `${location.coordinates[0]},${location.coordinates[1]}`);
    
    // Rediriger vers la nouvelle URL
    window.location.href = newUrl.toString();
  };

  if (props.authState === authStates.INITIAL_VALUE || isLoading) {
    return <Loader />;
  }

  if (props.authState === authStates.LOGGED_OUT) {
    const currentUrl = window.location.pathname;
    return (
      <div className="locations-unauthorized">
        <h2>Mes Lieux Favoris</h2>
        <p>Vous devez vous connecter pour accéder à cette fonctionnalité</p>
        <Link to={`/login?redirect=${currentUrl}`}>
          <Button className="locations-button" kind="primary">Se connecter</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={`locations-container ${showMapOnMobile ? 'show-map-mobile' : 'show-list-mobile'}`}>      <div className="locations-sidebar">
        <h2>Mes Lieux Favoris</h2>

        <div className="address-search-form">
          <h3>Rechercher une adresse</h3>
          <TextInput
            id="address-search"
            labelText="Adresse"
            placeholder="Ex: 1 Place Grenette, Grenoble"
            value={searchAddress}
            onChange={(e) => searchAddressWithDebounce(e.target.value)}
          />
          {isSearching && (
            <div className="search-loading">Recherche en cours...</div>
          )}
          
          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h4>Résultats</h4>
              {searchResults.map((result, index) => (
                <div 
                  key={index} 
                  className="search-result-item"
                  onClick={() => selectSearchResult(result)}
                >
                  <p>{result.place_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {newLocationCoords.length > 0 && (
          <div className="new-location-form">
            <h3>Ajouter un nouveau lieu</h3>
            <p>{newLocationAddress}</p>
            <TextInput
              id="location-name"
              labelText="Nom du lieu"
              placeholder="Ex: Mon domicile"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
            <Button onClick={addLocation}>Ajouter aux favoris</Button>
          </div>
        )}
        
        <div className="locations-list">
          {favoriteLocations.length === 0 ? (
            <p>Aucun lieu favori enregistré. Cliquez sur la carte ou cherchez via la barre de recherche pour ajouter un lieu.</p>
          ) : (
            favoriteLocations.map((location) => (
            <Tile key={location.id} className="location-tile">
                <div className="location-info">
                  <h4>{location.name}</h4>
                  <p className="location-address">{location.address}</p>
                </div>
                
                <div className="location-actions">
                    <div className="location-buttons-row">
                        <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={TrashCan}
                        iconDescription="Supprimer"
                        hasIconOnly
                        tooltipPosition="bottom"
                        tooltipAlignment="center"
                        onClick={() => deleteLocation(location.id)}
                        />
                    </div>
                    
                    <div className="location-buttons-row">
                        <Button
                        kind="tertiary"
                        size="sm"
                        renderIcon={Home}
                        onClick={() => locationAs(location, 'from')}
                        >
                        Départ
                        </Button>
                        <Button
                        kind="tertiary"
                        size="sm"
                        renderIcon={ArrowDown}
                        onClick={() => locationAs(location, 'to')}
                        >
                        Arrivée
                        </Button>
                    </div>
                </div>
              </Tile>
            ))
          )}
        </div>
      </div>
      
      <div className={`map-container-sortie ${showMapOnMobile ? 'map-visible' : 'map-hidden'}`} ref={mapContainerRef}></div>
      <div className="mobile-map-toggle">
        <Button 
          kind="secondary"
          onClick={toggleMapOnMobile}
        >
          {showMapOnMobile ? 'Retour à la liste' : 'Voir la carte'}
        </Button>
      </div>
    </div>
  );
}

export default withAuth(Locations);