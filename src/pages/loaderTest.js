import React, { useState, useEffect } from 'react';
import Loader from "../components/loader";
import { Button, Tile, Toggle } from "carbon-components-react";
import { ProgressBarRound } from '@carbon/icons-react';

import "../styles/loaderTest.css";

const LoaderTest = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [customMessage, setCustomMessage] = useState("");
    const [showInlineSample, setShowInlineSample] = useState(false);
    const [showMultiple, setShowMultiple] = useState(false);
    const [timers, setTimers] = useState({
        timer1: 3,
        timer2: 5,
        timer3: 7
    });

    // Simulation d'un chargement automatique
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setIsLoading(false);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Décrémentation des compteurs pour les exemples multiples
    useEffect(() => {
        if (showMultiple) {
            const interval = setInterval(() => {
                setTimers(prev => {
                    const newTimers = {...prev};
                    for (const key in newTimers) {
                        if (newTimers[key] > 0) {
                            newTimers[key] -= 1;
                        }
                    }
                    return newTimers;
                });
            }, 1000);
            
            return () => clearInterval(interval);
        } else {
            // Réinitialiser les compteurs si on désactive l'affichage
            setTimers({
                timer1: 3,
                timer2: 5,
                timer3: 7
            });
        }
    }, [showMultiple]);

    const handleCustomLoading = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
        }, 2000);
    };

    const getCustomMessage = () => {
        return customMessage || "Chargement...";
    };

    return (
        <div className="loader-test-container">
            <h1>Test du composant Loader</h1>
            
            <section className="loader-test-section">
                <h2>Loader standard</h2>
                <Tile className="loader-test-tile">
                    {isLoading ? (
                        <div className="loader-test-demo">
                            <Loader description={getCustomMessage()} />
                        </div>
                    ) : (
                        <div className="loader-test-content">
                            <p>Contenu chargé avec succès !</p>
                            <Button 
                                onClick={handleCustomLoading}
                                renderIcon={ProgressBarRound}
                            >
                                Déclencher à nouveau le chargement
                            </Button>
                        </div>
                    )}
                </Tile>
                
                <div className="loader-test-controls">
                    <div className="loader-test-control">
                        <label htmlFor="customMessage">Message personnalisé:</label>
                        <input 
                            type="text" 
                            id="customMessage" 
                            value={customMessage} 
                            onChange={(e) => setCustomMessage(e.target.value)} 
                            placeholder="Chargement..." 
                        />
                    </div>
                    <Button 
                        onClick={handleCustomLoading}
                        kind="secondary"
                    >
                        Activer le loader
                    </Button>
                </div>
            </section>
            
            <section className="loader-test-section">
                <h2>Loader en ligne</h2>
                <div className="loader-test-inline-toggle">
                    <Toggle 
                        id="toggle-inline" 
                        labelText="Afficher le loader en ligne" 
                        toggled={showInlineSample}
                        onChange={() => setShowInlineSample(!showInlineSample)} 
                    />
                </div>
                
                {showInlineSample && (
                    <Tile className="loader-test-tile">
                        <p>
                            Voici un texte avec un loader intégré {' '}
                            <span className="loader-inline">
                                <Loader description="" />
                            </span>
                            qui apparaît au milieu d'une phrase.
                        </p>
                    </Tile>
                )}
            </section>
            
            <section className="loader-test-section">
                <h2>Multiples loaders avec durées différentes</h2>
                <div className="loader-test-inline-toggle">
                    <Toggle 
                        id="toggle-multiple" 
                        labelText="Afficher plusieurs loaders" 
                        toggled={showMultiple}
                        onChange={() => setShowMultiple(!showMultiple)} 
                    />
                </div>
                
                {showMultiple && (
                    <div className="loader-test-multiple">
                        <Tile className="loader-test-multiple-item">
                            {timers.timer1 > 0 ? (
                                <div className="loader-container-small">
                                    <Loader description={`Chargement (${timers.timer1}s)`} />
                                </div>
                            ) : (
                                <div className="loader-complete">Chargement rapide terminé !</div>
                            )}
                        </Tile>
                        
                        <Tile className="loader-test-multiple-item">
                            {timers.timer2 > 0 ? (
                                <div className="loader-container-small">
                                    <Loader description={`Chargement (${timers.timer2}s)`} />
                                </div>
                            ) : (
                                <div className="loader-complete">Chargement moyen terminé !</div>
                            )}
                        </Tile>
                        
                        <Tile className="loader-test-multiple-item">
                            {timers.timer3 > 0 ? (
                                <div className="loader-container-small">
                                    <Loader description={`Chargement (${timers.timer3}s)`} />
                                </div>
                            ) : (
                                <div className="loader-complete">Chargement lent terminé !</div>
                            )}
                        </Tile>
                    </div>
                )}
            </section>
            
            <section className="loader-test-section">
                <h2>Documentation</h2>
                <Tile className="loader-test-docs">
                    <h3>Utilisation du composant Loader</h3>
                    <pre>
                        {`import Loader from "../components/loader";

// Utilisation simple
<Loader />

// Avec message personnalisé
<Loader description="Veuillez patienter..." />

// Utilisation avec condition
{isLoading && <Loader />}

// Utilisation en ligne
<div className="loader-inline">
  <Loader description="" />
</div>`}
                    </pre>
                    
                    <h3>Props disponibles</h3>
                    <table className="loader-test-props-table">
                        <thead>
                            <tr>
                                <th>Prop</th>
                                <th>Type</th>
                                <th>Défaut</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>description</td>
                                <td>string</td>
                                <td>"Chargement..."</td>
                                <td>Texte affiché à côté du loader</td>
                            </tr>
                        </tbody>
                    </table>
                </Tile>
            </section>
        </div>
    );
}

export default LoaderTest;