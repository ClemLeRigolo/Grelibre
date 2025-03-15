import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom'; 
import { withAuth}  from '../components/auth';
import Loader from '../components/loader';
import { 
    Button, 
    TextInput, 
    Tile, 
    Modal, 
    DatePicker, 
    DatePickerInput, 
    TimePicker, 
    Search, 
    InlineNotification,
    Tag
} from 'carbon-components-react';
import { Add, TrashCan, Edit, Share } from '@carbon/icons-react';
import axios from 'axios';
import mapboxgl from 'mapbox-gl';
import '../styles/sortie.css';
import { getUserData, updateUserData, getAllUsers, updateUserDataById, getUserDataById } from '../utils/firebase';

const SMMAG_API_BASE_URL = 'https://data.mobilites-m.fr/api';

const GRENOBLE_CENTER = [5.724524, 45.188529]; // [longitude, latitude]


const Sortie = (props) => {
    const { user, authState, isLoading } = props;

    const [sorties, setSorties] = useState([]);
    const [isCreatingOuting, setIsCreatingOuting] = useState(false);
    const [selectedSortie, setSelectedSortie] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [userData, setUserData] = useState(null);
    const [departureSearchValue, setDepartureSearchValue] = useState('');
    const [departureSearchResults, setDepartureSearchResults] = useState([]);
    const [isDepartureSearching, setIsDepartureSearching] = useState(false);
    const [travelTimes, setTravelTimes] = useState({});

    const [confirmationModal, setConfirmationModal] = useState({
        open: false,
        sortieId: null,
        status: null,
        departurePoint: '',
        transportMode: 'TRANSIT'
    });


    const [newSortie, setNewSortie] = useState({
        id: '',
        name: '',
        description: '',
        date: new Date(),
        time: '12:00',
        destination: {
            name: '',
            coordinates: []
        },
        participants: [],
        creator: '',
    });

    useEffect(() => {
        const loadData = async () => {
            if (user && !isLoading) {
                console.log('Loading sorties...');
                await loadSorties();
                await loadAllUsers();
            }
        };
        loadData();
    }, [user, isLoading]);

    // Add this effect to calculate travel times
    useEffect(() => {
        const calculateAllTravelTimes = async () => {
            for (const sortie of sorties) {
                await calculateTravelTimes(sortie);
            }
        };
        
        if (sorties.length > 0) {
            calculateAllTravelTimes();
        }
    }, [sorties]);

    const loadSorties = async () => {
        try {
            const userData = await getUserData(user.email);
            setSorties(userData.sorties || []);
            setUserData(userData);
            //On ajoute userData aux participants avec confirmationStatus accepted dans newSortie
            setNewSortie({
                ...newSortie,
                participants: [{ id: userData.id, name: userData.name, email: userData.email, confirmationStatus: 'accepted' }]
            });

        } catch (error) {
            console.error('Error loading sorties:', error);
            setNotification({
                title: 'Error',
                message: 'Failed to load outings. Please try again later.',
                kind: 'error'
            });
        }
    };

    const loadAllUsers = async () => {
        try {
            const users = await getAllUsers();
            console.log(users);
            const usersArray = Object.values(users);
            console.log(usersArray);
            console.log(usersArray[0].email);
            setAllUsers(usersArray.filter(u => u.email !== user.email));
        } catch (error) {
            console.error('Error loading users:', error);
        }
    };

    const calculateTravelTimes = async (sortie) => {
        if (!sortie || !sortie.destination || !sortie.destination.coordinates) {
            return;
        }
        
        // Only calculate for accepted participants with departure points
        const participantsToCalculate = sortie.participants.filter(p => 
            p.confirmationStatus === 'accepted' && p.departurePoint
        );
        
        const newTravelTimes = { ...travelTimes };
        
        for (const participant of participantsToCalculate) {
            try {
                const travelTime = await calculateTravelTime(
                    participant.departurePoint,
                    sortie.destination.coordinates,
                    participant.transportMode || 'TRANSIT'
                );
                
                if (travelTime !== null) {
                    newTravelTimes[`${sortie.id}-${participant.id}`] = travelTime;
                }
            } catch (error) {
                console.error(`Error calculating travel time for participant ${participant.id}:`, error);
            }
        }
        
        setTravelTimes(newTravelTimes);
    };
    
    // Keep the travel time calculation function you already have
    const calculateTravelTime = async (origin, destination, mode) => {
        if (!origin || !destination) {
            console.error('Points de départ ou d\'arrivée manquants');
            return null;
        }
        
        try {
            // Format pour l'API OTP : fromPlace=lat,lon&toPlace=lat,lon
            let startCoords, endCoords;
            
            // Obtenir les coordonnées du point de départ (si c'est déjà des coordonnées, les utiliser directement)
            if (Array.isArray(origin)) {
                startCoords = origin;
            } else {
                startCoords = await geocodePlace(origin);
            }
            
            // Obtenir les coordonnées du point d'arrivée (si c'est déjà des coordonnées, les utiliser directement)
            if (Array.isArray(destination)) {
                endCoords = destination;
            } else {
                endCoords = await geocodePlace(destination);
            }
            
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
                mode: mode || 'TRANSIT',
                numItineraries: 1,
                showIntermediateStops: false,
                arriveBy: false,
                maxWalkDistance: mode.includes('TRANSIT') ? 1000 : 100000,
                walkReluctance: mode.includes('TRANSIT') ? 10 : 2,
                locale: 'fr'
            };
            
            // Appel à l'API SMMAG avec les headers requis
            const response = await axios.get(requestUrl, {
                params: requestParams,
                headers: {
                    'Origin': 'GreLibre',
                    'Accept': 'application/json'
                }
            });
            
            // Traiter la réponse
            if (!response.data || !response.data.plan || !response.data.plan.itineraries || response.data.plan.itineraries.length === 0) {
                throw new Error('Aucun itinéraire trouvé');
            }
            
            // Récupérer le premier itinéraire et retourner sa durée en secondes
            const itinerary = response.data.plan.itineraries[0];
            return itinerary.duration; // Durée en secondes
            
        } catch (error) {
            console.error('Erreur lors du calcul du temps de trajet:', error);
            return null;
        }
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

    const formatCoordinates = (coords) => {
        return `${coords[1]},${coords[0]}`;
    };

    const handleCreateSortie = () => {
        setIsCreatingOuting(true);
        setNewSortie({
            ...newSortie,
            id: `sortie_${Date.now()}`,
            creator: userData.id
        });
        setModalOpen(true);
    };

    const openConfirmationModal = (sortieId, status) => {
        setConfirmationModal({
            open: true,
            sortieId: sortieId,
            status: status,
            departurePoint: '',
            transportMode: 'TRANSIT,WALK'
        });
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setIsCreatingOuting(false);
        setSelectedSortie(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewSortie({
            ...newSortie,
            [name]: value
        });
    };

    const handleDateChange = (dates) => {
        const [date] = dates;
        setNewSortie({
            ...newSortie,
            date
        });
    };

    const handleTimeChange = (e) => {
        setNewSortie({
            ...newSortie,
            time: e.target.value
        });
    };

    const handleSearchDestination = async (e) => {
        const value = e.target.value;
        setSearchValue(value);
        
        // Update the destination name even as user types
        setNewSortie({
            ...newSortie,
            destination: {
                ...newSortie.destination,
                name: value
            }
        });
        
        // Only search if we have enough characters
        if (value.length < 3) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        
        try {
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json`,
                {
                    params: {
                        access_token: mapboxgl.accessToken,
                        proximity: '5.724524,45.188529', // Grenoble center coordinates
                        bbox: '5.6,45.1,5.9,45.3', // Bounding box for Grenoble area [minLon,minLat,maxLon,maxLat]
                        limit: 5,
                        country: 'fr',
                        types: 'address,place,poi',
                        language: 'fr' // Return results in French
                    }
                }
            );
            
            if (response.data.features && response.data.features.length > 0) {
                setSearchResults(response.data.features);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching for locations:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const selectDestination = (result) => {
        setNewSortie({
            ...newSortie,
            destination: {
                name: result.place_name,
                coordinates: result.center
            }
        });
        setSearchValue(result.place_name);
        setSearchResults([]);
    };

    // Updated handleAddParticipant function
    const handleAddParticipant = (userId) => {
        const userToAdd = allUsers.find(u => u.id === userId);
        if (userToAdd && !newSortie.participants.some(p => p.id === userId)) {
            setNewSortie({
                ...newSortie,
                participants: [
                    ...newSortie.participants, 
                    {
                        ...userToAdd,
                        confirmationStatus: 'pending',
                        departurePoint: '' // Initialize with empty departure point
                    }
                ]
            });
        }
    };

    const handleRemoveParticipant = (userId) => {
        setNewSortie({
            ...newSortie,
            participants: newSortie.participants.filter(p => p.id !== userId),
            estimatedArrivals: Object.fromEntries(
                Object.entries(newSortie.estimatedArrivals).filter(([id]) => id !== userId)
            )
        });
    };

    // Function to search for departure points
    const handleDepartureSearch = async (value, updateFunction) => {
        setDepartureSearchValue(value);
        updateFunction(value);
        
        if (value.length < 3) {
            setDepartureSearchResults([]);
            return;
        }
        
        setIsDepartureSearching(true);
        
        try {
            const response = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json`,
                {
                    params: {
                        access_token: mapboxgl.accessToken,
                        proximity: '5.724524,45.188529', // Grenoble center coordinates
                        bbox: '5.6,45.1,5.9,45.3', // Bounding box for Grenoble area [minLon,minLat,maxLon,maxLat]
                        limit: 5,
                        country: 'fr',
                        types: 'address,place,poi',
                        language: 'fr' // Return results in French
                    }
                }
            );
            
            if (response.data.features && response.data.features.length > 0) {
                setDepartureSearchResults(response.data.features);
            } else {
                setDepartureSearchResults([]);
            }
        } catch (error) {
            console.error('Error searching for locations:', error);
            setDepartureSearchResults([]);
        } finally {
            setIsDepartureSearching(false);
        }
    };

    // Function to select a departure point from results
    const selectDeparturePoint = (result, updateFunction) => {
        updateFunction(result.place_name);
        setDepartureSearchResults([]);
    };

    const handleSaveSortie = async () => {
        try {
            if (!newSortie.name || !newSortie.date || !newSortie.destination.name) {
                setNotification({
                    title: 'Missing information',
                    message: 'Please fill in all required fields.',
                    kind: 'error'
                });
                return;
            }
    
            // Create a date object from the date and time inputs
            const dateStr = newSortie.date instanceof Date 
                ? newSortie.date.toISOString().split('T')[0] 
                : newSortie.date;
            
            // Create JavaScript Date object
            const dateTimeObj = new Date(`${dateStr}T${newSortie.time}`);
            
            // Create timestamp (milliseconds since epoch)
            const timestamp = dateTimeObj.getTime();
    
            // Prepare participants array with creator
            let participants = [...newSortie.participants];
        
            // See if creator is already in participants
            const creatorIndex = participants.findIndex(p => p.id === user.uid);
            
            if (creatorIndex >= 0) {
                // Update creator's data
                participants[creatorIndex] = {
                    ...participants[creatorIndex],
                    confirmationStatus: 'accepted',
                    departurePoint: newSortie.creatorDeparturePoint || '',
                    transportMode: newSortie.creatorTransportMode || 'TRANSIT'
                };
            } else {
                // Add creator to participants
                participants.push({
                    id: user.uid,
                    name: user.displayName || user.name || user.email,
                    email: user.email,
                    confirmationStatus: 'accepted',
                    departurePoint: newSortie.creatorDeparturePoint || '',
                    transportMode: newSortie.creatorTransportMode || 'TRANSIT'
                });
            }

            const finalSortie = {
                ...newSortie,
                date: dateStr,                // Store the date as string (YYYY-MM-DD)
                dateTime: timestamp,          // Store as timestamp for easy comparison
                dateTimeFormatted: dateTimeObj.toLocaleString(), // Human-readable format
                createdAt: Date.now(),        // Current timestamp
                creator: user.uid,            // Ensure creator is set
                participants: participants
            };
    
            // Update current user's sorties
            let updatedSorties;
            if (isCreatingOuting) {
                updatedSorties = [...sorties, finalSortie];
            } else {
                updatedSorties = sorties.map(s => 
                    s.id === finalSortie.id ? finalSortie : s
                );
            }

            console.log('Updated sorties:', updatedSorties);
    
            // Update the user data
            await updateUserData(
                undefined, 
                undefined, 
                undefined, 
                undefined, 
                { sortie: updatedSorties }
            );
            
            // Update local state
            setSorties(updatedSorties);
            
            // Update each participant's data
            const updatePromises = finalSortie.participants.map(async (participant) => {
                console.log('Updating participant:', participant.id, user.uid);
                if (participant.id === user.uid) {
                    console.log('Skipping current user:', participant.id);
                    return;
                }
                try {
                    // Get the participant's data
                    const participantData = await getUserDataById(participant.id);
                    if (!participantData) return;
                    
                    const participantSorties = participantData.sortie || [];
                    
                    // Check if this sortie already exists in their data
                    const existingSortieIndex = participantSorties.findIndex(s => s.id === finalSortie.id);
                    
                    let updatedParticipantSorties;
                    if (existingSortieIndex >= 0) {
                        // Update the existing sortie while preserving their confirmation status
                        updatedParticipantSorties = [...participantSorties];
                        
                        // Keep their existing confirmation status
                        const existingStatus = updatedParticipantSorties[existingSortieIndex].participants
                            .find(p => p.id === participant.id)?.confirmationStatus || 'pending';
                        
                        // Create a new sortie object with the updated data
                        const updatedSortie = {
                            ...finalSortie,
                            participants: finalSortie.participants.map(p => 
                                p.id === participant.id 
                                    ? { ...p, confirmationStatus: existingStatus }
                                    : p
                            )
                        };
                        
                        updatedParticipantSorties[existingSortieIndex] = updatedSortie;
                    } else {
                        // Add the new sortie with pending status
                        // Add the new sortie with pending status for this participant, but preserve creator's accepted status
                        updatedParticipantSorties = [...participantSorties, {
                            ...finalSortie,
                            participants: finalSortie.participants.map(p => 
                                p.id === participant.id 
                                    ? { ...p, confirmationStatus: 'pending' }
                                    : p.id === finalSortie.creator  // Vérifier si c'est le créateur
                                        ? { ...p, confirmationStatus: 'accepted' }  // Maintenir le statut 'accepted' pour le créateur
                                        : p
                            )
                        }];
                    }
                    
                    // Update the participant's data
                    console.log('Updating participant data:', participant.id, updatedParticipantSorties);
                    await updateUserDataById(
                        participant.id,
                        undefined,
                        undefined, 
                        undefined,
                        undefined,
                        { sortie: updatedParticipantSorties }
                    );
                    
                    return true;
                } catch (error) {
                    console.error(`Error updating sortie for participant ${participant.id}:`, error);
                    return false;
                }
            });
            
            // Wait for all participant updates to complete
            await Promise.all(updatePromises);
    
            setNotification({
                title: 'Success',
                message: `Outing successfully ${isCreatingOuting ? 'created' : 'updated'}.`,
                kind: 'success'
            });
    
            handleCloseModal();
        } catch (error) {
            console.error('Error saving sortie:', error);
            setNotification({
                title: 'Error',
                message: 'Failed to save the outing. Please try again.',
                kind: 'error'
            });
        }
    };

    const handleDeleteSortie = async (sortieId) => {
        if (window.confirm('Are you sure you want to delete this outing?')) {
            try {
                const updatedSorties = sorties.filter(s => s.id !== sortieId);
                await updateUserData(undefined, undefined, undefined, { sorties: updatedSorties });
                setSorties(updatedSorties);
                
                setNotification({
                    title: 'Success',
                    message: 'Outing successfully deleted.',
                    kind: 'success'
                });
            } catch (error) {
                console.error('Error deleting sortie:', error);
                setNotification({
                    title: 'Error',
                    message: 'Failed to delete the outing. Please try again.',
                    kind: 'error'
                });
            }
        }
    };

    const handleEditSortie = (sortie) => {
        setSelectedSortie(sortie);
        
        // Convert timestamp back to Date object if needed
        let dateObj;
        if (typeof sortie.dateTime === 'number') {
            dateObj = new Date(sortie.dateTime);
        } else if (sortie.date) {
            // Fall back to the date string if available
            dateObj = new Date(sortie.date);
        } else {
            dateObj = new Date();
        }
        
        // Format the time as "HH:MM" for the time input
        const timeString = dateObj.toTimeString().slice(0, 5);
        
        setNewSortie({
            ...sortie,
            date: dateObj,
            time: timeString
        });
        
        setIsCreatingOuting(false);
        setModalOpen(true);
    };

    const handleShareSortie = (sortie) => {
        const shareUrl = `${window.location.origin}/sorties/${sortie.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: sortie.name,
                text: `Join me for "${sortie.name}" on ${new Date(sortie.dateTime).toLocaleDateString()}`,
                url: shareUrl
            }).catch(err => {
                console.error('Share failed:', err);
                copyToClipboard(shareUrl);
            });
        } else {
            copyToClipboard(shareUrl);
        }
    };

    // Update the confirmation handler
    const handleConfirmWithDetails = async () => {
        try {
            const { sortieId, status, departurePoint, transportMode } = confirmationModal;
            
            // Find the sortie
            const sortieIndex = sorties.findIndex(s => s.id === sortieId);
            if (sortieIndex === -1) {
                throw new Error('Sortie not found');
            }
            
            const sortie = sorties[sortieIndex];
            
            // Update participant details
            const updatedParticipants = sortie.participants.map(p => 
                p.id === user.uid 
                    ? { 
                        ...p, 
                        confirmationStatus: status,
                        departurePoint: status === 'accepted' ? departurePoint : p.departurePoint,
                        transportMode: status === 'accepted' ? transportMode : p.transportMode
                    } 
                    : p
            );
            
            const updatedSortie = {
                ...sortie,
                participants: updatedParticipants
            };
            
            // Update in local state
            const updatedSorties = [...sorties];
            updatedSorties[sortieIndex] = updatedSortie;
            setSorties(updatedSorties);
            
            // Update in user data
            await updateUserData(
                undefined,
                undefined,
                undefined,
                undefined,
                { sortie: updatedSorties }
            );
            
            // Mettre à jour les données du créateur de la sortie
            const creatorId = sortie.creator;
            if (creatorId && creatorId !== user.uid) {
                const creatorData = await getUserDataById(creatorId);
                if (creatorData && creatorData.sorties) {
                    const creatorSorties = [...creatorData.sorties];
                    const creatorSortieIndex = creatorSorties.findIndex(s => s.id === sortieId);
                    
                    if (creatorSortieIndex !== -1) {
                        // Mettre à jour la sortie dans les données du créateur
                        creatorSorties[creatorSortieIndex] = {
                            ...creatorSorties[creatorSortieIndex],
                            participants: updatedParticipants
                        };
                        
                        // Enregistrer les modifications
                        await updateUserDataById(
                            creatorId,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            { sortie: creatorSorties }
                        );
                    }
                }
            }
            
            // Mettre à jour les données de tous les autres participants
            const otherParticipants = sortie.participants
                .filter(p => p.id !== user.id && p.id !== creatorId)
                .map(p => p.id);
                
            const updatePromises = otherParticipants.map(async (participantId) => {
                try {
                    const participantData = await getUserDataById(participantId);
                    if (participantData && participantData.sortie) {
                        const participantSorties = [...participantData.sortie];
                        const participantSortieIndex = participantSorties.findIndex(s => s.id === sortieId);
                        
                        if (participantSortieIndex !== -1) {
                            // Mettre à jour la sortie dans les données du participant
                            participantSorties[participantSortieIndex] = {
                                ...participantSorties[participantSortieIndex],
                                participants: updatedParticipants
                            };
                            
                            // Enregistrer les modifications
                            await updateUserDataById(
                                participantId,
                                undefined,
                                undefined,
                                undefined,
                                undefined,
                                { sortie: participantSorties }
                            );
                        }
                    }
                    return true;
                } catch (error) {
                    console.error(`Erreur lors de la mise à jour des données pour le participant ${participantId}:`, error);
                    return false;
                }
            });
            
            // Attendre que toutes les mises à jour soient terminées
            await Promise.all(updatePromises);
            
            setNotification({
                title: 'Succès',
                message: status === 'accepted' 
                    ? 'Vous avez accepté l\'invitation avec succès.' 
                    : 'Vous avez décliné l\'invitation.',
                kind: 'success'
            });
            
            setConfirmationModal({ open: false, sortieId: null, status: null, departurePoint: '', transportMode: 'TRANSIT' });
            
        } catch (error) {
            console.error('Error updating confirmation status:', error);
            setNotification({
                title: 'Error',
                message: 'Failed to update your confirmation status. Please try again.',
                kind: 'error'
            });
        }
    };

    // Add this function to your component
    const handleConfirmationChange = async (sortieId, status) => {
        try {
            // Find the sortie
            const sortie = sorties.find(s => s.id === sortieId);
            if (!sortie) {
                throw new Error('Sortie not found');
            }
            
            // Update the user's confirmation status in this sortie
            const updatedSortie = {
                ...sortie,
                participants: sortie.participants.map(p => 
                    p.id === user.id 
                        ? { ...p, confirmationStatus: status }
                        : p
                )
            };
            
            // Update the sorties array
            const updatedSorties = sorties.map(s => 
                s.id === sortieId ? updatedSortie : s
            );
            
            // Save changes to the current user's data
            await updateUserData(
                undefined, 
                undefined, 
                undefined, 
                undefined, 
                { sortie: updatedSorties }
            );
            
            // Also update the creator's sortie data and all other participants
            const creatorId = sortie.creator;
            if (creatorId !== user.id) {
                // Get creator's data
                const creatorData = await getUserDataById(creatorId);
                if (creatorData) {
                    const creatorSorties = creatorData.sortie || [];
                    const updatedCreatorSorties = creatorSorties.map(s => 
                        s.id === sortieId 
                            ? {
                                ...s,
                                participants: s.participants.map(p => 
                                    p.id === user.id 
                                        ? { ...p, confirmationStatus: status }
                                        : p
                                )
                            } 
                            : s
                    );
                    
                    // Update creator's data
                    await updateUserData(
                        creatorId,
                        undefined,
                        undefined, 
                        undefined,
                        { sortie: updatedCreatorSorties }
                    );
                }
            }
            
            // Update all other participants
            const otherParticipants = sortie.participants
                .filter(p => p.id !== user.id && p.id !== creatorId)
                .map(p => p.id);
            
            const updatePromises = otherParticipants.map(async (participantId) => {
                try {
                    const participantData = await getUserDataById(participantId);
                    if (!participantData) return;
                    
                    const participantSorties = participantData.sortie || [];
                    const updatedParticipantSorties = participantSorties.map(s => 
                        s.id === sortieId 
                            ? {
                                ...s,
                                participants: s.participants.map(p => 
                                    p.id === user.id 
                                        ? { ...p, confirmationStatus: status }
                                        : p
                                )
                            } 
                            : s
                    );
                    
                    await updateUserData(
                        participantId,
                        undefined,
                        undefined, 
                        undefined,
                        { sortie: updatedParticipantSorties }
                    );
                    
                    return true;
                } catch (error) {
                    console.error(`Error updating participant ${participantId}:`, error);
                    return false;
                }
            });
            
            await Promise.all(updatePromises);
            
            // Update local state
            setSorties(updatedSorties);
            
            setNotification({
                title: 'Success',
                message: `You have ${status === 'accepted' ? 'accepted' : 'declined'} the invitation.`,
                kind: 'success'
            });
        } catch (error) {
            console.error('Error updating confirmation status:', error);
            setNotification({
                title: 'Error',
                message: 'Failed to update your response. Please try again.',
                kind: 'error'
            });
        }
    };

    // Helper functions for confirmation status display
    const getConfirmationTagType = (status) => {
        switch (status) {
            case 'accepted': return 'green';
            case 'declined': return 'red';
            case 'pending':
            default: return 'gray';
        }
    };

    const getConfirmationLabel = (status) => {
        switch (status) {
            case 'accepted': return 'Accepté';
            case 'declined': return 'Décliné';
            case 'pending':
            default: return 'En attente';
        }
    };

    const getTransportModeLabel = (mode) => {
        switch (mode) {
            case 'TRANSIT,WALK': return 'Transports en commun';
            case 'WALK': return 'Marche';
            case 'BYCICLE': return 'Vélo';
            case 'TRANSIT,BICYCLE': return 'Transports en commun + vélo';
            default: return 'Transports en commun';
        }
    };

    const formatTravelTime = (time) => {
        if (time === null) {
            return 'Calculating...';
        }

        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;

        return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}min ` : ''}${seconds}s`;
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setNotification({
                    title: 'Link copied',
                    message: 'Share link has been copied to clipboard.',
                    kind: 'info'
                });
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                setNotification({
                    title: 'Error',
                    message: 'Failed to copy link. Please try again.',
                    kind: 'error'
                });
            });
    };

    if (isLoading) {
        return <Loader />;
    }

    return (
        <div className="sortie-container mobile-nav-padding">
            <h1>Mes Sorties</h1>
            
            {notification && (
                <InlineNotification
                    kind={notification.kind}
                    title={notification.title}
                    subtitle={notification.message}
                    onCloseButtonClick={() => setNotification(null)}
                    className="notification-message"
                />
            )}
            
            <Button 
                renderIcon={Add}
                onClick={handleCreateSortie}
                className="create-sortie-button"
            >
                Créer une sortie
            </Button>
            
            <div className="sorties-list">
                {sorties.length === 0 ? (
                    <p className="no-sorties-message">Vous n'avez pas encore de sorties. Créez votre première sortie en cliquant sur le bouton ci-dessus.</p>
                ) : (
                    sorties.map(sortie => {
                        // Check if the current user is a participant and get their status
                        const currentUserParticipant = sortie.participants.find(p => p.id === user.uid);
                        const isCreator = sortie.creator === user.id;
                        console.log('currentUserParticipant', currentUserParticipant);
                        const confirmationStatus = currentUserParticipant?.confirmationStatus || 'pending';
                        
                        return (
                            <Tile key={sortie.id} className={`sortie-tile ${confirmationStatus}`}>
                                <div className="sortie-header">
                                    <h3>{sortie.name}</h3>
                                    <div className="sortie-actions">
                                        {!isCreator && (
                                            <div className="confirmation-buttons">
                                                {confirmationStatus === 'pending' ? (
                                                    <>
                                                        <Button 
                                                            kind="primary" 
                                                            size="sm"
                                                            onClick={() => openConfirmationModal(sortie.id, 'accepted')}
                                                        >
                                                            Accepter
                                                        </Button>
                                                        <Button 
                                                            kind="danger" 
                                                            size="sm"
                                                            onClick={() => handleConfirmationChange(sortie.id, 'declined')}
                                                        >
                                                            Décliner
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Tag type={confirmationStatus === 'accepted' ? 'green' : 'red'}>
                                                        {confirmationStatus === 'accepted' ? 'Accepté' : 'Décliné'}
                                                    </Tag>
                                                )}
                                            </div>
                                        )}
                                        <Button 
                                            kind="ghost" 
                                            renderIcon={Share} 
                                            iconDescription="Partager" 
                                            onClick={() => handleShareSortie(sortie)}
                                        />
                                        {isCreator && (
                                            <>
                                                <Button 
                                                    kind="ghost" 
                                                    renderIcon={Edit} 
                                                    iconDescription="Modifier" 
                                                    onClick={() => handleEditSortie(sortie)}
                                                />
                                                <Button 
                                                    kind="ghost" 
                                                    renderIcon={TrashCan} 
                                                    iconDescription="Supprimer" 
                                                    onClick={() => handleDeleteSortie(sortie.id)}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="sortie-details">
                                    <p><strong>Date:</strong> {new Date(sortie.dateTime).toLocaleDateString()}</p>
                                    <p><strong>Heure:</strong> {new Date(sortie.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    <p><strong>Destination:</strong> {sortie.destination.name}</p>
                                    {sortie.description && <p><strong>Description:</strong> {sortie.description}</p>}
                                    
                                    <div className="sortie-participants">
                                        <h4>Participants ({sortie.participants.length}):</h4>
                                        {sortie.participants.length === 0 ? (
                                            <p>Aucun participant</p>
                                        ) : (
                                            <div className="participants-list">
                                                {sortie.participants.map(participant => {
                                                    const status = participant.confirmationStatus || 'pending';
                                                    const travelTimeKey = `${sortie.id}-${participant.id}`;
                                                    const travelTime = travelTimes[travelTimeKey];
                                                    
                                                    return (
                                                        <div 
                                                            key={participant.id} 
                                                            className={`participant status-${status}`}
                                                        >
                                                            <div className="participant-info">
                                                                <span className="participant-name">
                                                                    {participant.displayName || participant.name || participant.email}
                                                                    {participant.id === sortie.creator && ' (Créateur)'}
                                                                </span>
                                                                <Tag type={getConfirmationTagType(status)}>
                                                                    {getConfirmationLabel(status)}
                                                                </Tag>
                                                            </div>
                                                            
                                                            {status === 'accepted' && (
                                                                <div className="travel-details">
                                                                    {participant.departurePoint && (
                                                                        <span className="departure-point">
                                                                            <strong>Départ:</strong> {participant.departurePoint}
                                                                        </span>
                                                                    )}
                                                                    
                                                                    {participant.transportMode && (
                                                                        <span className="transport-mode">
                                                                            <strong>Transport:</strong> {getTransportModeLabel(participant.transportMode)}
                                                                        </span>
                                                                    )}
                                                                    
                                                                    {travelTime ? (
                                                                        <span className="arrival-time">
                                                                            <strong>Temps de trajet estimé:</strong> {formatTravelTime(travelTime)}
                                                                        </span>
                                                                    ) : participant.departurePoint ? (
                                                                        <span className="arrival-time loading">
                                                                            <Loader />
                                                                            Calcul en cours...
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Tile>
                        );
                    })
                )}
            </div>
            
            <Modal
                open={modalOpen}
                onRequestClose={handleCloseModal}
                modalHeading={isCreatingOuting ? "Créer une nouvelle sortie" : "Modifier la sortie"}
                primaryButtonText="Enregistrer"
                secondaryButtonText="Annuler"
                onRequestSubmit={handleSaveSortie}
                onSecondarySubmit={handleCloseModal}
                size="lg"
            >
                <div className="sortie-form">
                    <TextInput
                        id="sortie-name"
                        labelText="Nom de la sortie"
                        placeholder="Ex: Sortie au parc"
                        name="name"
                        value={newSortie.name}
                        onChange={handleInputChange}
                        required
                    />
                    
                    <TextInput
                        id="sortie-description"
                        labelText="Description (optionnelle)"
                        placeholder="Ex: Sortie pour se détendre"
                        name="description"
                        value={newSortie.description}
                        onChange={handleInputChange}
                    />
                    
                    <div className="date-time-container">
                        <DatePicker datePickerType="single" dateFormat="d/m/Y" onChange={handleDateChange}>
                            <DatePickerInput
                                id="sortie-date"
                                placeholder="jj/mm/aaaa"
                                labelText="Date"
                                size="md"
                                value={newSortie.date ? new Date(newSortie.date).toLocaleDateString() : ""}
                                required
                            />
                        </DatePicker>
                        
                        <TimePicker
                            id="sortie-time"
                            labelText="Heure"
                            value={newSortie.time}
                            onChange={handleTimeChange}
                            required
                        />
                    </div>
                    
                    {isCreatingOuting && (
                        <div className="destination-search">
                        <div className="search-input-container">
                            <TextInput
                                id="sortie-destination"
                                labelText="Destination"
                                placeholder="Recherchez une adresse"
                                value={searchValue}
                                onChange={handleSearchDestination}
                                required
                            />
                            {isSearching && (
                                <div className="search-loading-indicator">
                                    <Loader />
                                </div>
                            )}
                        </div>
                        
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map(result => (
                                    <div 
                                        key={result.id} 
                                        className="search-result-item"
                                        onClick={() => selectDestination(result)}
                                    >
                                        <p>
                                            <strong>{result.text}</strong>
                                            <span className="address-details">{result.place_name.replace(result.text + ', ', '')}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                    
                    <div className="participants-section">
                        <h4>Participants</h4>
                        <div className="add-participant">
                            <p>Ajoutez des participants à votre sortie:</p>
                            <div className="user-selection">
                                {allUsers.map(user => (
                                    <div key={user.uid} className="user-option">
                                        <span>{user.tag} ({user.name} {user.surname})</span>
                                        <Button
                                            kind="ghost"
                                            size="sm"
                                            onClick={() => handleAddParticipant(user.id)}
                                            disabled={newSortie.participants.some(p => p.id === user.id)}
                                        >
                                            {newSortie.participants.some(p => p.id === user.id) ? 'Ajouté' : 'Ajouter'}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {newSortie.participants.length > 0 && (
                            <div className="selected-participants">
                                <h5>Participants ajoutés:</h5>
                                {newSortie.participants.map(participant => (
                                    <Tag 
                                        key={participant.id} 
                                        filter
                                        onClose={() => handleRemoveParticipant(participant.id)}
                                    >
                                        {participant.tag} ({participant.name} {participant.surname})
                                    </Tag>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="creator-travel-details">
                        <h4>Vos détails de trajet</h4>
                        
                        <div className="departure-search">
                            <TextInput
                                id="creator-departure-point"
                                labelText="Point de départ"
                                placeholder="Ex: Votre adresse, un lieu connu, etc."
                                value={newSortie.creatorDeparturePoint || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    handleDepartureSearch(value, (val) => 
                                        setNewSortie({
                                            ...newSortie,
                                            creatorDeparturePoint: val
                                        })
                                    );
                                }}
                            />
                            
                            {isDepartureSearching && (
                                <div className="search-loading-indicator">
                                    <Loader />
                                </div>
                            )}
                            
                            {departureSearchResults.length > 0 && (
                                <div className="search-results">
                                    {departureSearchResults.map(result => (
                                        <div 
                                            key={result.id} 
                                            className="search-result-item"
                                            onClick={() => selectDeparturePoint(result, (val) => 
                                                setNewSortie({
                                                    ...newSortie,
                                                    creatorDeparturePoint: val
                                                })
                                            )}
                                        >
                                            <p>
                                                <strong>{result.text}</strong>
                                                <span className="address-details">{result.place_name.replace(result.text + ', ', '')}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="transport-mode-selector">
                            <fieldset className="transport-options">
                                <legend>Mode de transport</legend>
                                <div className="transport-options-container">
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="creator-transport" 
                                            value="TRANSIT" 
                                            checked={newSortie.creatorTransportMode === 'TRANSIT'} 
                                            onChange={() => setNewSortie({...newSortie, creatorTransportMode: 'TRANSIT'})}
                                        />
                                        Transport en commun
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="creator-transport" 
                                            value="DRIVING" 
                                            checked={newSortie.creatorTransportMode === 'DRIVING'} 
                                            onChange={() => setNewSortie({...newSortie, creatorTransportMode: 'DRIVING'})}
                                        />
                                        Voiture
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="creator-transport" 
                                            value="WALKING" 
                                            checked={newSortie.creatorTransportMode === 'WALKING'} 
                                            onChange={() => setNewSortie({...newSortie, creatorTransportMode: 'WALKING'})}
                                        />
                                        À pied
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="creator-transport" 
                                            value="BICYCLING" 
                                            checked={newSortie.creatorTransportMode === 'BICYCLING'} 
                                            onChange={() => setNewSortie({...newSortie, creatorTransportMode: 'BICYCLING'})}
                                        />
                                        Vélo
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                </div>
            </Modal>
            <Modal
                open={confirmationModal.open}
                onRequestClose={() => setConfirmationModal({ ...confirmationModal, open: false })}
                modalHeading={confirmationModal.status === 'accepted' ? "Accepter l'invitation" : "Décliner l'invitation"}
                primaryButtonText="Confirmer"
                secondaryButtonText="Annuler"
                onRequestSubmit={handleConfirmWithDetails}
                onSecondarySubmit={() => setConfirmationModal({ ...confirmationModal, open: false })}
            >
                {confirmationModal.status === 'accepted' && (
                    <div className="confirmation-details">
                        <div className="departure-search">
                            <TextInput
                                id="confirmation-departure-point"
                                labelText="Votre point de départ"
                                placeholder="Ex: Votre adresse, un lieu connu, etc."
                                value={confirmationModal.departurePoint}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    handleDepartureSearch(value, (val) => 
                                        setConfirmationModal({
                                            ...confirmationModal,
                                            departurePoint: val
                                        })
                                    );
                                }}
                                required
                            />
                            
                            {isDepartureSearching && (
                                <div className="search-loading-indicator">
                                    <Loader />
                                </div>
                            )}
                            
                            {departureSearchResults.length > 0 && (
                                <div className="search-results">
                                    {departureSearchResults.map(result => (
                                        <div 
                                            key={result.id} 
                                            className="search-result-item"
                                            onClick={() => selectDeparturePoint(result, (val) => 
                                                setConfirmationModal({
                                                    ...confirmationModal,
                                                    departurePoint: val
                                                })
                                            )}
                                        >
                                            <p>
                                                <strong>{result.text}</strong>
                                                <span className="address-details">{result.place_name.replace(result.text + ', ', '')}</span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="transport-mode-selector">
                            <fieldset className="transport-options">
                                <legend>Mode de transport</legend>
                                <div className="transport-options-container">
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="participant-transport" 
                                            value="TRANSIT" 
                                            checked={confirmationModal.transportMode === 'TRANSIT'} 
                                            onChange={() => setConfirmationModal({...confirmationModal, transportMode: 'TRANSIT'})}
                                        />
                                        Transport en commun
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="participant-transport" 
                                            value="DRIVING" 
                                            checked={confirmationModal.transportMode === 'DRIVING'} 
                                            onChange={() => setConfirmationModal({...confirmationModal, transportMode: 'DRIVING'})}
                                        />
                                        Voiture
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="participant-transport" 
                                            value="WALKING" 
                                            checked={confirmationModal.transportMode === 'WALKING'} 
                                            onChange={() => setConfirmationModal({...confirmationModal, transportMode: 'WALKING'})}
                                        />
                                        À pied
                                    </label>
                                    <label>
                                        <input 
                                            type="radio" 
                                            name="participant-transport" 
                                            value="BICYCLING" 
                                            checked={confirmationModal.transportMode === 'BICYCLING'} 
                                            onChange={() => setConfirmationModal({...confirmationModal, transportMode: 'BICYCLING'})}
                                        />
                                        Vélo
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                        
                        <p className="confirmation-note">
                            Ces informations nous permettront d'estimer votre heure d'arrivée à la destination.
                        </p>
                    </div>
                )}
                
                {confirmationModal.status === 'declined' && (
                    <p>Êtes-vous sûr de vouloir décliner cette invitation ?</p>
                )}
            </Modal>
        </div>
    );
};

export default withAuth(Sortie);
