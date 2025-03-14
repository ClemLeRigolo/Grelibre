import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/MapComponent.css';
import axios from 'axios';
import Loader from '../components/loader';
import { Search, My, TrashCan, ArrowRight, Location } from '@carbon/icons-react';
import { Search as CarbonSearch, Button, Tag, Dropdown, TextInput, Toggle } from 'carbon-components-react';

// Token d'accès Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVyZ2VvbmgiLCJhIjoiY204OG0zdWJhMGx4MzJtczVjYWZkZTN0NiJ9.zL-NC_caiJbgVsp9DV-yiA';

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [5.724524, 45.188529]; // [longitude, latitude]

// URL de base de l'API SMMAG
const SMMAG_API_BASE_URL = 'https://data.mobilites-m.fr/api';

const MapComponent = () => {
    // Garder vos états existants
    const mapContainerRef = useRef(null);
    const mapInstance = useRef(null);
    const [showTransport, setShowTransport] = useState(true);
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [routeInfo, setRouteInfo] = useState('');
    const [transportLines, setTransportLines] = useState([]);
    const [transportMode, setTransportMode] = useState('TRANSIT,WALK');
    const markersRef = useRef([]);
    const routeSourceRef = useRef(null);
    const userPositionMarkerRef = useRef(null);

    // État pour gérer le chargement
    const [mapLoading, setMapLoading] = useState(true);
    const [routeLoading, setRouteLoading] = useState(false);
    
    // Nouvel état pour la recherche
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchLoading, setIsSearchLoading] = useState(false);
    const [userPosition, setUserPosition] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);

    // Modifications d'états supplémentaires
    const [searchMode, setSearchMode] = useState('search'); // 'search' ou 'route'
    const [selectedDestination, setSelectedDestination] = useState(null);

    // Ajouter cet état pour stocker les couleurs des lignes
    const [routeColors, setRouteColors] = useState({});

    // Ajoutons de nouveaux états pour gérer les filtres de transport
    const [transportFilters, setTransportFilters] = useState({
        showTrams: true,        // route_type 0
        showBuses: true,        // route_type 3
        expandedFilters: false, // pour afficher/masquer les filtres détaillés
        selectedLines: {}       // pour stocker les lignes individuelles sélectionnées
    });

    // État pour stocker les lignes de transport par type
    const [transportLinesByType, setTransportLinesByType] = useState({
        trams: [],  // Lignes de tram
        buses: []   // Lignes de bus
    });

    // Remplacer les deux useEffect séparés par un seul qui gère à la fois la carte et la position
    useEffect(() => {
        // Fonction pour obtenir la position de l'utilisateur
        const getUserPosition = () => {
            return new Promise((resolve) => {
                setLocationLoading(true);
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            setUserPosition([longitude, latitude]);
                            setLocationLoading(false);
                            resolve([longitude, latitude]);
                        },
                        (error) => {
                            console.error("Erreur de géolocalisation:", error);
                            setLocationLoading(false);
                            resolve(GRENOBLE_CENTER); // Utiliser le centre de Grenoble par défaut
                        },
                        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                    );
                } else {
                    setLocationLoading(false);
                    resolve(GRENOBLE_CENTER);
                }
            });
        };

        // Initialiser la carte et la position en même temps
        const initMapAndPosition = async () => {
            // Obtenir la position d'abord
            const position = await getUserPosition();
            
            // Charger les couleurs des lignes avant d'initialiser la carte
            const colors = await loadRouteColorsAsync();
            setRouteColors(colors);
            
            // Ensuite initialiser la carte
            if (!mapInstance.current && mapContainerRef.current) {
                setMapLoading(true);
                
                mapInstance.current = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: position, // Utiliser la position obtenue
                    zoom: 15,
                    maxBounds: getBoundsAround(position, 15)
                });

                const map = mapInstance.current;

                map.addControl(new mapboxgl.NavigationControl(), 'top-right');

                map.on('load', () => {
                    console.log('Carte chargée, chargement des données...');

                    fetchTransportLines();

                    map.addSource('transports', {
                        type: 'geojson',
                        data: '/data/data_transport_commun_grenoble.geojson'
                    });

                    map.addLayer({
                        id: 'transport-lines',
                        type: 'line',
                        source: 'transports',
                        filter: ['==', ['geometry-type'], 'LineString'],
                        paint: {
                            'line-color': [
                                'case',
                                // Essayer d'abord avec route_short_name
                                ['has', ['get', 'route_short_name'], ['literal', routeColors]],
                                ['get', ['get', 'route_short_name'], ['literal', routeColors]],
                                // Puis avec route_id si disponible
                                ['has', ['get', 'route_id'], ['literal', routeColors]],
                                ['get', ['get', 'route_id'], ['literal', routeColors]],
                                // Couleurs spécifiques pour les types de transport
                                ['==', ['get', 'route_type'], '0'], '#DE9917', // Tram
                                ['==', ['get', 'route_type'], '3'], '#1E71B8', // Bus
                                '#3366FF' // Couleur par défaut
                            ],
                            'line-width': 3,
                            'line-opacity': 0.8
                        }
                    });

                    map.addLayer({
                        id: 'transport-stops',
                        type: 'circle',
                        source: 'transports',
                        filter: ['==', ['geometry-type'], 'Point'],
                        paint: {
                            'circle-radius': 6,
                            'circle-color': '#FF5733',
                            'circle-opacity': 0.8
                        }
                    });

                    // Code existant pour les popups et événements
                    map.on('click', 'transport-stops', (e) => {
                        const coordinates = e.features[0].geometry.coordinates.slice();
                        const properties = e.features[0].properties;
                        
                        let popupContent = '<div class="popup-content">';
                        
                        // Ajouter les propriétés pertinentes au popup
                        for (const [key, value] of Object.entries(properties)) {
                            if (value && typeof value === 'string') {
                                popupContent += `<b>${key}:</b> ${value}<br>`;
                            }
                        }
                        
                        // Ajouter boutons pour définir comme origine/destination
                        popupContent += `
                            <div class="popup-actions">
                                <button class="popup-button" onclick="document.getElementById('start-point').value='${properties.name || coordinates.join(',')}'; document.getElementById('start-point').dispatchEvent(new Event('change'))">Définir comme origine</button>
                                <button class="popup-button" onclick="document.getElementById('end-point').value='${properties.name || coordinates.join(',')}'; document.getElementById('end-point').dispatchEvent(new Event('change'))">Définir comme destination</button>
                            </div>
                        `;
                        
                        popupContent += '</div>';
                        
                        // Ajuster le zoom si nécessaire
                        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                        }
                        
                        new mapboxgl.Popup()
                            .setLngLat(coordinates)
                            .setHTML(popupContent)
                            .addTo(map);
                    });
                    
                    map.on('mouseenter', 'transport-stops', () => {
                        map.getCanvas().style.cursor = 'pointer';
                    });
                    
                    map.on('mouseleave', 'transport-stops', () => {
                        map.getCanvas().style.cursor = '';
                    });

                    map.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: []
                        }
                    });
                    routeSourceRef.current = 'route';

                    map.addLayer({
                        id: 'route',
                        type: 'line',
                        source: 'route',
                        layout: {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        paint: {
                            'line-color': ['match', 
                                ['get', 'mode'],
                                'WALK', '#6CB1FF',
                                'TRANSIT', '#FF9900',
                                'SUBWAY', '#FF0000',
                                'BUS', '#009900',
                                'TRAM', '#9900FF',
                                '#6CB1FF'
                            ],
                            'line-width': 5,
                            'line-opacity': 0.8
                        }
                    });

                    // Ajouter le marqueur de position utilisateur une seule fois
                    if (position) {
                        // Créer un élément personnalisé pour le marqueur
                        const el = document.createElement('div');
                        el.className = 'user-position-marker';
                        
                        // Créer le nouveau marqueur
                        userPositionMarkerRef.current = new mapboxgl.Marker({
                            element: el,
                            anchor: 'center'
                        })
                        .setLngLat(position)
                        .addTo(map)
                        .setPopup(new mapboxgl.Popup().setHTML(
                            '<div class="popup-content"><h3>Vous êtes ici</h3></div>'
                        ));
                    }

                    map.once('idle', () => {
                        console.log('Carte et données entièrement chargées');
                        setMapLoading(false);
                    });
                });

                map.on('error', (e) => {
                    console.error('Erreur de chargement de la carte:', e);
                    setMapLoading(false);
                });
            }
        };

        initMapAndPosition();

        loadRouteColors();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []); // Dépendances vides pour ne s'exécuter qu'une seule fois

    // Utilisation des fonctions existantes...
    const getBoundsAround = (center, radiusInKm) => {
        // Code existant...
        const radiusInDegrees = radiusInKm / 111;
        
        return new mapboxgl.LngLatBounds(
            [center[0] - radiusInDegrees, center[1] - radiusInDegrees],
            [center[0] + radiusInDegrees, center[1] + radiusInDegrees]
        );
    };

    // Garder vos fonctions existantes...
    const fetchTransportLines = async () => {
        try {
            const response = await axios.get(`${SMMAG_API_BASE_URL}/routers/default/index/routes`);
            setTransportLines(response.data);
        } catch (error) {
            console.error("Erreur lors du chargement des lignes de transport:", error);
        }
    };

    // Gestion de l'affichage des transports
    useEffect(() => {
        if (mapInstance.current && mapInstance.current.isStyleLoaded && mapInstance.current.isStyleLoaded()) {
            const visibility = showTransport ? 'visible' : 'none';
            
            if (mapInstance.current.getLayer('transport-lines')) {
                mapInstance.current.setLayoutProperty('transport-lines', 'visibility', visibility);
            }
            
            if (mapInstance.current.getLayer('transport-stops')) {
                mapInstance.current.setLayoutProperty('transport-stops', 'visibility', visibility);
            }
        }
    }, [showTransport]);

    const handleToggleTransport = () => {
        setShowTransport(!showTransport);
    };

    // Fonctions existantes...
    const formatCoordinates = (coords) => {
        return `${coords[1]},${coords[0]}`;
    };

    const geocodePlace = async (placeName) => {
        try {
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName + ', Grenoble')}.json?access_token=${mapboxgl.accessToken}&limit=1`
            );
            
            if (!response.data.features || response.data.features.length === 0) {
                throw new Error(`Lieu non trouvé: ${placeName}`);
            }
            
            return response.data.features[0].center; // [lon, lat]
        } catch (error) {
            console.error(`Erreur de géocodage pour ${placeName}:`, error);
            throw error;
        }
    };

    // Remplacer la fonction calculateRoute par cette version :

const calculateRoute = async () => {
    if (!startPoint || !endPoint) {
        setRouteInfo('Veuillez saisir un point de départ et d\'arrivée');
        return;
    }
    setRouteLoading(true);
    setRouteInfo('Recherche en cours...');
    
    try {
        // Nettoyer les marqueurs précédents
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        // Obtenir les coordonnées de départ
        let startCoords;
        if (startPoint === "Ma position actuelle") {
            // Utiliser directement les coordonnées de la position utilisateur
            if (!userPosition) {
                throw new Error("Position actuelle non disponible. Veuillez autoriser la géolocalisation.");
            }
            startCoords = userPosition;
        } else {
            // Sinon utiliser le geocoding
            startCoords = await geocodePlace(startPoint);
        }
        
        // Obtenir les coordonnées d'arrivée
        const endCoords = await geocodePlace(endPoint);
        
        console.log("Coordonnées de départ:", startCoords);
        console.log("Coordonnées d'arrivée:", endCoords);
        
        // Format pour l'API OTP : fromPlace=lat,lon&toPlace=lat,lon
        const fromPlace = formatCoordinates(startCoords);
        const toPlace = formatCoordinates(endCoords);
        
        // Date actuelle au format ISO
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
        const timeStr = now.toTimeString().slice(0, 5);  // Format HH:MM
        
        // Paramètres pour l'API SMMAG (basée sur OpenTripPlanner)
        const requestUrl = `${SMMAG_API_BASE_URL}/routers/default/plan`;
        const requestParams = {
            fromPlace,
            toPlace,
            time: timeStr,
            date: dateStr,
            mode: transportMode,
            numItineraries: 3,
            showIntermediateStops: true,
            arriveBy: false,
            maxWalkDistance: transportMode.includes('TRANSIT') ? 1000 : 100000, // Limiter la marche si en mode transit
            walkReluctance: transportMode.includes('TRANSIT') ? 10 : 2, // Préférer les transports si disponibles
            locale: 'fr'
        };
        
        console.log("Requête d'itinéraire:", requestParams);
        
        // Reste du code inchangé...

        // Appel à l'API SMMAG avec les headers requis
        const response = await axios.get(requestUrl, {
            params: requestParams,
            headers: {
                'Origin': 'GreLibre',
                'Accept': 'application/json'
            }
        });
        
        console.log("Réponse de l'API:", response.data);
        
        // Traiter la réponse
        if (!response.data || !response.data.plan || !response.data.plan.itineraries || response.data.plan.itineraries.length === 0) {
            throw new Error('Aucun itinéraire trouvé');
        }
        
        // Récupérer le premier itinéraire
        const itinerary = response.data.plan.itineraries[0];
        
        // Ajoute cette vérification après avoir reçu la réponse
        console.log("Modes de transport dans l'itinéraire:", itinerary.legs.map(leg => leg.mode));
        console.log("Nombre d'étapes:", itinerary.legs.length);
        
        // Convertir l'itinéraire en format GeoJSON pour l'afficher sur la carte
        const features = [];
        
        // Ajouter des marqueurs de départ et d'arrivée
        const startMarker = new mapboxgl.Marker({ color: '#33cc33' })
            .setLngLat(startCoords)
            .addTo(mapInstance.current);
            
        const endMarker = new mapboxgl.Marker({ color: '#e74c3c' })
            .setLngLat(endCoords)
            .addTo(mapInstance.current);
            
        markersRef.current.push(startMarker, endMarker);
        
        // Pour chaque segment de l'itinéraire ("leg")
        itinerary.legs.forEach(leg => {
            // Créer une feature GeoJSON pour ce segment
            const feature = {
                type: 'Feature',
                properties: {
                    mode: leg.mode,
                    duration: leg.duration,
                    distance: leg.distance,
                    routeShortName: leg.routeShortName || '',
                    routeLongName: leg.routeLongName || ''
                },
                geometry: {
                    type: 'LineString',
                    coordinates: leg.legGeometry.points ? decodePolyline(leg.legGeometry.points) : []
                }
            };
            
            features.push(feature);
            
            // Ajouter des marqueurs pour les arrêts intermédiaires si disponibles
            if (leg.intermediateStops && leg.intermediateStops.length > 0) {
                leg.intermediateStops.forEach(stop => {
                    const marker = new mapboxgl.Marker({ color: '#FF9900', scale: 0.7 })
                        .setLngLat([stop.lon, stop.lat])
                        .setPopup(new mapboxgl.Popup().setHTML(`
                            <div class="popup-content">
                                <h3>${stop.name}</h3>
                                <p>Arrivée: ${formatTime(stop.arrival)}</p>
                                <p>Départ: ${formatTime(stop.departure)}</p>
                            </div>
                        `))
                        .addTo(mapInstance.current);
                    
                    markersRef.current.push(marker);
                });
            }
        });
        
        // Mettre à jour la source de données
        mapInstance.current.getSource('route').setData({
            type: 'FeatureCollection',
            features: features
        });
        
        // Ajuster la vue pour voir l'itinéraire complet
        const bounds = new mapboxgl.LngLatBounds();
        features.forEach(feature => {
            feature.geometry.coordinates.forEach(coord => {
                bounds.extend(coord);
            });
        });
        
        mapInstance.current.fitBounds(bounds, {
            padding: 50
        });

        setRouteLoading(false);
        
        // Afficher les informations de l'itinéraire
        const duration = Math.round(itinerary.duration / 60); // minutes
        const distance = (itinerary.walkDistance / 1000).toFixed(1); // distance à pied en km
        const startTime = formatTime(itinerary.startTime);
        const endTime = formatTime(itinerary.endTime);
        
        let stepsInfo = '';
        itinerary.legs.forEach((leg, index) => {
            let mode = 'Inconnu';
            let legDistance = '?';
            
            // Déterminer le mode et l'affichage
            if (leg.mode === 'WALK') {
                mode = 'Marche';
                legDistance = ((leg.distance || 0) / 1000).toFixed(1);
            } else if (leg.mode === 'TRAM' || leg.mode === 'BUS' || leg.mode === 'SUBWAY') {
                mode = leg.mode === 'TRAM' ? 'Tram ' : 
                      leg.mode === 'BUS' ? 'Bus ' : 
                      'Métro ';
                mode += leg.routeShortName || '';
                legDistance = leg.routeLongName || '';
            } else if (leg.mode === 'BICYCLE') {
                mode = 'Vélo';
                legDistance = ((leg.distance || 0) / 1000).toFixed(1);
            } else if (leg.transitLeg) {
                mode = 'Transport';
                legDistance = leg.routeShortName || '';
            }
            
            const legDuration = Math.round((leg.duration || 0) / 60);
            const fromName = leg.from ? leg.from.name : '';
            const toName = leg.to ? leg.to.name : '';
            
            stepsInfo += `<div class="route-step">
                <span class="route-step-mode mode-${(leg.mode || 'unknown').toLowerCase()}">${mode}</span>
                <span class="route-step-info">
                    ${legDistance.includes('.') ? `${legDistance} km` : legDistance} - ${legDuration} min
                    ${fromName && toName ? `<br/><small>De ${fromName} à ${toName}</small>` : ''}
                </span>
            </div>`;
        });

        // Dans la logique d'affichage de l'itinéraire
        let hasTransit = false;
        itinerary.legs.forEach(leg => {
            if (leg.mode !== 'WALK' && leg.mode !== 'BICYCLE') {
                hasTransit = true;
            }
        });

        // Ajuster l'affichage en fonction
        const statsText = hasTransit 
            ? `<strong>${duration} min</strong> · ${distance} km à pied · Transport en commun`
            : `<strong>${duration} min</strong> · ${distance} km à pied`;

        setRouteInfo(`
            <div class="route-summary">
                <div class="route-time">
                    <span>${startTime}</span> → <span>${endTime}</span>
                </div>
                <div class="route-stats">
                    ${statsText}
                </div>
            </div>
            <div class="route-steps">
                ${stepsInfo}
            </div>
        `);
        
    } catch (error) {
        console.error('Erreur lors de la recherche d\'itinéraire:', error);
        setRouteInfo(`Erreur: ${error.message}<br>Vérifiez que les adresses sont correctes.`);
        setRouteLoading(false);
    }
};

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const decodePolyline = (encoded) => {
        let index = 0, lat = 0, lng = 0;
        const coordinates = [];
        const len = encoded.length;
        let shift = 0, result = 0, byte = null;
        
        while (index < len) {
            byte = null;
            shift = 0;
            result = 0;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;
            
            shift = 0;
            result = 0;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;
            
            coordinates.push([lng / 1e5, lat / 1e5]);
        }
        
        return coordinates;
    };

    const handleModeChange = (e) => {
        setTransportMode(e.target.value);
    };

    // Nouvelle fonction pour la recherche
    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchValue(value);
        
        if (value.length < 3) {
            setSearchResults([]);
            return;
        }
        
        setIsSearchLoading(true);
        
        try {
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value + ', Grenoble')}.json?access_token=${mapboxgl.accessToken}&proximity=${GRENOBLE_CENTER.join(',')}&limit=5&country=fr`
            );
            
            if (response.data.features && response.data.features.length > 0) {
                setSearchResults(response.data.features);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error("Erreur de recherche:", error);
            setSearchResults([]);
        } finally {
            setIsSearchLoading(false);
        }
    };

    // Remplacer navigateToSearchResult par:
    const navigateToSearchResult = (result) => {
        // Nettoyer les anciens marqueurs sauf celui de position utilisateur
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        // Récupérer les coordonnées du résultat
        const coords = result.center;
        
        // Ajouter un marqueur pour le résultat
        const marker = new mapboxgl.Marker({ color: '#0f62fe' })
            .setLngLat(coords)
            .addTo(mapInstance.current)
            .setPopup(new mapboxgl.Popup().setHTML(`
                <div class="popup-content">
                    <h3>${result.place_name}</h3>
                </div>
            `));
        
        markersRef.current.push(marker);
        
        // Centrer la carte sur le résultat
        mapInstance.current.flyTo({
            center: coords,
            zoom: 15,
            essential: true
        });
        
        // Passer en mode itinéraire avec le résultat comme destination
        setSearchMode('route');
        setSelectedDestination(result);
        setEndPoint(result.place_name);
        
        // Si on a la position de l'utilisateur, l'utiliser comme point de départ
        if (userPosition) {
            setStartPoint("Ma position actuelle");
        }
        
        // Effacer les résultats de recherche et le champ
        setSearchResults([]);
        setSearchValue('');
    };

    // Fonction pour revenir au mode recherche
    const resetToSearchMode = () => {
        setSearchMode('search');
        setSelectedDestination(null);
        setStartPoint('');
        setEndPoint('');
        
        // Nettoyer les anciens marqueurs et itinéraires
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];
        
        if (mapInstance.current && mapInstance.current.getSource('route')) {
            mapInstance.current.getSource('route').setData({
                type: 'FeatureCollection',
                features: []
            });
        }
    };

    const TransportToggle = ({ showTransport, toggleTransport }) => {
        return (
            <Toggle 
                id="transport-toggle"
                labelText="" 
                labelA="" 
                labelB=""
                toggled={showTransport}
                onToggle={toggleTransport}
                size="sm"
                aria-label="Afficher/masquer les transports"
                className="transport-toggle"
            />
        );
    };

    // Modifier la fonction centerOnUserPosition pour éviter le rechargement

const centerOnUserPosition = () => {
    if (userPosition) {
        mapInstance.current.flyTo({
            center: userPosition,
            zoom: 15,
            essential: true
        });
        
        // Si besoin de réafficher le popup
        if (userPositionMarkerRef.current) {
            userPositionMarkerRef.current.togglePopup();
        }
    } else {
        // Si la position n'est pas encore disponible, la demander sans recharger la carte
        setLocationLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newPosition = [longitude, latitude];
                    setUserPosition(newPosition);
                    
                    // Mettre à jour la position du marqueur existant plutôt que d'en créer un nouveau
                    if (userPositionMarkerRef.current) {
                        userPositionMarkerRef.current.setLngLat(newPosition);
                    } else {
                        // Créer le marqueur seulement s'il n'existe pas
                        const el = document.createElement('div');
                        el.className = 'user-position-marker';
                        
                        userPositionMarkerRef.current = new mapboxgl.Marker({
                            element: el,
                            anchor: 'center'
                        })
                        .setLngLat(newPosition)
                        .addTo(mapInstance.current)
                        .setPopup(new mapboxgl.Popup().setHTML(
                            '<div class="popup-content"><h3>Vous êtes ici</h3></div>'
                        ));
                    }
                    
                    // Centrer la carte sur la nouvelle position
                    mapInstance.current.flyTo({
                        center: newPosition,
                        zoom: 15,
                        essential: true
                    });
                    
                    setLocationLoading(false);
                },
                (error) => {
                    console.error("Erreur de géolocalisation:", error);
                    setLocationLoading(false);
                    alert("Impossible de déterminer votre position");
                }
            );
        }
    }
};

    // Ajouter cette fonction pour charger les couleurs des lignes
    const loadRouteColors = async () => {
        try {
            const response = await fetch('/data/txt/routes.txt');
            const text = await response.text();
            
            // Analyser le fichier CSV
            const lines = text.split('\n');
            const header = lines[0].split(',');
            
            // Trouver les index des colonnes qui nous intéressent
            const routeIdIndex = header.indexOf('route_id');
            const routeShortNameIndex = header.indexOf('route_short_name');
            const routeColorIndex = header.indexOf('route_color');
            
            if (routeIdIndex === -1 || routeColorIndex === -1 || routeShortNameIndex === -1) {
                console.error("Format du fichier routes.txt incorrect");
                return;
            }
            
            // Créer un objet avec les couleurs des lignes
            const colors = {};
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const columns = lines[i].split(',');
                if (columns.length <= Math.max(routeIdIndex, routeColorIndex, routeShortNameIndex)) continue;
                
                const routeId = columns[routeIdIndex];
                const routeShortName = columns[routeShortNameIndex];
                const routeColor = columns[routeColorIndex];
                
                // Stocker par ID et par nom court (pour plus de flexibilité)
                colors[routeId] = `#${routeColor}`;
                colors[routeShortName] = `#${routeColor}`;
            }
            
            console.log("Couleurs des lignes chargées:", colors);
            setRouteColors(colors);
            
            // Mettre à jour les couleurs sur la carte si elle est déjà chargée
            if (mapInstance.current && mapInstance.current.getLayer('transport-lines')) {
                updateTransportColors(colors);
            }
            
        } catch (error) {
            console.error("Erreur lors du chargement des couleurs des lignes:", error);
        }
    };

    // Remplacer la fonction updateTransportColors par cette version améliorée:

const updateTransportColors = (colors) => {
    if (!mapInstance.current) return;
    
    try {
        // Vérifier si la carte est chargée et si le style est chargé
        if (!mapInstance.current.isStyleLoaded()) {
            console.log("Style de la carte pas encore chargé, nouvel essai dans 100ms");
            setTimeout(() => updateTransportColors(colors), 100);
            return;
        }
        
        // Vérifier si la couche existe
        if (!mapInstance.current.getLayer('transport-lines')) {
            console.log("Couche 'transport-lines' non trouvée, nouvel essai dans 100ms");
            setTimeout(() => updateTransportColors(colors), 100);
            return;
        }
        
        console.log("Application des couleurs aux lignes de transport:", colors);
        
        // Mettre à jour la couleur des lignes de transport avec une expression plus robuste
        mapInstance.current.setPaintProperty('transport-lines', 'line-color', [
            'case',
            // Essayer d'abord avec route_short_name
            ['has', ['get', 'route_short_name'], ['literal', colors]],
            ['get', ['get', 'route_short_name'], ['literal', colors]],
            // Puis avec route_id si disponible
            ['has', ['get', 'route_id'], ['literal', colors]],
            ['get', ['get', 'route_id'], ['literal', colors]],
            // Couleurs spécifiques pour les types de transport
            ['==', ['get', 'route_type'], '0'], '#DE9917', // Tram
            ['==', ['get', 'route_type'], '3'], '#1E71B8', // Bus
            '#3366FF' // Couleur par défaut
        ]);
        
        console.log("Couleurs appliquées avec succès");
    } catch (error) {
        console.error("Erreur lors de l'application des couleurs:", error);
    }
};

// Ajouter cet useEffect pour s'assurer que les couleurs sont appliquées après le chargement de la carte
useEffect(() => {
    if (Object.keys(routeColors).length > 0) {
        // Essayer d'appliquer les couleurs immédiatement
        updateTransportColors(routeColors);
        
        // Et aussi avec un délai pour s'assurer que la carte est prête
        const timeoutId = setTimeout(() => {
            updateTransportColors(routeColors);
        }, 1000);
        
        return () => clearTimeout(timeoutId);
    }
}, [routeColors]);

    // Fonction pour charger les lignes de transport et les organiser par type
    const loadTransportLines = async () => {
        try {
            const response = await fetch('/data/txt/routes.txt');
            const text = await response.text();
            
            // Analyser le fichier CSV
            const lines = text.split('\n');
            const header = lines[0].split(',');
            
            // Trouver les index des colonnes qui nous intéressent
            const routeIdIndex = header.indexOf('route_id');
            const routeShortNameIndex = header.indexOf('route_short_name');
            const routeTypeIndex = header.indexOf('route_type');
            const routeColorIndex = header.indexOf('route_color');
            
            const trams = [];
            const buses = [];
            
            // Initialiser tous les filtres à true par défaut
            const initialSelectedLines = {};
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const columns = lines[i].split(',');
                if (columns.length <= Math.max(routeIdIndex, routeTypeIndex, routeShortNameIndex)) continue;
                
                const routeId = columns[routeIdIndex];
                const routeShortName = columns[routeShortNameIndex];
                const routeType = columns[routeTypeIndex];
                const routeColor = columns[routeColorIndex];
                
                const lineInfo = {
                    id: routeId,
                    shortName: routeShortName,
                    type: routeType,
                    color: `#${routeColor}`
                };
                
                // Organiser par type
                if (routeType === '0') {
                    trams.push(lineInfo);
                } else if (routeType === '3') {
                    buses.push(lineInfo);
                }
                
                // Initialiser le filtre de cette ligne à true
                initialSelectedLines[routeId] = true;
            }
            
            // Trier les lignes par nom court
            trams.sort((a, b) => a.shortName.localeCompare(b.shortName));
            buses.sort((a, b) => a.shortName.localeCompare(b.shortName));
            
            setTransportLinesByType({ trams, buses });
            setTransportFilters(prev => ({
                ...prev,
                selectedLines: initialSelectedLines
            }));
            
            console.log("Lignes de transport chargées:", { trams, buses });
            
        } catch (error) {
            console.error("Erreur lors du chargement des lignes de transport:", error);
        }
    };

    // Appeler cette fonction au chargement du composant
    useEffect(() => {
        loadTransportLines();
    }, []);

    // Fonction pour mettre à jour les filtres
    const updateTransportFilter = (filterType, value) => {
        setTransportFilters(prev => {
            const newFilters = { ...prev };
            
            if (filterType === 'showTrams' || filterType === 'showBuses') {
                // Mettre à jour le filtre principal
                newFilters[filterType] = value;
                
                // Mettre à jour tous les filtres de lignes individuelles de ce type
                const lineType = filterType === 'showTrams' ? 'trams' : 'buses';
                transportLinesByType[lineType].forEach(line => {
                    newFilters.selectedLines[line.id] = value;
                });
            } else if (filterType === 'expandedFilters') {
                // Basculer l'état d'expansion
                newFilters.expandedFilters = value;
            } else {
                // Mettre à jour un filtre de ligne individuel
                newFilters.selectedLines[filterType] = value;
                
                // Vérifier si toutes les lignes d'un type sont sélectionnées/désélectionnées
                const allTramSelected = transportLinesByType.trams.every(line => newFilters.selectedLines[line.id]);
                const allBusSelected = transportLinesByType.buses.every(line => newFilters.selectedLines[line.id]);
                
                newFilters.showTrams = allTramSelected;
                newFilters.showBuses = allBusSelected;
            }
            
            return newFilters;
        });
    };

    // Effet pour appliquer les filtres à la carte
    useEffect(() => {
        if (!mapInstance.current) return;
        
        // Créer un filtre pour MapBox basé sur nos sélections
        const selectedLineIds = Object.entries(transportFilters.selectedLines)
            .filter(([_, selected]) => selected)
            .map(([id]) => id);
        
        // Filtre pour les lignes de transport
        const lineFilter = [
            'all',
            ['==', ['geometry-type'], 'LineString'],
            ['in', ['get', 'route_id'], ['literal', selectedLineIds]]
        ];
        
        // Filtre pour les arrêts de transport
        const stopFilter = [
            'all',
            ['==', ['geometry-type'], 'Point'],
            ['in', ['get', 'route_id'], ['literal', selectedLineIds]]
        ];
        
        // Appliquer les filtres aux couches
        if (mapInstance.current.getLayer('transport-lines')) {
            mapInstance.current.setFilter('transport-lines', lineFilter);
        }
        
        if (mapInstance.current.getLayer('transport-stops')) {
            mapInstance.current.setFilter('transport-stops', stopFilter);
        }
        
    }, [transportFilters]);

    return (
        <div className="map-container">
            {mapLoading && (
                <div className="map-loader-overlay">
                    <Loader description="Chargement de la carte..." />
                </div>
            )}
            
            <div className="map" ref={mapContainerRef}></div>
            
            {/* Interface de recherche dynamique */}
            {searchMode === 'search' ? (
                <div className="map-search-container">
                    <div className="search-bar-container">
                        <CarbonSearch
                            id="map-search"
                            labelText="Rechercher un lieu"
                            placeholder="Où aller ?"
                            value={searchValue}
                            onChange={handleSearch}
                            className="map-search-bar"
                            size="lg"
                        />
                        <Button
                            hasIconOnly
                            renderIcon={Location}
                            tooltipAlignment="center"
                            tooltipPosition="bottom"
                            iconDescription="Ma position"
                            onClick={centerOnUserPosition}
                            disabled={locationLoading}
                            className="location-button"
                        />
                    </div>
                    
                    {/* Filtres de transport */}
                    <TransportFilters
                        filters={transportFilters}
                        updateFilter={updateTransportFilter}
                        transportLinesByType={transportLinesByType}
                    />
                    
                    {searchResults.length > 0 && (
                        <div className="search-results">
                            {searchResults.map((result) => (
                                <div 
                                    key={result.id} 
                                    className="search-result-item"
                                    onClick={() => navigateToSearchResult(result)}
                                >
                                    <Search size={16} className="search-result-icon" />
                                    <div className="search-result-content">
                                        <div className="search-result-name">{result.text}</div>
                                        <div className="search-result-address">{result.place_name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="route-panel">
                    <div className="route-panel-header">
                        <Button
                            kind="ghost"
                            renderIcon={ArrowRight}
                            iconDescription="Retour à la recherche"
                            onClick={resetToSearchMode}
                            className="back-button"
                            hasIconOnly
                        />
                        <h2 className="route-panel-title">{selectedDestination?.text || endPoint}</h2>
                        <div className="route-panel-actions">
                            <TransportToggle 
                                showTransport={showTransport} 
                                toggleTransport={handleToggleTransport} 
                            />
                        </div>
                    </div>
                    
                    <div className="route-form">
                        <div className="input-group">
                            <div className="input-with-icon">
                                <input 
                                    type="text" 
                                    id="start-point"
                                    value={startPoint}
                                    onChange={(e) => setStartPoint(e.target.value)}
                                    placeholder="Point de départ" 
                                    disabled={routeLoading}
                                />
                                <button 
                                    className={`icon-button ${startPoint === "Ma position actuelle" ? 'active' : ''}`}
                                    onClick={() => setStartPoint("Ma position actuelle")}
                                    disabled={routeLoading}
                                    title="Utiliser ma position"
                                >
                                    <Location size={16} />
                                </button>
                            </div>
                            
                            <div className="input-with-icon">
                                <input 
                                    type="text"
                                    id="end-point"
                                    value={endPoint}
                                    onChange={(e) => setEndPoint(e.target.value)}
                                    placeholder="Point d'arrivée" 
                                    disabled={routeLoading}
                                />
                                <button 
                                    className="icon-button"
                                    onClick={() => {
                                        const temp = startPoint;
                                        setStartPoint(endPoint);
                                        setEndPoint(temp);
                                    }}
                                    disabled={routeLoading}
                                    title="Échanger les points"
                                >
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="mode-selector">
                            <label>Mode de transport:</label>
                            <select value={transportMode} onChange={handleModeChange} disabled={routeLoading}>
                                <option value="TRANSIT,WALK">🚆 Transport en commun</option>
                                <option value="WALK">🚶 Marche à pied</option>
                                <option value="BICYCLE">🚲 Vélo</option>
                                <option value="TRANSIT,BICYCLE">🚆+🚲 Transport + Vélo</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={calculateRoute}
                            disabled={routeLoading || !startPoint || !endPoint}
                            className="search-route-button"
                        >
                            {routeLoading ? 'Recherche en cours...' : 'Rechercher'}
                        </button>

                        {routeLoading ? (
                            <div className="route-loader">
                                <Loader description="Calcul de l'itinéraire..." />
                            </div>
                        ) : routeInfo && (
                            <div 
                                className="route-info"
                                dangerouslySetInnerHTML={{ __html: routeInfo }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Composant pour le filtre de transport
const TransportFilters = ({ filters, updateFilter, transportLinesByType }) => {
    return (
        <div className="transport-filters-container">
            <Button
                kind="ghost"
                onClick={() => updateFilter('expandedFilters', !filters.expandedFilters)}
                className="filter-toggle-button"
            >
                {filters.expandedFilters ? 'Masquer les filtres' : 'Filtrer les transports'}
            </Button>
            
            {filters.expandedFilters && (
                <div className="filters-panel">
                    <div className="filter-category">
                        <div className="filter-group">
                            <Toggle
                                id="tram-filter"
                                labelText="Tramways"
                                toggled={filters.showTrams}
                                onToggle={() => updateFilter('showTrams', !filters.showTrams)}
                            />
                        </div>
                        
                        {transportLinesByType.trams.length > 0 && (
                            <div className="filter-lines">
                                {transportLinesByType.trams.map(line => (
                                    <div key={line.id} className="line-filter">
                                        <input
                                            type="checkbox"
                                            id={`line-${line.id}`}
                                            checked={filters.selectedLines[line.id] || false}
                                            onChange={(e) => updateFilter(line.id, e.target.checked)}
                                        />
                                        <label 
                                            htmlFor={`line-${line.id}`}
                                            style={{
                                                backgroundColor: line.color,
                                                color: '#FFFFFF'
                                            }}
                                        >
                                            {line.shortName}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="filter-category">
                        <div className="filter-group">
                            <Toggle
                                id="bus-filter"
                                labelText="Bus"
                                toggled={filters.showBuses}
                                onToggle={() => updateFilter('showBuses', !filters.showBuses)}
                            />
                        </div>
                        
                        {transportLinesByType.buses.length > 0 && (
                            <div className="filter-lines">
                                {transportLinesByType.buses.map(line => (
                                    <div key={line.id} className="line-filter">
                                        <input
                                            type="checkbox"
                                            id={`line-${line.id}`}
                                            checked={filters.selectedLines[line.id] || false}
                                            onChange={(e) => updateFilter(line.id, e.target.checked)}
                                        />
                                        <label 
                                            htmlFor={`line-${line.id}`}
                                            style={{
                                                backgroundColor: line.color,
                                                color: '#FFFFFF'
                                            }}
                                        >
                                            {line.shortName}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;

// Et ajouter cette nouvelle fonction pour charger les couleurs de manière asynchrone:
const loadRouteColorsAsync = async () => {
    try {
        const response = await fetch('/data/txt/routes.txt');
        const text = await response.text();
        
        // Analyser le fichier CSV
        const lines = text.split('\n');
        const header = lines[0].split(',');
        
        // Trouver les index des colonnes qui nous intéressent
        const routeIdIndex = header.indexOf('route_id');
        const routeShortNameIndex = header.indexOf('route_short_name');
        const routeColorIndex = header.indexOf('route_color');
        
        if (routeIdIndex === -1 || routeColorIndex === -1 || routeShortNameIndex === -1) {
            console.error("Format du fichier routes.txt incorrect");
            return {};
        }
        
        // Créer un objet avec les couleurs des lignes
        const colors = {};
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const columns = lines[i].split(',');
            if (columns.length <= Math.max(routeIdIndex, routeColorIndex, routeShortNameIndex)) continue;
            
            const routeId = columns[routeIdIndex];
            const routeShortName = columns[routeShortNameIndex];
            const routeColor = columns[routeColorIndex];
            
            // Stocker par ID et par nom court (pour plus de flexibilité)
            colors[routeId] = `#${routeColor}`;
            colors[routeShortName] = `#${routeColor}`;
        }
        
        console.log("Couleurs des lignes chargées de manière asynchrone:", colors);
        return colors;
    } catch (error) {
        console.error("Erreur lors du chargement asynchrone des couleurs:", error);
        return {};
    }
};