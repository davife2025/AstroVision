const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/huggingface',
    createProxyMiddleware({
      target: 'https://router.huggingface.co',
      changeOrigin: true,
      pathRewrite: {
        '^/api/huggingface': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('✅ Proxying to:', proxyReq.path);
      },
    })
  );
};