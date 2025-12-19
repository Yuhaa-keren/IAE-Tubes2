// notification-service/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// Create notification
app.post('/notifications', async (req, res) => {
    const { userId, title, message, type } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO notifications (user_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?)',
            [userId, title, message, type || 'INFO', false]
        );

        console.log(`[Notification] Created for user ${userId}: ${title}`);
        res.status(201).json({
            id: result.insertId,
            userId,
            title,
            message,
            type: type || 'INFO',
            isRead: false,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Get notifications for user
app.get('/notifications/:userId', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, user_id as userId, title, message, type, is_read as isRead, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
            [req.params.userId]
        );
        res.json(rows.map(r => ({ ...r, isRead: Boolean(r.isRead) })));
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Get unread count
app.get('/notifications/:userId/unread-count', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [req.params.userId]
        );
        res.json({ count: rows[0].count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Mark as read
app.patch('/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
        const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
        if (rows.length > 0) {
            res.json({ ...rows[0], isRead: true });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Mark all as read for user
app.patch('/notifications/:userId/read-all', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.params.userId]);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Delete notification
app.delete('/notifications/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM notifications WHERE id = ?', [req.params.id]);
        if (result.affectedRows > 0) {
            res.json({ message: 'Notification deleted' });
        } else {
            res.status(404).json({ message: 'Notification not found' });
        }
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: "Database error" });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'notification-service', database: 'MySQL' });
});

app.listen(3003, () => {
    console.log('Notification Service running on port 3003 (MySQL)');
    console.log('DB Host:', process.env.DB_HOST);
});
