const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const path = require('path');
const socketConfig = require('./config/socket');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const authRoutes = require('./routes/authRoutes');
const mlaRoutes = require('./routes/mlaRoutes');
const documentRoutes = require('./routes/documentRoutes');
const voterRoutes = require('./routes/voterRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Websockets via shared abstraction
socketConfig.init(server);

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
// Global Middlewares
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes Mapping
app.use('/api/auth', authRoutes);
app.use('/api/mlas', mlaRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/voters', voterRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server executing securely on port ${PORT}`);
});

// added