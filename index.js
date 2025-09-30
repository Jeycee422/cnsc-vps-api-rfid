require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const createError = require('http-errors');
const connectDB = require('./src/config/db');

const app = express();

// Security and basic middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Body parsers for JSON and raw text (scanner may send text/plain)
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ type: 'text/plain' }));

// Connect to database
connectDB();

// Routes
app.use('/api/rfid', require('./src/routes/rfid'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res, next) => {
  next(createError(404, 'Not Found'));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// 🚀 Important: do NOT call app.listen() in Vercel
module.exports = app;
