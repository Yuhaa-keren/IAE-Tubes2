// api-gateway/index.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

// Load Public Key
const PUBLIC_KEY = fs.readFileSync('/app/keys/public.key', 'utf8');

// Middleware Verifikasi JWT
const verifyToken = (req, res, next) => {
    // Skip auth untuk login/register
    if (req.path.startsWith('/auth')) return next();

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }, (err, user) => {
        if (err) {
            console.error("JWT Error:", err.message);
            return res.sendStatus(403);
        }
        req.user = user; // inject user info to request
        next();
    });
};

app.use(verifyToken);

// Proxy ke User Service (REST)
app.use('/auth', createProxyMiddleware({
    target: 'http://user-service:3001',
    changeOrigin: true
}));

// Proxy ke Transaction Service (GraphQL)
app.use('/graphql', createProxyMiddleware({
    target: 'http://transaction-service:3002/graphql',
    changeOrigin: true,
    ws: true // Support WebSocket for Subscriptions
}));

// Proxy ke Notification Service (REST)
// Menggunakan pathFilter agar path tidak di-strip
app.use('/notifications', createProxyMiddleware({
    target: 'http://notification-service:3003/notifications',
    changeOrigin: true,
    pathRewrite: {
        '^/notifications': ''
    }
}));

app.listen(3000, () => {
    console.log('API Gateway running on port 3000');
});