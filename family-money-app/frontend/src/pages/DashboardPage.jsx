import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

// 1. Query GraphQL
const GET_DATA = gql`
  query GetData($userId: ID!) {
    getHistory(userId: $userId) {
      id, title, amount, type, date
    }
    getBalance(userId: $userId)
  }
`;

// 2. Mutation GraphQL - sekarang return TransactionResult
const ADD_TRANS = gql`
  mutation Add($title: String, $amount: Float, $type: String, $userId: ID!) {
    addTransaction(title: $title, amount: $amount, type: $type, userId: $userId) {
      transaction {
        id
      }
      newBalance
    }
  }
`;

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(user?.balance || 0);
  const [transType, setTransType] = useState('EXPENSE');

  // Fetch Data
  const { loading, error, data, refetch } = useQuery(GET_DATA, {
    variables: { userId: user?.id },
    skip: !user,
    onCompleted: (data) => {
      if (data?.getBalance !== null) {
        setBalance(data.getBalance);
      }
    }
  });

  // Setup Tambah Data
  const [addTransaction, { loading: addLoading }] = useMutation(ADD_TRANS, {
    onCompleted: (data) => {
      if (data?.addTransaction?.newBalance !== undefined) {
        setBalance(data.addTransaction.newBalance);
      }
      refetch();
      setTitle(''); setAmount('');
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    addTransaction({
      variables: {
        title, amount: parseFloat(amount), type: transType, userId: user.id
      }
    });
  };

  if (loading) return <p className="container">Loading...</p>;
  if (error) return <p className="container">Error: {error.message}</p>;

  return (
    <div className="container">
      {/* Header */}
      <div className="header-flex">
        <div>
          <h2 style={{ margin: 0 }}>Halo, {user.username}</h2>
          <small style={{ color: '#666' }}>{user.role === 'PARENT' ? '👨‍👩‍👧 Orang Tua' : '👦 Anak'}</small>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NotificationBell />
          <button className="logout" onClick={logout}>Keluar</button>
        </div>
      </div>

      {/* Kartu Saldo */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white' }}>
        <span style={{ opacity: 0.8 }}>Saldo Dompet</span>
        <h1 style={{ margin: '10px 0' }}>Rp {balance.toLocaleString('id-ID')}</h1>
      </div>

      {/* Menu Navigation */}
      <div className="card" style={{ display: 'flex', gap: '10px' }}>
        {user.role === 'CHILD' && (
          <Link to="/fund-request" style={{ flex: 1 }}>
            <button style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              📝 Pengajuan Dana
            </button>
          </Link>
        )}
        {user.role === 'PARENT' && (
          <Link to="/monitor" style={{ flex: 1 }}>
            <button style={{ width: '100%', background: '#8b5cf6', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              👀 Monitor Anak
            </button>
          </Link>
        )}
      </div>

      {/* Form Input */}
      <div className="card">
        <h3>+ Catat Transaksi</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              placeholder="Keterangan transaksi" value={title} onChange={e => setTitle(e.target.value)} required
              style={{ flex: 2 }}
            />
            <input
              type="number" placeholder="Rp" value={amount} onChange={e => setAmount(e.target.value)} required
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={transType}
              onChange={e => setTransType(e.target.value)}
              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
            >
              <option value="EXPENSE">Pengeluaran</option>
              <option value="INCOME">Pemasukan</option>
            </select>
            <button type="submit" className="add-btn" disabled={addLoading}>
              {addLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>

      {/* List Transaksi */}
      <div className="card">
        <h3>Riwayat Terakhir</h3>
        {data?.getHistory.length === 0 ? <p style={{ color: '#999' }}>Belum ada data.</p> : (
          <div>
            {data.getHistory.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                  <small style={{ color: '#999' }}>{new Date(item.date).toLocaleDateString('id-ID')}</small>
                </div>
                <div className={`amount ${item.type === 'EXPENSE' ? 'text-danger' : 'text-success'}`}>
                  {item.type === 'EXPENSE' ? '-' : '+'} Rp {item.amount.toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}