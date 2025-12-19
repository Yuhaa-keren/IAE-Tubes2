import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

export default function NotificationPage() {
    const { user, logout } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const res = await axiosInstance.get(`/notifications/${user.id}`);
            setNotifications(res.data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axiosInstance.patch(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.patch(`/notifications/${user.id}/read-all`);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'FUND_REQUEST': return '📬';
            case 'REQUEST_APPROVED': return '✅';
            case 'REQUEST_REJECTED': return '❌';
            default: return '🔔';
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'FUND_REQUEST': return '#fef3c7';
            case 'REQUEST_APPROVED': return '#d1fae5';
            case 'REQUEST_REJECTED': return '#fee2e2';
            default: return '#f3f4f6';
        }
    };

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>🔔 Notifikasi</h2>
                    <small style={{ color: '#666' }}>{user.username}</small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to="/dashboard">
                        <button className="add-btn" style={{ fontSize: '12px' }}>← Dashboard</button>
                    </Link>
                    <button className="logout" onClick={logout}>Keluar</button>
                </div>
            </div>

            {/* Actions */}
            {notifications.some(n => !n.isRead) && (
                <button
                    onClick={markAllAsRead}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '16px'
                    }}
                >
                    ✓ Tandai semua sudah dibaca
                </button>
            )}

            {/* List */}
            <div className="card">
                {loading ? (
                    <p>Loading...</p>
                ) : notifications.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center' }}>Tidak ada notifikasi.</p>
                ) : (
                    <div>
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => !notif.isRead && markAsRead(notif.id)}
                                style={{
                                    padding: '12px',
                                    marginBottom: '8px',
                                    borderRadius: '8px',
                                    background: getTypeColor(notif.type),
                                    opacity: notif.isRead ? 0.7 : 1,
                                    cursor: notif.isRead ? 'default' : 'pointer',
                                    border: notif.isRead ? '1px solid #e5e7eb' : '2px solid #2563eb'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span style={{ fontSize: '24px' }}>{getTypeIcon(notif.type)}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{notif.title}</div>
                                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{notif.message}</div>
                                        <small style={{ color: '#999' }}>
                                            {new Date(notif.createdAt).toLocaleString('id-ID')}
                                        </small>
                                    </div>
                                    {!notif.isRead && (
                                        <span style={{
                                            width: '10px',
                                            height: '10px',
                                            background: '#2563eb',
                                            borderRadius: '50%'
                                        }}></span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
