import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';

// Query untuk mendapatkan semua pengajuan pending dan daftar anak
const GET_DATA = gql`
  query GetData {
    getPendingRequests {
      id
      title
      description
      amount
      deadline
      status
      requesterId
      requesterName
      createdAt
    }
    getChildren {
      id
      username
      balance
    }
  }
`;

const GET_BALANCE = gql`
  query GetBalance($userId: ID!) {
    getBalance(userId: $userId)
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

// Mutation untuk approve
const APPROVE_REQUEST = gql`
  mutation ApproveRequest($requestId: ID!, $parentId: ID!) {
    approveRequest(requestId: $requestId, parentId: $parentId) {
      request {
        id
        status
      }
      childBalance
      parentBalance
    }
  }
`;

// Mutation untuk reject
const REJECT_REQUEST = gql`
  mutation RejectRequest($requestId: ID!) {
    rejectRequest(requestId: $requestId) {
      id
      status
    }
  }
`;

export default function ParentMonitorPage() {
    const { user, logout } = useContext(AuthContext);
    const [balance, setBalance] = useState(user?.balance || 0);
    const [selectedChildId, setSelectedChildId] = useState(null);
    const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'monitor'

    const { loading, error, data, refetch } = useQuery(GET_DATA);

    const { data: balanceData } = useQuery(GET_BALANCE, {
        variables: { userId: user?.id },
        skip: !user,
        onCompleted: (data) => {
            if (data?.getBalance) setBalance(data.getBalance);
        }
    });

    const { data: childData, loading: childLoading } = useQuery(GET_CHILD_HISTORY, {
        variables: { userId: selectedChildId },
        skip: !selectedChildId
    });

    const [approveRequest, { loading: approving }] = useMutation(APPROVE_REQUEST, {
        onCompleted: (data) => {
            setBalance(data.approveRequest.parentBalance);
            refetch();
            alert(`Pengajuan disetujui! Saldo anak sekarang: Rp ${data.approveRequest.childBalance.toLocaleString('id-ID')}`);
        },
        onError: (err) => alert(err.message)
    });

    const [rejectRequest, { loading: rejecting }] = useMutation(REJECT_REQUEST, {
        onCompleted: () => {
            refetch();
            alert('Pengajuan ditolak');
        },
        onError: (err) => alert(err.message)
    });

    const handleApprove = (requestId) => {
        if (window.confirm('Yakin ingin menyetujui pengajuan ini? Saldo Anda akan berkurang.')) {
            approveRequest({ variables: { requestId, parentId: user.id } });
        }
    };

    const handleReject = (requestId) => {
        if (window.confirm('Yakin ingin menolak pengajuan ini?')) {
            rejectRequest({ variables: { requestId } });
        }
    };

    if (loading) return <p className="container">Loading...</p>;
    if (error) return <p className="container">Error: {error.message}</p>;

    const pendingRequests = data?.getPendingRequests || [];
    const children = data?.getChildren || [];

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Monitor Anak</h2>
                    <small style={{ color: '#666' }}>👨‍👩‍👧 {user.username} (Orang Tua)</small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to="/dashboard">
                        <button className="add-btn" style={{ fontSize: '12px' }}>← Dashboard</button>
                    </Link>
                    <button className="logout" onClick={logout}>Keluar</button>
                </div>
            </div>

            {/* Saldo Orang Tua */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
                <span style={{ opacity: 0.8 }}>Saldo Anda</span>
                <h1 style={{ margin: '10px 0' }}>Rp {balance.toLocaleString('id-ID')}</h1>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                    onClick={() => setActiveTab('requests')}
                    style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: activeTab === 'requests' ? '#2563eb' : '#e5e7eb',
                        color: activeTab === 'requests' ? 'white' : '#374151',
                        fontWeight: 'bold'
                    }}
                >
                    📬 Pengajuan Dana ({pendingRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('monitor')}
                    style={{
                        flex: 1, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: activeTab === 'monitor' ? '#2563eb' : '#e5e7eb',
                        color: activeTab === 'monitor' ? 'white' : '#374151',
                        fontWeight: 'bold'
                    }}
                >
                    👁️ Lihat Pengeluaran Anak
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'requests' && (
                <div className="card">
                    <h3>📬 Pengajuan Masuk</h3>
                    {pendingRequests.length === 0 ? (
                        <p style={{ color: '#999' }}>Tidak ada pengajuan yang menunggu persetujuan.</p>
                    ) : (
                        <div>
                            {pendingRequests.map((req) => (
                                <div key={req.id} style={{
                                    border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px', background: '#fefce8'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{req.title}</div>
                                            <div style={{ color: '#666', fontSize: '14px' }}>
                                                Dari: <strong>{req.requesterName}</strong>
                                            </div>
                                            <small style={{ color: '#999' }}>
                                                {new Date(req.createdAt).toLocaleDateString('id-ID')}
                                                {req.deadline && ` • Deadline: ${new Date(req.deadline).toLocaleDateString('id-ID')}`}
                                            </small>
                                            {req.description && <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>{req.description}</p>}
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#dc2626', textAlign: 'right' }}>
                                            Rp {req.amount.toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button onClick={() => handleApprove(req.id)} disabled={approving}
                                            style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            ✅ Setujui
                                        </button>
                                        <button onClick={() => handleReject(req.id)} disabled={rejecting}
                                            style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                            ❌ Tolak
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'monitor' && (
                <div className="card">
                    <h3>👁️ Pantau Pengeluaran Anak</h3>

                    {children.length === 0 ? (
                        <p style={{ color: '#999' }}>Belum ada anak yang terdaftar.</p>
                    ) : (
                        <>
                            {/* Pilih Anak */}
                            <div className="form-group">
                                <label>Pilih Akun Anak:</label>
                                <select
                                    value={selectedChildId || ''}
                                    onChange={e => setSelectedChildId(e.target.value)}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: 'white' }}
                                >
                                    <option value="">-- Pilih Anak --</option>
                                    {children.map(child => (
                                        <option key={child.id} value={child.id}>
                                            {child.username} (Saldo: Rp {child.balance.toLocaleString('id-ID')})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Info Anak Terpilih */}
                            {selectedChildId && childData && (
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                        <span style={{ color: '#065f46' }}>Saldo {children.find(c => c.id == selectedChildId)?.username}:</span>
                                        <h2 style={{ margin: '4px 0', color: '#059669' }}>
                                            Rp {(childData.getBalance || 0).toLocaleString('id-ID')}
                                        </h2>
                                    </div>

                                    <h4>📊 Riwayat Transaksi</h4>
                                    {childLoading ? (
                                        <p>Loading...</p>
                                    ) : childData?.getHistory?.length === 0 ? (
                                        <p style={{ color: '#999' }}>Belum ada transaksi.</p>
                                    ) : (
                                        <div>
                                            {childData.getHistory.map((item) => (
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
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="card" style={{ background: '#f0f9ff', borderLeft: '4px solid #0369a1' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                    💡 <strong>Info:</strong> Saat menyetujui pengajuan, saldo Anda akan berkurang dan saldo anak akan bertambah secara otomatis.
                </p>
            </div>
        </div>
    );
}
