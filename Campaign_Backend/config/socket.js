const { Server } = require('socket.io');

let io;
const activeSockets = new Map(); // Maps mla_id -> socket.id

module.exports = {
  init: (server) => {
    io = new Server(server, { cors: { origin: "*" } });
    
    io.on('connection', (socket) => {
      // Authenticate socket hookup
      socket.on('register_session', (mlaId) => {
        activeSockets.set(Number(mlaId), socket.id);
      });

      socket.on('disconnect', () => {
        for (let [mlaId, socketId] of activeSockets.entries()) {
          if (socketId === socket.id) {
            activeSockets.delete(mlaId);
            break;
          }
        }
      });
    });
    return io;
  },
  getIo: () => {
    if (!io) throw new Error('Socket.io not initialized!');
    return io;
  },
  getActiveSockets: () => activeSockets
};