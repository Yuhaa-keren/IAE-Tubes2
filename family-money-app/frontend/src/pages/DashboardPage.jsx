import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';

// 1. Query GraphQL
const GET_DATA = gql`
  query GetData($userId: ID!) {
    getHistory(userId: $userId) {
      id, title, amount, type, date
    }
  }
`;

// 2. Mutation GraphQL
const ADD_TRANS = gql`
  mutation Add($title: String, $amount: Float, $type: String, $userId: ID!) {
    addTransaction(title: $title, amount: $amount, type: $type, userId: $userId) {
      id
    }
  }
`;

export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  // Fetch Data
  const { loading, error, data, refetch } = useQuery(GET_DATA, {
    variables: { userId: user?.id },
    skip: !user
  });

  // Setup Tambah Data
  const [addTransaction] = useMutation(ADD_TRANS, {
    onCompleted: () => {
      refetch();
      setTitle(''); setAmount('');
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    addTransaction({
      variables: {
        title, amount: parseFloat(amount), type: 'EXPENSE', userId: user.id
      }
    });
  };

  if (loading) return <p className="container">Loading...</p>;
  if (error) return <p className="container">Error: {error.message}</p>;

  // Saldo Dummy (Logic Frontend Saja)
  const saldo = user.role === 'CHILD' ? 3000000 : 15000000;

  return (
    <div className="container">
      {/* Header */}
      <div className="header-flex">
        <div>
          <h2 style={{margin:0}}>Halo, {user.username}</h2>
          <small style={{color:'#666'}}>{user.role}</small>
        </div>
        <button className="logout" onClick={logout}>Keluar</button>
      </div>

      {/* Kartu Saldo */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white' }}>
        <span style={{ opacity: 0.8 }}>Saldo Dompet</span>
        <h1 style={{ margin: '10px 0' }}>Rp {saldo.toLocaleString()}</h1>
      </div>

      {/* Form Input */}
      <div className="card">
        <h3>+ Catat Pengeluaran</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
          <input 
            placeholder="Beli apa?" value={title} onChange={e => setTitle(e.target.value)} required 
            style={{ flex: 2 }}
          />
          <input 
            type="number" placeholder="Rp" value={amount} onChange={e => setAmount(e.target.value)} required 
            style={{ flex: 1 }}
          />
          <button type="submit" className="add-btn">Simpan</button>
        </form>
      </div>

      {/* List Transaksi */}
      <div className="card">
        <h3>Riwayat Terakhir</h3>
        {data?.getHistory.length === 0 ? <p style={{color:'#999'}}>Belum ada data.</p> : (
          <div>
            {data.getHistory.map((item) => (
              <div key={item.id} className="list-item">
                <div>
                  <div style={{fontWeight:'bold'}}>{item.title}</div>
                  <small style={{color:'#999'}}>{new Date(item.date).toLocaleDateString()}</small>
                </div>
                <div className={`amount ${item.type === 'EXPENSE' ? 'text-danger' : 'text-success'}`}>
                  {item.type === 'EXPENSE' ? '-' : '+'} Rp {item.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}