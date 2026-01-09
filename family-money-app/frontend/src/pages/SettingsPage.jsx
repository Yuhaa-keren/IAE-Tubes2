import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

export default function SettingsPage() {
    const { user } = useContext(AuthContext);

    // Profile state
    const [username, setUsername] = useState(user?.username || '');
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');

    // Password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMessage('');

        try {
            await axiosInstance.patch(`/auth/users/${user.id}/profile`, { username });
            setProfileMessage({ type: 'success', text: 'Username berhasil diperbarui!' });
        } catch (error) {
            setProfileMessage({ type: 'error', text: error.response?.data?.message || 'Gagal memperbarui profil' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordLoading(true);
        setPasswordMessage('');

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Konfirmasi password tidak cocok!' });
            setPasswordLoading(false);
            return;
        }

        if (newPassword.length < 4) {
            setPasswordMessage({ type: 'error', text: 'Password baru minimal 4 karakter!' });
            setPasswordLoading(false);
            return;
        }

        try {
            await axiosInstance.patch(`/auth/users/${user.id}/password`, {
                oldPassword,
                newPassword
            });
            setPasswordMessage({ type: 'success', text: 'Password berhasil diubah!' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMessage({ type: 'error', text: error.response?.data?.message || 'Gagal mengubah password' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Pengaturan Akun</h2>
                    <small style={{ color: '#666' }}>Kelola profil dan keamanan akun</small>
                </div>
            </div>

            {/* Profile Info */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                    }}>
                        {user?.role === 'PARENT' ? 'P' : 'A'}
                    </div>
                    <div>
                        <h3 style={{ margin: 0 }}>{user?.username}</h3>
                        <small style={{ opacity: 0.8 }}>{user?.role === 'PARENT' ? 'Orang Tua' : 'Anak'}</small>
                    </div>
                </div>
            </div>

            {/* Update Username */}
            <div className="card">
                <h3>Ubah Username</h3>
                <form onSubmit={handleUpdateProfile}>
                    <div className="form-group">
                        <label>Username Baru</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Masukkan username baru"
                            required
                        />
                    </div>

                    {profileMessage && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            background: profileMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                            color: profileMessage.type === 'success' ? '#065f46' : '#991b1b'
                        }}>
                            {profileMessage.text}
                        </div>
                    )}

                    <button type="submit" disabled={profileLoading}>
                        {profileLoading ? 'Menyimpan...' : 'Simpan Username'}
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="card">
                <h3>Ubah Password</h3>
                <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                        <label>Password Lama</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            placeholder="Masukkan password lama"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Password Baru</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Masukkan password baru"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            required
                        />
                    </div>

                    {passwordMessage && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '6px',
                            marginBottom: '12px',
                            background: passwordMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                            color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b'
                        }}>
                            {passwordMessage.text}
                        </div>
                    )}

                    <button type="submit" disabled={passwordLoading} style={{ background: '#dc2626' }}>
                        {passwordLoading ? 'Mengubah...' : 'Ubah Password'}
                    </button>
                </form>
            </div>

            {/* Info */}
            <div className="card" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                    <strong>Penting:</strong> Setelah mengubah password, Anda perlu login ulang dengan password baru.
                </p>
            </div>
        </div>
    );
}
