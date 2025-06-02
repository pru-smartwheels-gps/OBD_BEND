import net from 'net';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// === Client-facing Flutter socket ===
const CLIENT_PORT = process.env.CLIENT_PORT || 9500; // Flutter app will connect here
let frontendSocket = null;

// === Device-facing GS22 socket ===
const DEVICE_PORT = process.env.DEVICE_PORT || 9001;

// === Environment configuration ===
const NODE_ENV = process.env.NODE_ENV || 'development';
const SEND_TEST_DATA = process.env.SEND_TEST_DATA === 'true' || NODE_ENV === 'development';

// function parseGS22LocationPacket(hexString) {
//   const data = hexString.replace(/\s+/g, '').toUpperCase();
//   const bytes = data.match(/.{1,2}/g);
//   if (!bytes || bytes.length < 40) return { error: 'Invalid packet length' };

//   const latitude = parseInt(bytes.slice(18, 22).join(''), 16) / 1e6;
//   const longitude = parseInt(bytes.slice(22, 26).join(''), 16) / 1e6;
//   const altitude = parseInt(bytes.slice(26, 28).join(''), 16);
//   const speed = parseInt(bytes.slice(28, 30).join(''), 16) / 10;
//   const direction = parseInt(bytes.slice(30, 32).join(''), 16);
//   const timeBytes = bytes.slice(32, 38);
//   const timestamp = `20${timeBytes[0]}-${timeBytes[1]}-${timeBytes[2]} ${timeBytes[3]}:${timeBytes[4]}:${timeBytes[5]}`;

//   const mileage = bytes[38] === '01'
//     ? parseInt(bytes.slice(40, 44).join(''), 16) / 10
//     : null;

//   return {
//     latitude: latitude.toFixed(6),
//     longitude: longitude.toFixed(6),
//     altitude: `${altitude} m`,
//     speed: `${speed} km/h`,
//     direction,
//     timestamp,
//     mileage: mileage !== null ? `${mileage} km` : 'N/A'
//   };
// }

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

   
    
   
    const raw  = data.toString('hex')
    const formatted  =data.toString('hex').match(/.{1,2}/g).join(' ')
    console.log('📤 Raw data buffer (complete):', raw);
    console.log('📤 Raw data buffer (formatted):', formatted);
  


    // Uncomment this line to enable parsing
    // const parsed = parseGS22LocationPacket(hexStr);
    // console.log('📤 Parsed:', parsed);

    if (frontendSocket) {
      frontendSocket.write(JSON.stringify({raw: raw, hex: formatted}));
      console.log('📤 Data forwarded to Flutter client');
    } else {
      console.log('⚠️ No Flutter client connected to forward data');
    }
  });

  socket.on('end', () => {
    console.log('🔚 GS22 socket end event - client ended connection gracefully');
  });

  socket.on('close', (hadError) => {
    console.log('❌ GS22 socket close event - connection closed');
    console.log('🔍 Had error:', hadError);
  });

  socket.on('error', (error) => {
    console.log('💥 GS22 socket error event:', error.message);
    console.log('🔍 Error details:', error);
  });

  socket.on('timeout', () => {
    console.log('⏰ GS22 socket timeout event');
  });

  socket.on('drain', () => {
    console.log('💧 GS22 socket drain event - write buffer is empty');
  });

  socket.on('lookup', (err, address, family, host) => {
    console.log('🔍 GS22 socket lookup event:', { err, address, family, host });
  });
});

deviceServer.on('connection', (socket) => {
  console.log('🆕 New connection to GS22 server');
});

deviceServer.on('error', (error) => {
  console.log('💥 GS22 server error:', error.message);
});

deviceServer.on('close', () => {
  console.log('🔒 GS22 server closed');
});

deviceServer.on('listening', () => {
  console.log('👂 GS22 server listening event');
});

deviceServer.listen(DEVICE_PORT, () => {
  console.log(`🚀 GS22 TCP server running on port ${DEVICE_PORT}`);
});

//=== Frontend Flutter Client TCP Server ===
const frontendServer = net.createServer((socket) => {
  console.log('📲 Flutter frontend connected');
  console.log('🔌 Flutter socket info:', {
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    localAddress: socket.localAddress,
    localPort: socket.localPort
  });
  
  frontendSocket = socket;

  socket.on('connect', () => {
    console.log('🔗 Flutter socket connect event triggered');
  });

  socket.on('data', (data) => {
    console.log('📥 Flutter data event - received:', data.toString());
  });

  socket.on('end', () => {
    console.log('🔚 Flutter socket end event - client ended connection gracefully');
    frontendSocket = null;
  });

  socket.on('close', (hadError) => {
    console.log('❌ Flutter socket close event - connection closed');
    console.log('🔍 Had error:', hadError);
    frontendSocket = null;
  });

  socket.on('error', (error) => {
    console.log('💥 Flutter socket error event:', error.message);
    console.log('🔍 Error details:', error);
    frontendSocket = null;
  });

  socket.on('timeout', () => {
    console.log('⏰ Flutter socket timeout event');
  });

  socket.on('drain', () => {
    console.log('💧 Flutter socket drain event - write buffer is empty');
  });

  // Send test data only if enabled via environment variable

});

frontendServer.on('connection', (socket) => {
  console.log('🆕 New connection to Flutter server');
});

frontendServer.on('error', (error) => {
  console.log('💥 Flutter server error:', error.message);
});

frontendServer.on('close', () => {
  console.log('🔒 Flutter server closed');
});

frontendServer.on('listening', () => {
  console.log('👂 Flutter server listening event');
});

frontendServer.listen(CLIENT_PORT, () => {
  console.log(`🧭 Flutter TCP server ready on port ${CLIENT_PORT}`);
});
