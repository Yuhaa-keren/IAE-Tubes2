import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(username, password);
      alert('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Registrasi gagal! Username mungkin sudah digunakan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ marginTop: '80px' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Daftar Akun Anak</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Buat akun untuk anggota keluarga (anak)
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Masukkan username anak"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>
          <div style={{
            background: '#f0f9ff',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#0369a1'
          }}>
            💰 Saldo awal: <strong>Rp 3.000.000</strong>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Mendaftar...' : 'Daftar Akun Anak'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          Sudah punya akun? <Link to="/login" style={{ color: 'var(--primary)' }}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}

