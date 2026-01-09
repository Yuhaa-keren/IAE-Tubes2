import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Sidebar() {
    const { user, logout } = useContext(AuthContext);

    const menuItems = [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/history', label: 'Riwayat' },
        { path: '/fund-request', label: 'Pengajuan Dana', role: 'CHILD' },
        { path: '/monitor', label: 'Monitor Anak', role: 'PARENT' },
        { path: '/fund-approval', label: 'Persetujuan Dana', role: 'PARENT' },
        { path: '/notifications', label: 'Notifikasi' },
        { path: '/settings', label: 'Pengaturan' },
    ];

    const filteredMenu = menuItems.filter(item => !item.role || item.role === user?.role);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Family Money</h2>
                <small>{user?.username}</small>
                <span className="role-badge">
                    {user?.role === 'PARENT' ? 'Orang Tua' : 'Anak'}
                </span>
            </div>

            <nav className="sidebar-nav">
                {filteredMenu.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={logout}>
                    Keluar
                </button>
            </div>
        </aside>
    );
}
