import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';

// Query untuk mendapatkan pengajuan anak
const GET_MY_REQUESTS = gql`
  query GetMyRequests($userId: ID!) {
    getMyRequests(userId: $userId) {
      id
      title
      description
      amount
      deadline
      status
      createdAt
    }
    getBalance(userId: $userId)
  }
`;

// Mutation untuk membuat pengajuan baru
const CREATE_REQUEST = gql`
  mutation CreateRequest($title: String, $description: String, $amount: Float, $deadline: String, $requesterId: ID!, $requesterName: String) {
    createFundRequest(title: $title, description: $description, amount: $amount, deadline: $deadline, requesterId: $requesterId, requesterName: $requesterName) {
      id
      title
      status
    }
  }
`;

// Mutation untuk menghapus pengajuan
const DELETE_REQUEST = gql`
  mutation DeleteRequest($requestId: ID!, $userId: ID!) {
    deleteFundRequest(requestId: $requestId, userId: $userId)
  }
`;

export default function FundRequestPage() {
    const { user, logout } = useContext(AuthContext);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [deadline, setDeadline] = useState('');

    const { loading, error, data, refetch } = useQuery(GET_MY_REQUESTS, {
        variables: { userId: user?.id },
        skip: !user
    });

    const [createRequest, { loading: creating }] = useMutation(CREATE_REQUEST, {
        onCompleted: () => {
            refetch();
            setTitle('');
            setDescription('');
            setAmount('');
            setDeadline('');
            alert('Pengajuan dana berhasil dikirim!');
        },
        onError: (err) => alert(err.message)
    });

    const [deleteRequest] = useMutation(DELETE_REQUEST, {
        onCompleted: () => {
            refetch();
            alert('Pengajuan dibatalkan');
        },
        onError: (err) => alert(err.message)
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createRequest({
            variables: {
                title,
                description,
                amount: parseFloat(amount),
                deadline,
                requesterId: user.id,
                requesterName: user.username
            }
        });
    };

    const handleDelete = (requestId) => {
        if (window.confirm('Yakin ingin membatalkan pengajuan ini?')) {
            deleteRequest({
                variables: { requestId, userId: user.id }
            });
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: { background: '#fef3c7', color: '#92400e' },
            APPROVED: { background: '#d1fae5', color: '#065f46' },
            REJECTED: { background: '#fee2e2', color: '#991b1b' }
        };
        const labels = {
            PENDING: '⏳ Menunggu',
            APPROVED: '✅ Disetujui',
            REJECTED: '❌ Ditolak'
        };
        return (
            <span style={{
                ...styles[status],
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
            }}>
                {labels[status]}
            </span>
        );
    };

    if (loading) return <p className="container">Loading...</p>;
    if (error) return <p className="container">Error: {error.message}</p>;

    return (
        <div className="container">
            {/* Header */}
            <div className="header-flex">
                <div>
                    <h2 style={{ margin: 0 }}>Pengajuan Dana</h2>
                    <small style={{ color: '#666' }}>👦 {user.username}</small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to="/dashboard">
                        <button className="add-btn" style={{ fontSize: '12px' }}>← Dashboard</button>
                    </Link>
                    <button className="logout" onClick={logout}>Keluar</button>
                </div>
            </div>

            {/* Saldo */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
                <span style={{ opacity: 0.8 }}>Saldo Kamu</span>
                <h1 style={{ margin: '10px 0' }}>Rp {(data?.getBalance || 0).toLocaleString('id-ID')}</h1>
            </div>

            {/* Form Pengajuan */}
            <div className="card">
                <h3>📝 Buat Pengajuan Baru</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Keperluan</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Contoh: Beli buku sekolah"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Deskripsi (opsional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Jelaskan lebih detail..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                minHeight: '60px',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Jumlah (Rp)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="100000"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label>Deadline</label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={creating}>
                        {creating ? 'Mengirim...' : '🚀 Kirim Pengajuan'}
                    </button>
                </form>
            </div>

            {/* Daftar Pengajuan */}
            <div className="card">
                <h3>📋 Riwayat Pengajuan</h3>
                {data?.getMyRequests?.length === 0 ? (
                    <p style={{ color: '#999' }}>Belum ada pengajuan.</p>
                ) : (
                    <div>
                        {data.getMyRequests.map((req) => (
                            <div key={req.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{req.title}</div>
                                        <small style={{ color: '#999' }}>
                                            {new Date(req.createdAt).toLocaleDateString('id-ID')}
                                            {req.deadline && ` • Deadline: ${new Date(req.deadline).toLocaleDateString('id-ID')}`}
                                        </small>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>
                                            Rp {req.amount.toLocaleString('id-ID')}
                                        </div>
                                        {getStatusBadge(req.status)}
                                    </div>
                                </div>
                                {req.description && (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{req.description}</p>
                                )}
                                {req.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleDelete(req.id)}
                                        style={{
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            border: 'none',
                                            padding: '4px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        ❌ Batalkan
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
