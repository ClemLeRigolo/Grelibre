# Grelibre

L'objectif de ce projet, réalisé dans le cadre d'un hackathon, était de développer une application similaire à Google Maps.

## Fonctionnalités principales

- Recherche d'itinéraire avec Leaflet et Leaflet Routing Machine.
- Interface utilisateur réactive avec React.
- Hébergement Firebase pour le déploiement.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants :

- [Node.js](https://nodejs.org/en/download/) (inclut npm)
- Un gestionnaire de version Git ([télécharger ici](https://git-scm.com/))

## Installation

Pour installer le projet, suivez les étapes ci-dessous :

1. Clonez le dépôt Git :

    ```bash
    git clone git@github.com:ClemLeRigolo/Grelibre.git
    cd Grelibre
    ```

2. Installez les dépendances nécessaires :

    ```bash
    npm install
    ```

## Structure du projet

Voici un aperçu de la structure du projet :

```
.babelrc
.firebase/
.firebaserc
.gitignore
.sassrc.js
build/
public/
src/
```

- **`public/`** : Contient les fichiers statiques comme `index.html` et les ressources publiques.
- **`src/`** : Contient le code source principal, y compris les composants React, les styles, et les utilitaires.
- **`build/`** : Contient les fichiers générés après la construction du projet.

## Lancement

Pour démarrer le projet en mode développement, exécutez la commande suivante :

```bash
npm start
```

Le site sera accessible à l'adresse suivante : [http://localhost:8080/](http://localhost:8080/)

## Déploiement

Le projet est configuré pour être déployé sur Firebase Hosting. Pour déployer, suivez ces étapes :

1. Assurez-vous d'avoir configuré Firebase CLI et d'être connecté à votre compte Firebase :

    ```bash
    npm install -g firebase-tools
    firebase login
    ```

2. Déployez le projet :

    ```bash
    firebase deploy
    ```

## Développement

### Points importants

- Le fichier `src/index.html` contient les scripts nécessaires pour intégrer Leaflet et Leaflet Routing Machine.
- Le fichier `public/index.html` est utilisé comme modèle pour React et sera remplacé lors de la construction.

### Scripts disponibles

- **`npm start`** : Démarre le projet en mode développement.
- **`npm run build`** : Génère une version optimisée pour la production.
- **`npm test`** : Lance les tests unitaires.

## Technologies utilisées

- **React** : Framework JavaScript pour construire l'interface utilisateur.
- **Leaflet** : Bibliothèque JavaScript pour les cartes interactives.
- **Firebase Hosting** : Plateforme pour héberger et déployer l'application.
