// user-service/index.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Load Private Key (Mount via Docker Volume nanti)
const PRIVATE_KEY = fs.readFileSync('/app/keys/private.key', 'utf8');

// Mock Database (In-Memory)
const users = [];

app.post('/auth/register', (req, res) => {
    const { username, role, password } = req.body; // role: 'PARENT' or 'CHILD'
    
    // Logic Saldo Awal sesuai Role
    let initialBalance = 0;
    if (role === 'CHILD') initialBalance = 3000000; // 3 Juta
    if (role === 'PARENT') initialBalance = 15000000; // 15 Juta

    const newUser = {
        id: users.length + 1,
        username,
        role,
        password, 
        balance: initialBalance,
        teamId: 1 // Asumsi 1 keluarga yang sama untuk demo
    };
    users.push(newUser);
    res.json({ message: "User created", user: newUser });
});

app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Generate JWT dengan Private Key (RS256)
        const token = jwt.sign(
            { id: user.id, role: user.role, teamId: user.teamId, username: user.username },
            PRIVATE_KEY,
            { algorithm: 'RS256', expiresIn: '1h' }
        );
        res.json({ token });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// Endpoint untuk internal service mendapatkan info user
app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id == req.params.id);
    res.json(user);
});

app.listen(3001, () => {
    console.log('User Service running on port 3001');
});