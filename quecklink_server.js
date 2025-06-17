import net from 'net';
import dotenv from 'dotenv';
import queclink from 'queclink-parser';
import { frontendSocket, frontendServer } from './flutter-client.js';

// Load environment variables
dotenv.config();
// === Device-facing GS22 socket ===
const DEVICE_PORT = process.env.DEVICE_PORT || 9001;

// === Environment configuration ===
const NODE_ENV = process.env.NODE_ENV || 'development';
const SEND_TEST_DATA = process.env.SEND_TEST_DATA === 'true' || NODE_ENV === 'development';

// === GS22 GPS Device TCP Server ===
const deviceServer = net.createServer((socket) => {
  console.log('✅ GS22 device connected');
  console.log('🔌 Socket info:', {
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    localAddress: socket.localAddress,
    localPort: socket.localPort
  });

  socket.on('connect', () => {
    console.log('🔗 GS22 socket connect event triggered');
  });

  socket.on('data', (data) => {   
    const raw = data.toString();
    const formatted = data.toString('hex').match(/.{1,2}/g).join(' ');
    console.log('📤 Raw data buffer (complete):', raw);
    console.log('⏰ Timestamp:', new Date().toISOString());

    try {
      const parsedData = queclink.parse(data);
      console.log('✅ Parsed message:\n', JSON.stringify(parsedData, null, 2));
      console.log('='.repeat(50) + '\n');

      if (frontendSocket) {
        frontendSocket.write(JSON.stringify({
          raw: raw,
          hex: formatted,
          parsed: parsedData
        }));
        console.log('📤 Data forwarded to Flutter client');
      } else {
        console.log('⚠️ No Flutter client connected to forward data');
      }
    } catch (e) {
      console.error('Parser Error:', e);
      console.log('='.repeat(50) + '\n');
    }
  });
});

deviceServer.listen(DEVICE_PORT, () => {
  console.log(`🚀 GS22 TCP server running on port ${DEVICE_PORT}`);
});