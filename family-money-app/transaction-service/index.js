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
const { PubSub } = require('graphql-subscriptions'); // Note: For prod use Redis

const pubsub = new PubSub();
const app = express();
const httpServer = createServer(app);

// --- DATA MOCK ---
let transactions = []; // History Uang
let fundRequests = []; // Pengajuan Dana

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
    status: String 
    requesterId: ID
  }

  type Query {
    getHistory(userId: ID!): [Transaction]
    getRequests(status: String): [FundRequest]
    getDashboardStats(userId: ID!): String
  }

  type Mutation {
    addTransaction(title: String, amount: Float, type: String, userId: ID!): Transaction
    createFundRequest(title: String, description: String, amount: Float, requesterId: ID!): FundRequest
    approveRequest(requestId: ID!, parentId: ID!): FundRequest
  }

  type Subscription {
    requestUpdated: FundRequest
  }
`;

// --- RESOLVERS ---
const resolvers = {
  Query: {
    getHistory: (_, { userId }) => transactions.filter(t => t.userId == userId),
    getRequests: (_, { status }) => status ? fundRequests.filter(r => r.status === status) : fundRequests,
    getDashboardStats: (_, { userId }) => "Logic hitung saldo/pengeluaran disini",
  },
  Mutation: {
    addTransaction: (_, args) => {
      const newTrans = { id: transactions.length + 1, ...args, date: new Date().toISOString() };
      transactions.push(newTrans);
      return newTrans;
    },
    createFundRequest: (_, args) => {
      const newReq = { id: fundRequests.length + 1, ...args, status: 'PENDING' };
      fundRequests.push(newReq);
      // Notify Parent (Realtime)
      pubsub.publish('REQUEST_UPDATED', { requestUpdated: newReq });
      return newReq;
    },
    approveRequest: (_, { requestId }) => {
      const reqIndex = fundRequests.findIndex(r => r.id == requestId);
      if(reqIndex > -1) {
        fundRequests[reqIndex].status = 'APPROVED';
        // Logic transfer saldo otomatis harusnya dipanggil disini (inter-service communication)
        pubsub.publish('REQUEST_UPDATED', { requestUpdated: fundRequests[reqIndex] });
        return fundRequests[reqIndex];
      }
      return null;
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
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});
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
    console.log(`Transaction Service (GraphQL) ready at http://localhost:3002/graphql`);
  });
}

startServer();