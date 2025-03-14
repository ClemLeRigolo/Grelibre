import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/MapComponent.css';

// Token d'accès Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVyZ2VvbmgiLCJhIjoiY204OG0zdWJhMGx4MzJtczVjYWZkZTN0NiJ9.zL-NC_caiJbgVsp9DV-yiA';

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [5.724524, 45.188529]; // Attention : Mapbox utilise [longitude, latitude]

const MapComponent = () => {
    const mapContainerRef = useRef(null);
    const mapInstance = useRef(null);
    const [showTransport, setShowTransport] = useState(true);
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [routeInfo, setRouteInfo] = useState('');
    const routeRef = useRef(null);

    // Initialisation de la carte
    useEffect(() => {
        if (!mapInstance.current && mapContainerRef.current) {
            mapInstance.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12', // Style par défaut de Mapbox
                center: GRENOBLE_CENTER,
                zoom: 13
            });

            const map = mapInstance.current;

            // Ajouter les contrôles de navigation
            map.addControl(new mapboxgl.NavigationControl(), 'top-right');

            // Chargement des données quand la carte est prête
            map.on('load', () => {
                // Ajouter la couche de la ville de Grenoble
                // map.addSource('grenoble', {
                //     type: 'geojson',
                //     data: '/data/grenoble.geojson'
                // });

                // map.addLayer({
                //     id: 'grenoble-outline',
                //     type: 'line',
                //     source: 'grenoble',
                //     paint: {
                //         'line-color': '#3388ff',
                //         'line-width': 2,
                //         'line-opacity': 0.7
                //     }
                // });

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
            });
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Gestion de l'affichage des transports
    useEffect(() => {
        if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
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

    const handleFindRoute = () => {
        if (!startPoint || !endPoint) {
            setRouteInfo('Veuillez saisir un point de départ et d\'arrivée');
            return;
        }
        
        setRouteInfo('Recherche en cours...');
        
        // Supprimer la route précédente si elle existe
        if (mapInstance.current.getLayer('route')) {
            mapInstance.current.removeLayer('route');
        }
        if (mapInstance.current.getSource('route')) {
            mapInstance.current.removeSource('route');
        }
        
        // Géocodage pour trouver les coordonnées du point de départ
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(startPoint + ', Grenoble')}.json?access_token=${mapboxgl.accessToken}&limit=1`)
            .then(response => response.json())
            .then(startData => {
                if (!startData.features || startData.features.length === 0) {
                    throw new Error('Point de départ non trouvé');
                }
                
                const startCoords = startData.features[0].center;
                
                // Géocodage pour trouver les coordonnées du point d'arrivée
                return fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(endPoint + ', Grenoble')}.json?access_token=${mapboxgl.accessToken}&limit=1`)
                    .then(response => response.json())
                    .then(endData => {
                        if (!endData.features || endData.features.length === 0) {
                            throw new Error('Point d\'arrivée non trouvé');
                        }
                        
                        const endCoords = endData.features[0].center;
                        
                        // Utilisation de l'API Mapbox Directions pour tracer la route
                        return fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`)
                            .then(response => response.json())
                            .then(data => {
                                if (!data.routes || data.routes.length === 0) {
                                    throw new Error('Aucun itinéraire trouvé');
                                }
                                
                                const route = data.routes[0];
                                
                                // Ajouter les marqueurs de départ et d'arrivée
                                // Marqueur de départ
                                new mapboxgl.Marker({ color: '#33cc33' })
                                    .setLngLat(startCoords)
                                    .addTo(mapInstance.current);
                                
                                // Marqueur d'arrivée
                                new mapboxgl.Marker({ color: '#e74c3c' })
                                    .setLngLat(endCoords)
                                    .addTo(mapInstance.current);
                                
                                // Ajouter la route à la carte
                                mapInstance.current.addSource('route', {
                                    type: 'geojson',
                                    data: {
                                        type: 'Feature',
                                        geometry: route.geometry
                                    }
                                });
                                
                                mapInstance.current.addLayer({
                                    id: 'route',
                                    type: 'line',
                                    source: 'route',
                                    paint: {
                                        'line-color': '#6CB1FF',
                                        'line-width': 5,
                                        'line-opacity': 0.8
                                    }
                                });
                                
                                // Ajuster la vue pour voir toute la route
                                const coordinates = route.geometry.coordinates;
                                const bounds = coordinates.reduce((bounds, coord) => {
                                    return bounds.extend(coord);
                                }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
                                
                                mapInstance.current.fitBounds(bounds, {
                                    padding: 50
                                });
                                
                                // Afficher les informations de l'itinéraire
                                const distance = Math.round(route.distance / 1000 * 10) / 10; // km avec 1 décimale
                                const duration = Math.round(route.duration / 60); // minutes
                                
                                setRouteInfo(`Distance: ${distance} km, Durée: ${duration} min`);
                            });
                    });
            })
            .catch(error => {
                console.error('Erreur lors de la recherche d\'itinéraire:', error);
                setRouteInfo('Erreur: ' + error.message);
            });
    };

    return (
        <div className="map-container">
            <div className="map" ref={mapContainerRef}></div>
            <div className="sidebar">
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
                            value={startPoint}
                            onChange={(e) => setStartPoint(e.target.value)}
                            placeholder="Point de départ" 
                        />
                        <input 
                            type="text"
                            value={endPoint}
                            onChange={(e) => setEndPoint(e.target.value)}
                            placeholder="Point d'arrivée" 
                        />
                        <button onClick={handleFindRoute}>Rechercher</button>
                        <div className="route-info">{routeInfo}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapComponent;