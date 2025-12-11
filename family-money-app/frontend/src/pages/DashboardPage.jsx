import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useQuery, useMutation, gql } from '@apollo/client';
import { 
  Container, Typography, Paper, List, ListItem, ListItemText, 
  Button, Box, Grid, Chip, Divider, Dialog, DialogTitle, DialogContent, TextField, DialogActions
} from '@mui/material';

// --- GRAPHQL DEFINITIONS ---
const GET_MY_HISTORY = gql`
  query GetMyHistory($userId: ID!) {
    getHistory(userId: $userId) {
      id
      title
      amount
      type
      date
    }
  }
`;

const ADD_TRANSACTION = gql`
  mutation AddTransaction($title: String, $amount: Float, $type: String, $userId: ID!) {
    addTransaction(title: $title, amount: $amount, type: $type, userId: $userId) {
      id
      title
    }
  }
`;

const DashboardPage = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false); // State untuk modal tambah
  const [form, setForm] = useState({ title: '', amount: '' });

  // 1. Ambil Data History
  const { loading, error, data, refetch } = useQuery(GET_MY_HISTORY, {
    variables: { userId: user?.id },
    skip: !user,
  });

  // 2. Setup Mutasi Tambah Data
  const [addTransaction] = useMutation(ADD_TRANSACTION, {
    onCompleted: () => {
      refetch(); // Refresh data setelah tambah
      setOpen(false);
      setForm({ title: '', amount: '' });
    }
  });

  const handleAdd = (e) => {
    e.preventDefault();
    addTransaction({
      variables: {
        title: form.title,
        amount: parseFloat(form.amount),
        type: 'EXPENSE', // Default pengeluaran dulu
        userId: user.id
      }
    });
  };

  if (loading) return <p>Loading data...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Logic saldo dummy (karena saldo real ada di User Service yg blm di-connect endpointnya di UI ini)
  const dummyBalance = user.role === 'CHILD' ? 3000000 : 15000000;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Dashboard Keluarga</Typography>
          <Typography variant="subtitle1">Halo, {user.username}!</Typography>
        </Box>
        <Button variant="outlined" color="error" onClick={logout}>Logout</Button>
      </Box>

      {/* Kartu Saldo */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: '#1976d2', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ opacity: 0.8 }}>Saldo Saat Ini</Typography>
            <Typography variant="h3" fontWeight="bold">Rp {dummyBalance.toLocaleString()}</Typography>
            <Chip label={user.role} sx={{ mt: 1, bgcolor: 'white', color: '#1976d2', fontWeight: 'bold' }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Bagian History */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="bold">Riwayat Transaksi</Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>+ Catat Pengeluaran</Button>
      </Box>

      <Paper elevation={2}>
        <List>
          {data && data.getHistory.length === 0 ? (
            <ListItem><ListItemText primary="Belum ada transaksi tercatat." /></ListItem>
          ) : (
            data.getHistory.map((tx) => (
              <React.Fragment key={tx.id}>
                <ListItem>
                  <ListItemText 
                    primary={tx.title} 
                    secondary={new Date(tx.date).toLocaleDateString()} 
                    primaryTypographyProps={{ fontWeight: 'medium' }}
                  />
                  <Typography color={tx.type === 'EXPENSE' ? 'error' : 'success.main'} fontWeight="bold">
                    {tx.type === 'EXPENSE' ? '-' : '+'} Rp {tx.amount.toLocaleString()}
                  </Typography>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Modal Tambah Transaksi */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleAdd}>
          <DialogTitle>Catat Pengeluaran Baru</DialogTitle>
          <DialogContent>
            <TextField 
              autoFocus margin="dense" label="Keperluan" fullWidth required 
              value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
            />
            <TextField 
              margin="dense" label="Jumlah (Rp)" type="number" fullWidth required 
              value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="contained">Simpan</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default DashboardPage;