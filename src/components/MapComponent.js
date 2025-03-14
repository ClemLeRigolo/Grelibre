import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/MapComponent.css';
import axios from 'axios'; // Assure-toi d'installer axios: npm install axios

// Token d'accès Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVyZ2VvbmgiLCJhIjoiY204OG0zdWJhMGx4MzJtczVjYWZkZTN0NiJ9.zL-NC_caiJbgVsp9DV-yiA';

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [5.724524, 45.188529]; // [longitude, latitude]

// URL de base de l'API SMMAG
const SMMAG_API_BASE_URL = 'https://data.mobilites-m.fr/api';

const MapComponent = () => {
    const mapContainerRef = useRef(null);
    const mapInstance = useRef(null);
    const [showTransport, setShowTransport] = useState(true);
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [routeInfo, setRouteInfo] = useState('');
    const [transportLines, setTransportLines] = useState([]);
    const [transportMode, setTransportMode] = useState('TRANSIT,WALK'); // Par défaut, transit et marche
    const markersRef = useRef([]);
    const routeSourceRef = useRef(null);

    // Initialisation de la carte
    useEffect(() => {
        if (!mapInstance.current && mapContainerRef.current) {
            mapInstance.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: GRENOBLE_CENTER,
                zoom: 13
            });

            const map = mapInstance.current;

            // Ajouter les contrôles de navigation
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Chargement des données quand la carte est prête
            map.on('load', () => {
                // Chargement des lignes de transport
                fetchTransportLines();

                // Ajouter la couche des transports en commun
                map.addSource('transports', {
                    type: 'geojson',
                    data: '/data/data_transport_commun_grenoble.geojson'
                });

                // Ajouter les lignes de transport
                map.addLayer({
                    id: 'transport-lines',
                    type: 'line',
                    source: 'transports',
                    filter: ['==', ['geometry-type'], 'LineString'],
                    paint: {
                        'line-color': '#3366FF',
                        'line-width': 3,
                        'line-opacity': 0.8
                    }
                });

                // Ajouter les arrêts de transport
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

                // Gestion des popups sur les points
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
                
                // Changer le curseur au survol des arrêts
                map.on('mouseenter', 'transport-stops', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                
                map.on('mouseleave', 'transport-stops', () => {
                    map.getCanvas().style.cursor = '';
                });

                // Créer une source vide pour les itinéraires
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: []
                    }
                });
                routeSourceRef.current = 'route';

                // Ajouter une couche pour les itinéraires
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
                            '#6CB1FF'  // couleur par défaut
                        ],
                        'line-width': 5,
                        'line-opacity': 0.8
                    }
                });
            });
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Charger les lignes de transport disponibles
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

    // Fonction pour convertir les coordonnées en format attendu par l'API SMMAG
    const formatCoordinates = (coords) => {
        return `${coords[1]},${coords[0]}`; // L'API attend "lat,lon"
    };

    // Fonction pour rechercher les coordonnées d'un lieu
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

    // Fonction pour calculer un itinéraire avec l'API SMMAG
    const calculateRoute = async () => {
        if (!startPoint || !endPoint) {
            setRouteInfo('Veuillez saisir un point de départ et d\'arrivée');
            return;
        }
        
        setRouteInfo('Recherche en cours...');
        
        try {
            // Nettoyer les marqueurs précédents
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];
            
            // Geocoder les points de départ et d'arrivée
            const startCoords = await geocodePlace(startPoint);
            const endCoords = await geocodePlace(endPoint);
            
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
        }
    };

    // Fonction pour formater l'heure
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // Fonction pour décoder le polyline (format de Google Maps)
    const decodePolyline = (encoded) => {
        // Cette fonction est adaptée de la bibliothèque polyline de Mapbox
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
            
            // Diviser par 1e5 pour convertir les valeurs en degrés
            coordinates.push([lng / 1e5, lat / 1e5]);
        }
        
        return coordinates;
    };

    // Gérer le changement de mode de transport
    const handleModeChange = (e) => {
        setTransportMode(e.target.value);
    };

    return (
        <div className="map-container">
            <div className="map" ref={mapContainerRef}></div>
            <div className="sidebar carbon-styled">
                <h1>Carte de Grenoble</h1>
                <div className="controls">
                    <div className="toggle-container">
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={showTransport}
                                onChange={handleToggleTransport}
                            />
                            <span className="slider"></span>
                        </label>
                        <span>Afficher les transports en commun</span>
                    </div>
                    
                    <div className="routing-container">
                        <h2>Recherche d'itinéraire</h2>
                        <input 
                            type="text" 
                            id="start-point"
                            value={startPoint}
                            onChange={(e) => setStartPoint(e.target.value)}
                            placeholder="Point de départ" 
                        />
                        <input 
                            type="text"
                            id="end-point"
                            value={endPoint}
                            onChange={(e) => setEndPoint(e.target.value)}
                            placeholder="Point d'arrivée" 
                        />
                        
                        <div className="mode-selector">
                            <label>Mode de transport:</label>
                            <select value={transportMode} onChange={handleModeChange}>
                                <option value="TRANSIT,WALK">Transport en commun</option>
                                <option value="WALK">Marche à pied</option>
                                <option value="BICYCLE">Vélo</option>
                                <option value="TRANSIT,BICYCLE">Transport + Vélo</option>
                            </select>
                        </div>
                        
                        <button onClick={calculateRoute}>Rechercher</button>
                        <div 
                            className="route-info"
                            dangerouslySetInnerHTML={{ __html: routeInfo }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;