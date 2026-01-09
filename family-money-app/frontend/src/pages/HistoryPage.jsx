import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, gql } from '@apollo/client';

const GET_HISTORY = gql`
  query GetHistory($userId: ID!) {
    getHistory(userId: $userId) {
      id
      title
      amount
      type
      date
    }
  }
`;

export default function HistoryPage() {
    const { user } = useContext(AuthContext);
    const [filter, setFilter] = useState('ALL'); // ALL, INCOME, EXPENSE

    const { loading, error, data } = useQuery(GET_HISTORY, {
        variables: { userId: user?.id },
        skip: !user
    });

    if (loading) return <p className="container">Loading...</p>;
    if (error) return <p className="container">Error: {error.message}</p>;

    const history = data?.getHistory || [];

    const filteredHistory = filter === 'ALL'
        ? history
        : history.filter(item => item.type === filter);

    const totalIncome = history
        .filter(h => h.type === 'INCOME')
        .reduce((sum, h) => sum + h.amount, 0);

    const totalExpense = history
        .filter(h => h.type === 'EXPENSE')
        .reduce((sum, h) => sum + h.amount, 0);

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Riwayat Transaksi</h2>
                    <small style={{ color: '#666' }}>Semua catatan keuangan Anda</small>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', marginBottom: 0 }}>
                    <span style={{ opacity: 0.8, fontSize: '14px' }}>Total Pemasukan</span>
                    <h2 style={{ margin: '8px 0 0' }}>Rp {totalIncome.toLocaleString('id-ID')}</h2>
                </div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', marginBottom: 0 }}>
                    <span style={{ opacity: 0.8, fontSize: '14px' }}>Total Pengeluaran</span>
                    <h2 style={{ margin: '8px 0 0' }}>Rp {totalExpense.toLocaleString('id-ID')}</h2>
                </div>
            </div>

            {/* Filter */}
            <div className="card">
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {['ALL', 'INCOME', 'EXPENSE'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                background: filter === f ? '#2563eb' : '#e5e7eb',
                                color: filter === f ? 'white' : '#374151'
                            }}
                        >
                            {f === 'ALL' ? 'Semua' : f === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                        </button>
                    ))}
                </div>

                {/* Transaction List */}
                <h3 style={{ marginBottom: '12px' }}>
                    {filter === 'ALL' ? 'Semua Transaksi' : filter === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                    <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                        ({filteredHistory.length} transaksi)
                    </span>
                </h3>

                {filteredHistory.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                        Belum ada transaksi.
                    </p>
                ) : (
                    <div>
                        {filteredHistory.map((item) => (
                            <div key={item.id} className="list-item">
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                                    <small style={{ color: '#999' }}>
                                        {new Date(item.date).toLocaleDateString('id-ID', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </small>
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
