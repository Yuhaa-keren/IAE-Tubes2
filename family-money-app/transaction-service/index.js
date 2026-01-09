// transaction-service/index.js
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PubSub } = require('graphql-subscriptions');
const mysql = require('mysql2/promise');

const pubsub = new PubSub();
const app = express();
const httpServer = createServer(app);

// Service URLs
const USER_SERVICE_URL = 'http://user-service:3001';
const NOTIFICATION_SERVICE_URL = 'http://notification-service:3003';

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'family_money',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper functions for inter-service communication
async function updateUserBalance(userId, amount, type) {
  const response = await fetch(`${USER_SERVICE_URL}/users/${userId}/balance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, type })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update balance');
  return data;
}

async function getUserBalance(userId) {
  const response = await fetch(`${USER_SERVICE_URL}/users/${userId}/balance`);
  const data = await response.json();
  return data.balance;
}

async function getAllChildren() {
  const response = await fetch(`${USER_SERVICE_URL}/users/children`);
  return await response.json();
}

async function getAllParents() {
  const response = await fetch(`${USER_SERVICE_URL}/users/parents`);
  return await response.json();
}

async function sendNotification(userId, title, message, type) {
  try {
    await fetch(`${NOTIFICATION_SERVICE_URL}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, message, type })
    });
    console.log(`[Notification] Sent to user ${userId}: ${title}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

async function notifyAllParents(title, message, type) {
  try {
    console.log('[NotifyParents] Starting to notify parents...');
    let parents = [];

    // Try to get parents from user-service
    try {
      const response = await fetch(`${USER_SERVICE_URL}/users/parents`);
      if (response.ok) {
        parents = await response.json();
        console.log(`[NotifyParents] Got ${parents.length} parents from user-service`);
      } else {
        console.log('[NotifyParents] Failed to get parents from user-service, using fallback');
      }
    } catch (fetchError) {
      console.error('[NotifyParents] Fetch error:', fetchError.message);
    }

    // Fallback: query database directly for parents
    if (!parents || parents.length === 0) {
      console.log('[NotifyParents] Using database fallback...');
      const [rows] = await pool.query('SELECT DISTINCT u.id FROM users u WHERE u.role = ?', ['PARENT']);
      parents = rows;
      console.log(`[NotifyParents] Got ${parents.length} parents from database`);
    }

    // Send notification to each parent
    for (const parent of parents) {
      console.log(`[NotifyParents] Sending notification to parent ID: ${parent.id}`);
      await sendNotification(parent.id, title, message, type);
    }

    console.log('[NotifyParents] Done notifying parents');
  } catch (error) {
    console.error('[NotifyParents] Error:', error);
  }
}

// --- SCHEMA ---
const typeDefs = `
  type Transaction {
    id: ID!
    title: String
    amount: Float
    type: String 
    date: String
    userId: ID
  }

  type FundRequest {
    id: ID!
    title: String
    description: String
    amount: Float
    deadline: String
    status: String 
    requesterId: ID
    requesterName: String
    createdAt: String
  }

  type TransactionResult {
    transaction: Transaction
    newBalance: Float
  }

  type FundRequestResult {
    request: FundRequest
    childBalance: Float
    parentBalance: Float
  }

  type Child {
    id: ID!
    username: String
    balance: Float
    role: String
  }

  type Query {
    getHistory(userId: ID!): [Transaction]
    getRequests(status: String): [FundRequest]
    getMyRequests(userId: ID!): [FundRequest]
    getPendingRequests: [FundRequest]
    getBalance(userId: ID!): Float
    getChildren: [Child]
  }

  type Mutation {
    addTransaction(title: String, amount: Float, type: String, userId: ID!): TransactionResult
    createFundRequest(title: String, description: String, amount: Float, deadline: String, requesterId: ID!, requesterName: String): FundRequest
    approveRequest(requestId: ID!, parentId: ID!): FundRequestResult
    rejectRequest(requestId: ID!): FundRequest
    deleteFundRequest(requestId: ID!, userId: ID!): Boolean
  }

  type Subscription {
    requestUpdated: FundRequest
  }
`;

// --- RESOLVERS ---
const resolvers = {
  Query: {
    getHistory: async (_, { userId }) => {
      const [rows] = await pool.query(
        'SELECT id, user_id as userId, title, amount, type, created_at as date FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        date: r.date ? new Date(r.date).toISOString() : new Date().toISOString()
      }));
    },
    getRequests: async (_, { status }) => {
      let query = 'SELECT id, requester_id as requesterId, requester_name as requesterName, title, description, amount, deadline, status, created_at as createdAt FROM fund_requests';
      let params = [];
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY created_at DESC';
      const [rows] = await pool.query(query, params);
      return rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : null
      }));
    },
    getMyRequests: async (_, { userId }) => {
      const [rows] = await pool.query(
        'SELECT id, requester_id as requesterId, requester_name as requesterName, title, description, amount, deadline, status, created_at as createdAt FROM fund_requests WHERE requester_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : null
      }));
    },
    getPendingRequests: async () => {
      const [rows] = await pool.query(
        'SELECT id, requester_id as requesterId, requester_name as requesterName, title, description, amount, deadline, status, created_at as createdAt FROM fund_requests WHERE status = ? ORDER BY created_at DESC',
        ['PENDING']
      );
      return rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : null
      }));
    },
    getBalance: async (_, { userId }) => {
      return await getUserBalance(userId);
    },
    getChildren: async () => {
      return await getAllChildren();
    },
  },
  Mutation: {
    addTransaction: async (_, { title, amount, type, userId }) => {
      // Update balance in user-service
      const balanceResult = await updateUserBalance(userId, amount, type);

      // Save transaction to DB
      const [result] = await pool.query(
        'INSERT INTO transactions (user_id, title, amount, type) VALUES (?, ?, ?, ?)',
        [userId, title, amount, type]
      );

      const newTrans = {
        id: result.insertId,
        title,
        amount,
        type,
        userId,
        date: new Date().toISOString()
      };

      return { transaction: newTrans, newBalance: balanceResult.balance };
    },
    createFundRequest: async (_, args) => {
      const { title, description, amount, deadline, requesterId, requesterName } = args;

      const [result] = await pool.query(
        'INSERT INTO fund_requests (requester_id, requester_name, title, description, amount, deadline, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [requesterId, requesterName, title, description, amount, deadline || null, 'PENDING']
      );

      const newReq = {
        id: result.insertId,
        requesterId,
        requesterName,
        title,
        description,
        amount,
        deadline,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      pubsub.publish('REQUEST_UPDATED', { requestUpdated: newReq });

      // Notify all parents
      await notifyAllParents(
        'Pengajuan Dana Baru',
        `${requesterName} mengajukan dana Rp ${amount.toLocaleString('id-ID')} untuk ${title}`,
        'FUND_REQUEST'
      );

      return newReq;
    },
    approveRequest: async (_, { requestId, parentId }) => {
      // Get request from DB
      const [rows] = await pool.query('SELECT * FROM fund_requests WHERE id = ?', [requestId]);
      if (rows.length === 0) throw new Error('Request not found');

      const request = rows[0];

      // Check parent balance
      const parentBalance = await getUserBalance(parentId);
      if (parentBalance < parseFloat(request.amount)) {
        throw new Error('Saldo orang tua tidak mencukupi');
      }

      // Transfer funds
      const parentResult = await updateUserBalance(parentId, parseFloat(request.amount), 'EXPENSE');
      const childResult = await updateUserBalance(request.requester_id, parseFloat(request.amount), 'INCOME');

      // Update status in DB
      await pool.query('UPDATE fund_requests SET status = ? WHERE id = ?', ['APPROVED', requestId]);

      const updatedReq = {
        id: request.id,
        requesterId: request.requester_id,
        requesterName: request.requester_name,
        title: request.title,
        description: request.description,
        amount: parseFloat(request.amount),
        deadline: request.deadline,
        status: 'APPROVED',
        createdAt: request.created_at
      };

      pubsub.publish('REQUEST_UPDATED', { requestUpdated: updatedReq });

      // Notify child
      await sendNotification(
        request.requester_id,
        'Pengajuan Disetujui',
        `Pengajuan "${request.title}" sebesar Rp ${parseFloat(request.amount).toLocaleString('id-ID')} telah disetujui!`,
        'REQUEST_APPROVED'
      );

      return {
        request: updatedReq,
        childBalance: childResult.balance,
        parentBalance: parentResult.balance
      };
    },
    rejectRequest: async (_, { requestId }) => {
      const [rows] = await pool.query('SELECT * FROM fund_requests WHERE id = ?', [requestId]);
      if (rows.length === 0) throw new Error('Request not found');

      const request = rows[0];
      await pool.query('UPDATE fund_requests SET status = ? WHERE id = ?', ['REJECTED', requestId]);

      const updatedReq = {
        id: request.id,
        requesterId: request.requester_id,
        requesterName: request.requester_name,
        title: request.title,
        description: request.description,
        amount: parseFloat(request.amount),
        deadline: request.deadline,
        status: 'REJECTED',
        createdAt: request.created_at
      };

      pubsub.publish('REQUEST_UPDATED', { requestUpdated: updatedReq });

      // Notify child
      await sendNotification(
        request.requester_id,
        'Pengajuan Ditolak',
        `Pengajuan "${request.title}" sebesar Rp ${parseFloat(request.amount).toLocaleString('id-ID')} ditolak.`,
        'REQUEST_REJECTED'
      );

      return updatedReq;
    },
    deleteFundRequest: async (_, { requestId, userId }) => {
      const [result] = await pool.query(
        'DELETE FROM fund_requests WHERE id = ? AND requester_id = ? AND status = ?',
        [requestId, userId, 'PENDING']
      );
      return result.affectedRows > 0;
    }
  },
  Subscription: {
    requestUpdated: {
      subscribe: () => pubsub.asyncIterator(['REQUEST_UPDATED']),
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// --- SERVER SETUP ---
const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  plugins: [{
    async serverWillStart() {
      return {
        async drainServer() {
          await serverCleanup.dispose();
        },
      };
    },
  }],
});

async function startServer() {
  await server.start();
  app.use('/graphql', cors(), bodyParser.json(), expressMiddleware(server));
  httpServer.listen(3002, () => {
    console.log('Transaction Service (GraphQL + MySQL) ready at http://localhost:3002/graphql');
    console.log('DB Host:', process.env.DB_HOST);
  });
}

startServer();