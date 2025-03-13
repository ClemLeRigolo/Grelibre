import React from 'react';
import { Link } from 'react-router-dom';

function Terms() {
    return (
        <div className="content">
            <h1>Conditions d'utilisation</h1>
            <p>Bienvenue sur Easy-NP, le réseau social inter-écoles Grenoble INP !</p>
            <p>En utilisant notre plateforme, vous acceptez les conditions d'utilisation suivantes :</p>
            <ol>
                <li>Respectez les autres utilisateurs et ne publiez pas de contenu offensant ou illégal.</li>
                <li>Ne partagez pas d'informations personnelles sensibles.</li>
                <li>Utilisez le réseau social de manière responsable et ne perturbez pas son bon fonctionnement.</li>
                <li>Respectez la vie privée des autres utilisateurs et ne publiez pas de contenu sans leur consentement.</li>
                <li>Ne publiez pas de contenu protégé par des droits d'auteur sans autorisation.</li>
            </ol>
            <p>En cas de non-respect de ces conditions, nous nous réservons le droit de suspendre ou de supprimer votre compte.</p>
            <p>Si vous avez des questions ou des préoccupations concernant nos conditions d'utilisation, veuillez nous contacter à l'adresse suivante : contact@easy-np.fr</p>
            <Link to="/signup">
                <button type="button" className="aknowledge-button">Compris</button>
            </Link>
        </div>
    );
}

export default Terms;