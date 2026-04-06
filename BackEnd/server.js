require('dotenv').config(); // if you use .env
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const morgan = require('morgan');
const { optionalAuth } = require('./middleware/auth');
const { setSocketServer } = require('./utils/socket');

const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const userRoleRoutes = require('./routes/usertoleRouters'); // Đường dẫn tới file userroleRouter.js
const permissionRoutes = require('./routes/permissionRoutes'); // Đường dẫn tới file permissionRouter.js
const rolePermissionRoutes = require('./routes/rolePermissionRoutes'); // Đường dẫn tới file rolePermissionRouter.js
const categoriesRoutes = require('./routes/categoryRoutes'); // Đường dẫn tới file categoriesRouter.js
const coursesRoutes = require('./routes/courseRoutes'); // Đường dẫn tới file coursesRouter.js
const enrollmentRoutes = require('./routes/enrollmentRouters'); // Đường dẫn tới file enrollmentRouter.js
const authRoutes = require('./routes/authRoutes'); // Đường dẫn tới file authRouter.js
const orderRoutes = require('./routes/ordersRouter'); // Đường dẫn tới file ordersRouter.js
const orderDetailRoutes = require('./routes/orderdetailRouter'); // Đường dẫn tới file orderdetailRouter.js
const lessonRoutes = require('./routes/lessonRoutes'); // Đường dẫn tới file lessonRoutes.js
const lessonProgressRoutes = require('./routes/lesson_progressRoutes'); // Đường dẫn tới file lesson_progressRoutes.js
const paymentRoutes = require('./routes/paymentRoutes');

// Function để tự động lấy địa chỉ IPv4 local
function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const ifName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 3000;
const hostname = getLocalIPv4();
const SECRET_KEY = process.env.SECRET_KEY || 'tri16102004';

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },
});

setSocketServer(io);

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    // Intentionally kept silent to avoid noisy logs in development.
  });
});

app.use(cors({
  // origin: 'http://your-allowed-origin', // restrict in production
}));
app.use(express.json());
app.use(morgan('dev'));
app.use(optionalAuth);

// serve static
app.use('/videos', express.static(path.join(__dirname, 'src', 'assets', 'videos')));
app.use('/images', express.static(path.join(__dirname, 'src', 'assets', 'img')));

// Định nghĩa các route
app.use('/api', userRoutes);
app.use('/api', roleRoutes);
app.use('/api', userRoleRoutes);
app.use('/api', permissionRoutes);
app.use('/api', rolePermissionRoutes);
app.use('/api', categoriesRoutes);
app.use('/api', coursesRoutes);
app.use('/api', enrollmentRoutes);
app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', orderDetailRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/lesson-progress', lessonProgressRoutes);
app.use('/api', paymentRoutes);

// API ping để test connection
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', serverIP: hostname, timestamp: new Date().toISOString() });
});

// Global error handler (example)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message, error: message });
});

// Chạy server
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://${hostname}:${port} (listening on 0.0.0.0:${port})`);
});
