import React, { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet';
import 'leaflet-routing-machine';
import '../styles/MapComponent.css';

// Correction pour les icônes par défaut de Leaflet qui ne s'affichent pas correctement en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Coordonnées du centre de Grenoble
const GRENOBLE_CENTER = [45.188529, 5.724524];

const MapComponent = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const grenobleLayerRef = useRef(null);
    const transportLayerRef = useRef(null);
    const routingControlRef = useRef(null);
    const [showTransport, setShowTransport] = useState(true);
    const [startPoint, setStartPoint] = useState('');
    const [endPoint, setEndPoint] = useState('');
    const [routeInfo, setRouteInfo] = useState('');

    useEffect(() => {
        // Initialisation de la carte
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current).setView(GRENOBLE_CENTER, 13);

            // Ajout du fond de carte OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);

            // Chargement de la couche Grenoble
            fetch('/data/grenoble.geojson')
                .then(response => response.json())
                .then(data => {
                    grenobleLayerRef.current = L.geoJSON(data, {
                        style: {
                            color: '#3388ff',
                            weight: 2,
                            opacity: 0.7,
                            fillOpacity: 0.1
                        }
                    }).addTo(mapInstance.current);
                })
                .catch(error => console.error('Erreur lors du chargement du fichier Grenoble:', error));

            // Chargement de la couche des transports en commun
            fetch('/data/data_transport_commun_grenoble.geojson')
                .then(response => response.json())
                .then(data => {
                    // Fonction pour styliser les différents éléments de transport
                    function styleTransport(feature) {
                        const type = feature.properties?.type || 'default';
                        
                        const styles = {
                            'arret': { color: '#FF5733', radius: 6 },
                            'ligne': { color: '#3366FF', weight: 3 },
                            'default': { color: '#33FF57', weight: 2 }
                        };
                        
                        return styles[type] || styles.default;
                    }

                    // Fonction pour créer les popups
                    function onEachFeature(feature, layer) {
                        if (feature.properties) {
                            let popupContent = '<div class="popup-content">';
                            
                            // Ajouter les propriétés pertinentes au popup
                            for (const [key, value] of Object.entries(feature.properties)) {
                                if (value && typeof value === 'string' && key !== 'geometry') {
                                    popupContent += `<b>${key}:</b> ${value}<br>`;
                                }
                            }
                            
                            popupContent += '</div>';
                            layer.bindPopup(popupContent);
                        }
                    }

                    // Création de la couche GeoJSON pour les transports
                    transportLayerRef.current = L.geoJSON(data, {
                        style: styleTransport,
                        pointToLayer: function(feature, latlng) {
                            // Pour les points (arrêts par exemple)
                            return L.circleMarker(latlng, styleTransport(feature));
                        },
                        onEachFeature: onEachFeature
                    }).addTo(mapInstance.current);
                })
                .catch(error => console.error('Erreur lors du chargement des données de transport:', error));
        }

        // Nettoyage quand le composant est démonté
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Effet pour gérer l'affichage de la couche de transport
    useEffect(() => {
        if (mapInstance.current && transportLayerRef.current) {
            if (showTransport) {
                transportLayerRef.current.addTo(mapInstance.current);
            } else {
                mapInstance.current.removeLayer(transportLayerRef.current);
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
        
        // Si un itinéraire est déjà affiché, le supprimer
        if (routingControlRef.current) {
            mapInstance.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
        
        setRouteInfo('Recherche en cours...');
        
        // Recherche des coordonnées du point de départ
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startPoint + ', Grenoble')}`)
            .then(response => response.json())
            .then(startData => {
                if (startData.length === 0) {
                    throw new Error('Point de départ non trouvé');
                }
                
                // Recherche des coordonnées du point d'arrivée
                return fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endPoint + ', Grenoble')}`)
                    .then(response => response.json())
                    .then(endData => {
                        if (endData.length === 0) {
                            throw new Error('Point d\'arrivée non trouvé');
                        }
                        
                        // Création de l'itinéraire
                        const startLatLng = L.latLng(startData[0].lat, startData[0].lon);
                        const endLatLng = L.latLng(endData[0].lat, endData[0].lon);
                        
                        routingControlRef.current = L.Routing.control({
                            waypoints: [startLatLng, endLatLng],
                            routeWhileDragging: true,
                            lineOptions: {
                                styles: [{ color: '#6CB1FF', opacity: 0.8, weight: 5 }]
                            },
                            createMarker: function(i, waypoint) {
                                const marker = L.marker(waypoint.latLng);
                                return marker;
                            },
                            show: false // Ne pas afficher le panneau de directions
                        }).addTo(mapInstance.current);
                        
                        setRouteInfo('Itinéraire trouvé !');
                    });
            })
            .catch(error => {
                console.error('Erreur lors de la recherche d\'itinéraire:', error);
                setRouteInfo('Erreur: ' + error.message);
            });
    };

    return (
        <div className="map-container">
            <div className="map" ref={mapRef}></div>
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