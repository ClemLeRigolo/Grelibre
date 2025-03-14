import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button, Tile, TextInput } from "@carbon/react";
import { TrashCan, Edit } from "@carbon/icons-react";
import { authStates, withAuth } from "../components/auth";
import { getUserData, updateUserData } from "../utils/firebase";
import Loader from "../components/loader";
import { Link } from "react-router-dom";
import '../styles/localisations.css';

// Token d'accès Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVyZ2VvbmgiLCJhIjoiY204OG0zdWJhMGx4MzJtczVjYWZkZTN0NiJ9.zL-NC_caiJbgVsp9DV-yiA';

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [5.724524, 45.188529]; // [longitude, latitude]

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
        
        // Géocoder les coordonnées pour obtenir l'adresse
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates[0]},${coordinates[1]}.json?access_token=${mapboxgl.accessToken}`)
          .then(response => response.json())
          .then(data => {
            const address = data.features[0]?.place_name || 'Adresse inconnue';
            setNewLocationCoords(coordinates);
            setNewLocationAddress(address);
            setNewLocationName('');
          });
      });

      // Chargement terminé
      map.on('load', () => {
        refreshMarkers();
      });
    }
    
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
    // Mettre à jour le champ de recherche immédiatement
    setSearchAddress(value);
    
    // Effacer tout timeout précédent
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // N'exécuter la recherche que si le champ n'est pas vide
    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    // Définir un délai avant de lancer la recherche (300ms)
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${mapboxgl.accessToken}&proximity=${GRENOBLE_CENTER.join(',')}&country=fr`
        );
        const data = await response.json();
        setSearchResults(data.features || []);
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
    window.location.href = `/map?${type}=${encodeURIComponent(location.name)}`;
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
    <div className="locations-container">
      <div className="locations-sidebar">
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
            <p>Aucun lieu favori enregistré. Cliquez sur la carte pour ajouter un lieu.</p>
          ) : (
            favoriteLocations.map((location) => (
              <Tile key={location.id} className="location-item">
                <h3>{location.name}</h3>
                <p>{location.address}</p>
                
                <div className="location-actions">
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription="Supprimer"
                    onClick={() => deleteLocation(location.id)}
                  >
                    Supprimer
                  </Button>
                  <Button
                    kind="tertiary"
                    size="sm"
                    onClick={() => locationAs(location, 'from')}
                  >
                    Départ
                  </Button>
                  <Button
                    kind="tertiary"
                    size="sm"
                    onClick={() => locationAs(location, 'to')}
                  >
                    Arrivée
                  </Button>
                </div>
              </Tile>
            ))
          )}
        </div>
      </div>
      
      <div className="locations-map" ref={mapContainerRef}></div>
    </div>
  );
}

export default withAuth(Locations);