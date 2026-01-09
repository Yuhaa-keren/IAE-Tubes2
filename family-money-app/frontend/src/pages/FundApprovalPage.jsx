import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_DATA = gql`
  query GetData($userId: ID!) {
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
    getBalance(userId: $userId)
  }
`;

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

const REJECT_REQUEST = gql`
  mutation RejectRequest($requestId: ID!) {
    rejectRequest(requestId: $requestId) {
      id
      status
    }
  }
`;

export default function FundApprovalPage() {
    const { user } = useContext(AuthContext);
    const [balance, setBalance] = useState(user?.balance || 0);

    const { loading, error, data, refetch } = useQuery(GET_DATA, {
        variables: { userId: user?.id },
        skip: !user,
        onCompleted: (data) => {
            if (data?.getBalance) setBalance(data.getBalance);
        }
    });

    const [approveRequest, { loading: approving }] = useMutation(APPROVE_REQUEST, {
        onCompleted: (data) => {
            setBalance(data.approveRequest.parentBalance);
            refetch();
            alert(`Pengajuan disetujui! Saldo anak sekarang: Rp ${data.approveRequest.childBalance.toLocaleString('id-ID')}`);
        },
        onError: (err) => alert('Error: ' + err.message)
    });

    const [rejectRequest, { loading: rejecting }] = useMutation(REJECT_REQUEST, {
        onCompleted: () => {
            refetch();
            alert('Pengajuan ditolak');
        },
        onError: (err) => alert('Error: ' + err.message)
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

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Persetujuan Dana</h2>
                    <small style={{ color: '#666' }}>Kelola pengajuan dana dari anak</small>
                </div>
            </div>

            {/* Saldo Orang Tua */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white' }}>
                <span style={{ opacity: 0.8 }}>Saldo Anda</span>
                <h1 style={{ margin: '10px 0' }}>Rp {balance.toLocaleString('id-ID')}</h1>
                <small style={{ opacity: 0.7 }}>Saldo akan berkurang saat menyetujui pengajuan</small>
            </div>

            {/* Pengajuan Pending */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Pengajuan Masuk</h3>
                    <span style={{
                        background: pendingRequests.length > 0 ? '#fef3c7' : '#ecfdf5',
                        color: pendingRequests.length > 0 ? '#92400e' : '#065f46',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}>
                        {pendingRequests.length} menunggu
                    </span>
                </div>

                {pendingRequests.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                        <p>Tidak ada pengajuan yang menunggu persetujuan.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pendingRequests.map((req) => (
                            <div key={req.id} style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '16px',
                                background: '#fffbeb'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '4px' }}>{req.title}</div>
                                        <div style={{ color: '#666', fontSize: '14px' }}>
                                            Dari: <strong>{req.requesterName}</strong>
                                        </div>
                                        <small style={{ color: '#999' }}>
                                            {new Date(req.createdAt).toLocaleDateString('id-ID')}
                                            {req.deadline && ` - Deadline: ${new Date(req.deadline).toLocaleDateString('id-ID')}`}
                                        </small>
                                        {req.description && (
                                            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                                "{req.description}"
                                            </p>
                                        )}
                                    </div>
                                    <div style={{
                                        fontWeight: 'bold',
                                        fontSize: '20px',
                                        color: '#dc2626',
                                        textAlign: 'right',
                                        background: '#fee2e2',
                                        padding: '8px 12px',
                                        borderRadius: '8px'
                                    }}>
                                        Rp {req.amount.toLocaleString('id-ID')}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={approving}
                                        style={{
                                            flex: 1,
                                            background: '#10b981',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {approving ? 'Memproses...' : 'Setujui'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        disabled={rejecting}
                                        style={{
                                            flex: 1,
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        }}
                                    >
                                        {rejecting ? 'Memproses...' : 'Tolak'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="card" style={{ background: '#f0f9ff', borderLeft: '4px solid #0369a1' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#0369a1' }}>
                    <strong>Info:</strong> Saat menyetujui pengajuan, saldo Anda akan berkurang dan saldo anak akan bertambah secara otomatis.
                </p>
            </div>
        </div>
    );
}
