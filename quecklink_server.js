import net from 'net';
import dotenv from 'dotenv';
//import { frontendSocket, frontendServer } from './flutter-client.js';

import QueclinkParser from './parser.js';


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

  socket.on('error', (error) => {
    if (error.code === 'ECONNRESET') {
      console.log('📡 Client connection was reset:', socket.remoteAddress);
    } else {
      console.error('Socket error:', error);
    }
  });

  socket.on('close', () => {
    console.log('🔌 Client disconnected:', socket.remoteAddress);
  });

  socket.on('data', (data) => {   

    // Convert to Indian time (UTC+5:30)
    const date = new Date();
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    console.log('⏰ Timestamp (IST):', istTime.toISOString());
    
    try {
console.log(data.toString());
const parser = new QueclinkParser();
const parsedData = parser.parse(data);
console.log(parsedData);
      // if (frontendSocket) {
      //   try {
      //     frontendSocket.write(JSON.stringify({
      //       raw: raw,
      //       hex: formatted,
      //       parsed: parsedData
      //     }));
      //     console.log('📤 Data forwarded to Flutter client');
      //   } catch (err) {
      //     console.log('⚠️ Error forwarding data to Flutter client:', err.message);
      //   }
      // } else {
      //   console.log('⚠️ No Flutter client connected to forward data');
      // }
    } catch (e) {
      console.error('Parser Error:', e);
      console.log('='.repeat(50) + '\n');
    }
  });
});

deviceServer.on('error', (error) => {
  console.error('Server error:', error);
});

deviceServer.listen(DEVICE_PORT, () => {
  console.log(`🚀 GS22 TCP server running on port ${DEVICE_PORT}`);
});