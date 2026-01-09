// user-service/index.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
app.use(bodyParser.json());

// Load Private Key
const PRIVATE_KEY = fs.readFileSync('/app/keys/private.key', 'utf8');

// Notification Service URL
const NOTIFICATION_SERVICE_URL = 'http://notification-service:3003';

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'family_money',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function untuk send notification
async function sendNotification(userId, title, message, type) {
    try {
        await fetch(`${NOTIFICATION_SERVICE_URL}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, title, message, type })
        });
        console.log(`[Notification] Sent to user ${userId}: ${title}`);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}

// Register - HANYA untuk CHILD
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Cek apakah username sudah ada
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Username sudah digunakan" });
        }

        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO users (username, password, role, balance, team_id) VALUES (?, ?, ?, ?, ?)',
            [username, password, 'CHILD', 3000000, 1]
        );

        const newUserId = result.insertId;

        // Send welcome notification
        await sendNotification(
            newUserId,
            'Selamat Datang!',
            `Halo ${username}! Akun kamu berhasil dibuat. Saldo awal: Rp 3.000.000`,
            'WELCOME'
        );

        // Notify parent
        await sendNotification(
            1,
            'Anak Baru Terdaftar',
            `${username} telah bergabung sebagai anggota keluarga!`,
            'NEW_CHILD'
        );

        res.json({
            message: "Akun anak berhasil dibuat",
            user: { id: newUserId, username, role: 'CHILD', balance: 3000000 }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query(
            'SELECT id, username, password, role, balance, team_id FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            const token = jwt.sign(
                { id: user.id, role: user.role, teamId: user.team_id, username: user.username, balance: parseFloat(user.balance) },
                PRIVATE_KEY,
                { algorithm: 'RS256', expiresIn: '1h' }
            );
            res.json({ token });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Get all children - MUST be before /users/:id to avoid conflict
app.get('/users/children', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, role, balance FROM users WHERE role = ?',
            ['CHILD']
        );
        res.json(rows.map(r => ({ ...r, balance: parseFloat(r.balance) })));
    } catch (error) {
        console.error('Get children error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Get all parents - MUST be before /users/:id to avoid conflict
app.get('/users/parents', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, role, balance FROM users WHERE role = ?',
            ['PARENT']
        );
        res.json(rows.map(r => ({ ...r, balance: parseFloat(r.balance) })));
    } catch (error) {
        console.error('Get parents error:', error);
        res.status(500).json({ message: "Database error" });
    }
});


// Get user by ID
app.get('/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, role, balance, team_id FROM users WHERE id = ?',
            [req.params.id]
        );
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Get balance
app.get('/users/:id/balance', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json({ balance: parseFloat(rows[0].balance) });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Update balance
app.patch('/users/:id/balance', async (req, res) => {
    const { amount, type } = req.body;

    try {
        const [rows] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        let currentBalance = parseFloat(rows[0].balance);
        let newBalance;

        if (type === 'EXPENSE') {
            if (currentBalance < amount) {
                return res.status(400).json({ message: "Saldo tidak mencukupi" });
            }
            newBalance = currentBalance - amount;
        } else if (type === 'INCOME') {
            newBalance = currentBalance + amount;
        } else {
            return res.status(400).json({ message: "Invalid type" });
        }

        await pool.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, req.params.id]);
        res.json({ balance: newBalance, message: "Balance updated" });
    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Update profile (username)
app.patch('/users/:id/profile', async (req, res) => {
    const { username } = req.body;
    const userId = req.params.id;

    try {
        // Check if username already exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ? AND id != ?',
            [username, userId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: "Username sudah digunakan" });
        }

        await pool.query('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
        res.json({ message: "Username berhasil diperbarui", username });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Change password
app.patch('/users/:id/password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;

    try {
        // Verify old password
        const [rows] = await pool.query(
            'SELECT id FROM users WHERE id = ? AND password = ?',
            [userId, oldPassword]
        );

        if (rows.length === 0) {
            return res.status(400).json({ message: "Password lama tidak sesuai" });
        }

        // Update password
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
        res.json({ message: "Password berhasil diubah" });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

app.listen(3001, () => {
    console.log('User Service running on port 3001 (MySQL)');
    console.log('DB Host:', process.env.DB_HOST);
});
