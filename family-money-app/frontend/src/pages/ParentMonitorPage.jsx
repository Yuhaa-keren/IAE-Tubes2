import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, gql } from '@apollo/client';

const GET_CHILDREN = gql`
  query GetChildren {
    getChildren {
      id
      username
      balance
    }
  }
`;

const GET_CHILD_HISTORY = gql`
  query GetChildHistory($userId: ID!) {
    getHistory(userId: $userId) {
      id
      title
      amount
      type
      date
    }
    getBalance(userId: $userId)
  }
`;

export default function ParentMonitorPage() {
    const { user } = useContext(AuthContext);
    const [selectedChildId, setSelectedChildId] = useState(null);

    const { loading, error, data } = useQuery(GET_CHILDREN);

    const { data: childData, loading: childLoading } = useQuery(GET_CHILD_HISTORY, {
        variables: { userId: selectedChildId },
        skip: !selectedChildId
    });

    if (loading) return <p className="container">Loading...</p>;
    if (error) return <p className="container">Error: {error.message}</p>;

    const children = data?.getChildren || [];
    const selectedChild = children.find(c => c.id == selectedChildId);

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Monitor Anak</h2>
                    <small style={{ color: '#666' }}>Pantau aktivitas keuangan anak</small>
                </div>
            </div>

            {/* Daftar Anak */}
            <div className="card">
                <h3>Daftar Anak</h3>
                {children.length === 0 ? (
                    <p style={{ color: '#999' }}>Belum ada anak yang terdaftar.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {children.map(child => (
                            <div
                                key={child.id}
                                onClick={() => setSelectedChildId(child.id)}
                                style={{
                                    padding: '16px',
                                    border: selectedChildId == child.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: selectedChildId == child.id ? '#eff6ff' : 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{child.username}</div>
                                    <small style={{ color: '#666' }}>Klik untuk lihat riwayat</small>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#059669', fontWeight: 'bold' }}>
                                        Rp {child.balance.toLocaleString('id-ID')}
                                    </div>
                                    <small style={{ color: '#999' }}>Saldo</small>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Riwayat Anak Terpilih */}
            {selectedChildId && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0 }}>📊 Riwayat {selectedChild?.username}</h3>
                        <div style={{ background: '#ecfdf5', padding: '8px 16px', borderRadius: '20px' }}>
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>
                                Saldo: Rp {(childData?.getBalance || 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {childLoading ? (
                        <p>Loading...</p>
                    ) : childData?.getHistory?.length === 0 ? (
                        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Belum ada transaksi.</p>
                    ) : (
                        <div>
                            {childData.getHistory.map((item) => (
                                <div key={item.id} className="list-item">
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                                        <small style={{ color: '#999' }}>
                                            {new Date(item.date).toLocaleDateString('id-ID', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
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
            )}

            {/* Info */}
            {!selectedChildId && (
                <div className="card" style={{ background: '#f0f9ff', borderLeft: '4px solid #0369a1' }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                        <strong>Tip:</strong> Klik salah satu anak di atas untuk melihat riwayat transaksi mereka.
                    </p>
                </div>
            )}
        </div>
    );
}
