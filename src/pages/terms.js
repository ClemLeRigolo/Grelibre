import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Breadcrumb, 
  BreadcrumbItem,
  Button, 
  Tile,
  Content,
  Grid,
  Column
} from 'carbon-components-react';
import { ArrowLeft, Document } from '@carbon/icons-react';

import '../styles/terms.css';

function Terms() {
  return (
    <div className="terms-container">
      <Content>
        <Grid>
          <Column lg={12} md={8} sm={4}>
            <Breadcrumb className="terms-breadcrumb">
              <BreadcrumbItem>
                <Link to="/">Accueil</Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                Conditions d'utilisation
              </BreadcrumbItem>
            </Breadcrumb>

            <div className="terms-header">
              <Document size={32} />
              <h1>Conditions d'utilisation</h1>
            </div>

            <Tile className="terms-content">
              <p className="terms-intro">
                Merci d'utiliser GreLibre. En accédant à notre application, vous acceptez d'être lié par les présentes conditions.
              </p>

              <h2>1. Utilisation de l'application</h2>
              <p>
                GreLibre est une plateforme permettant aux utilisateurs de consulter et partager des informations sur les transports et mobilités à Grenoble. Nous nous efforçons de fournir un service fiable et continu, mais ne pouvons garantir que le service sera ininterrompu ou exempt d'erreurs.
              </p>

              <h2>2. Limitations d'utilisation</h2>
              <p>
                Pour assurer une utilisation équitable et la stabilité du service, nous imposons certaines limitations :
              </p>
              <ul>
                <li>Évitez les requêtes excessives ou automatisées qui pourraient surcharger notre infrastructure</li>
                <li>Limitez l'utilisation des fonctionnalités de recherche à un usage personnel et raisonnable</li>
                <li>N'utilisez pas de robots, scrapers ou autres moyens automatisés pour accéder au contenu</li>
                <li>Ne tentez pas de contourner les mesures de sécurité ou d'accéder à des données non autorisées</li>
              </ul>

              <h2>3. Compte utilisateur</h2>
              <p>
                La création d'un compte est facultative pour certaines fonctionnalités de base, mais nécessaire pour accéder à des fonctionnalités avancées. Vous êtes responsable de maintenir la confidentialité de vos informations de connexion.
              </p>

              <h2>4. Données personnelles</h2>
              <p>
                Nous collectons uniquement les données nécessaires au bon fonctionnement du service. Consultez notre politique de confidentialité pour plus d'informations sur la manière dont nous traitons vos données.
              </p>

              <h2>5. Propriété intellectuelle</h2>
              <p>
                Le contenu et les fonctionnalités de GreLibre sont protégés par des droits de propriété intellectuelle. Vous ne pouvez pas copier, modifier, distribuer ou exploiter commercialement ce contenu sans autorisation explicite.
              </p>

              <h2>6. Modification des conditions</h2>
              <p>
                Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications prendront effet dès leur publication sur l'application.
              </p>

              <div className="terms-contact">
                <p>
                  Pour toute question concernant ces conditions d'utilisation, veuillez nous contacter à : <a href="mailto:contact@grelibre.fr">contact@grelibre.fr</a>
                </p>
              </div>
            </Tile>

            <div className="terms-actions">
              <Button 
                kind="secondary" 
                renderIcon={ArrowLeft} 
                as={Link} 
                to="/"
                className="terms-back-btn"
              >
                Retour à l'accueil
              </Button>

              <Button 
                as={Link} 
                to="/signup"
              >
                J'accepte les conditions
              </Button>
            </div>
          </Column>
        </Grid>
      </Content>
    </div>
  );
}

export default Terms;