const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Forward all /api requests to Laravel
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      logLevel: 'debug',
    })
  );

  // Forward all /storage requests to Laravel
  app.use(
    '/storage',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
};