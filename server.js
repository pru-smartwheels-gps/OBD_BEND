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
   // console.log('📤 Raw data buffer (formatted):', formatted);
  
   const parsed = parse(example);
   console.log('✅ Parsed message:\n', parsed);
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


/// parsing logic
function hexToBytes(hex) {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  const result = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    result.push(parseInt(cleaned.substr(i, 2), 16));
  }
  return new Uint8Array(result);
}

function readWord(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readDWord(bytes, offset) {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  );
}

function readBytes(bytes, offset, length) {
  return bytes.slice(offset, offset + length);
}

function readBcd(bytes, offset, length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[offset + i];
    const high = (byte >> 4) & 0x0F;
    const low = byte & 0x0F;
    result += `${high}${low}`;
  }
  return result.replace(/^0+(?!$)/, ''); // Remove leading 0s
}

function readString(bytes, offset, length) {
  const sub = bytes.slice(offset, offset + length);
  try {
    return new TextDecoder('utf-8').decode(sub);
  } catch {
    return new TextDecoder('latin1').decode(sub);
  }
}

function calculateChecksum(bytes) {
  return bytes.reduce((checksum, b) => checksum ^ b, 0);
}

function unescape(bytes) {
  const result = [];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x7d) {
      if (i + 1 < bytes.length) {
        if (bytes[i + 1] === 0x01) {
          result.push(0x7d);
          i++;
        } else if (bytes[i + 1] === 0x02) {
          result.push(0x7e);
          i++;
        } else {
          result.push(0x7d);
        }
      }
    } else {
      result.push(bytes[i]);
    }
  }
  return new Uint8Array(result);
}

function parseHeader(bytes) {
  let offset = 0;
  const messageId = readWord(bytes, offset);
  offset += 2;

  const bodyProps = readWord(bytes, offset);
  offset += 2;

  const terminalMobileNo = readBcd(bytes, offset, 6);
  offset += 6;

  const serialNo = readWord(bytes, offset);
  offset += 2;

  let packetItems = null;
  if ((bodyProps >> 13) & 0x01) {
    const totalPackets = readWord(bytes, offset);
    offset += 2;
    const sequenceNo = readWord(bytes, offset);
    offset += 2;
    packetItems = { totalPackets, sequenceNo };
  }

  const header = {
    messageId,
    messageBodyProperties: bodyProps,
    terminalMobileNo,
    messageSerialNo: serialNo,
    packetItems
  };

  return { header, offset };
}

function parseMessageBody(header, bytes) {
  let offset = 0;

  if (header.messageId === 0x0100) {
    const provincialId = readWord(bytes, offset);
    offset += 2;

    const cityId = readWord(bytes, offset);
    offset += 2;

    const manufacturerId = readBytes(bytes, offset, 5);
    offset += 5;

    const terminalModels = readBytes(bytes, offset, 8);
    offset += 8;

    const terminalId = readBytes(bytes, offset, 7);
    offset += 7;

    const licensePlateColor = bytes[offset++];
    const licensePlate = readString(bytes, offset, bytes.length - offset);

    return {
      type: 'TerminalRegisterMessage',
      messageId: `0x${header.messageId.toString(16).padStart(4, '0')}`,
      serialNo: header.messageSerialNo,
      terminalMobileNo: header.terminalMobileNo,
      provincialId,
      cityId,
      manufacturerId: [...manufacturerId].map(b => b.toString(16).padStart(2, '0')).join(''),
      terminalModels: [...terminalModels].map(b => b.toString(16).padStart(2, '0')).join(''),
      terminalId: [...terminalId].map(b => b.toString(16).padStart(2, '0')).join(''),
      licensePlateColor,
      licensePlate
    };
  }

  return null;
}

function parse(hexString) {
  const message = hexToBytes(hexString);

  if (message[0] !== 0x7e || message[message.length - 1] !== 0x7e) {
    throw new Error('Invalid message framing.');
  }

  const escaped = message.slice(1, message.length - 1);
  const unescaped = unescape(escaped);

  if (unescaped.length < 13) {
    throw new Error('Unescaped message too short.');
  }

  const receivedChecksum = unescaped[unescaped.length - 1];
  const data = unescaped.slice(0, unescaped.length - 1);
  const calculated = calculateChecksum(data);

  if (receivedChecksum !== calculated) {
    throw new Error(`Checksum mismatch. Received: 0x${receivedChecksum.toString(16)}, Expected: 0x${calculated.toString(16)}`);
  }

  const { header, offset } = parseHeader(data);
  const body = data.slice(offset);
  return parseMessageBody(header, body);
}
