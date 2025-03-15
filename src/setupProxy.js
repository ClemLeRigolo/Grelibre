const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://data.mobilites-m.fr',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // pas besoin de réécrire le chemin
      },
      onProxyReq: (proxyReq, req, res) => {
        // Ajouter l'en-tête Origin pour les requêtes
        proxyReq.setHeader('Origin', 'GreMobile');
      }
    })
  );
};