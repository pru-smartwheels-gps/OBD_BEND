import net from 'net';

let frontendSocket = null;
// === Client-facing Flutter socket ===
const CLIENT_PORT = process.env.CLIENT_PORT || 9500; // Fl

// Create TCP server for Flutter client
const frontendServer = net.createServer((socket) => {
  console.log('📲 Flutter frontend connected');
  console.log('🔌 Flutter socket info:', {
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    localAddress: socket.localAddress,
    localPort: socket.localPort
  });
  
  frontendSocket = socket;

  // Handle socket events
  socket.on('data', (data) => {
    console.log('📱 Received data from Flutter client:', data.toString());
  });

  socket.on('end', () => {
    console.log('📴 Flutter client disconnected');
    frontendSocket = null;
  });

  socket.on('error', (error) => {
    console.error('❌ Flutter client socket error:', error);
    frontendSocket = null;
  });
});

frontendServer.listen(CLIENT_PORT, () => {
  console.log(`🧭 Flutter TCP server ready on port ${CLIENT_PORT}`);
});

// Export for use in other files
export { frontendSocket, frontendServer };