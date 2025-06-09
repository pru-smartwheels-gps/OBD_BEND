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
   console.log('⏰ Timestamp:', new Date().toISOString());
 

   const parser = new ProtocolParser();

   try {
     const rawMessage = hexToBytes(raw);
     const parsedMessage = parser.parse(rawMessage);
 
     if (parsedMessage instanceof TerminalRegisterMessage) {
           console.log('✅ Parsed message:\n', parsedMessage.toString());
  
    
    
     } else {
       console.log('\nJavaScript: Failed to parse message or unsupported message type for the provided string.');
     }
   } catch (e) {
     console.error('JavaScript Error:', e);
   }
   console.log('='.repeat(50) + '\n');


    // Uncomment this line to enable parsing
    // const parsed = parseGS22LocationPacket(hexStr);
    // console.log('📤 Parsed:', parsed);

    // if (frontendSocket) {
    //   frontendSocket.write(JSON.stringify({raw: raw, hex: formatted}));
    //   console.log('📤 Data forwarded to Flutter client');
    // } else {
    //   console.log('⚠️ No Flutter client connected to forward data');
    // }
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


////////
//parsing logic


// --- Helper Functions for Data Types ---
// (Copy-paste these from the previous JavaScript parser response if you run this in a new file,
// ensure the full ProtocolParser and message classes are present)

// Data type readers (updated readBcd)
function readByte(data, offset) { return data[offset]; }
function readWord(data, offset) { return (data[offset] << 8) | data[offset + 1]; }
function readDWord(data, offset) { return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]; }
function readBytes(data, offset, length) { return data.subarray(offset, offset + length); }

function readBcd(data, offset, length) {
  let bcdString = '';
  for (let i = 0; i < length; i++) {
    const byte = data[offset + i];
    const highNibble = (byte >> 4) & 0x0f;
    const lowNibble = byte & 0x0f;
    bcdString += `${highNibble}${lowNibble}`;
  }
  // Trim leading '0' if present and the string is not just "0"
  return bcdString.startsWith('0') && bcdString.length > 1 ? bcdString.substring(1) : bcdString;
}

function readString(data, offset, length) {
  const bytes = data.subarray(offset, offset + length);
  try { return new TextDecoder('utf-8').decode(bytes); }
  catch (e) { return new TextDecoder('latin1').decode(bytes); }
}

// Placeholder for full parser code - in a real scenario, this would be in a separate file
// or copied from the previous response.
class MessageHeader {
  constructor(messageId, messageBodyProperties, terminalMobileNo, messageSerialNo, packetItems = null) {
    this.messageId = messageId;
    this.messageBodyProperties = messageBodyProperties;
    this.terminalMobileNo = terminalMobileNo; // This will use the updated readBcd
    this.messageSerialNo = messageSerialNo;
    this.packetItems = packetItems;
  }
  get isSubpackaged() { return ((this.messageBodyProperties >> 13) & 0x01) === 1; }
  get messageBodyLength() { return this.messageBodyProperties & 0x3ff; }
  get dataEncryptionWay() { return (this.messageBodyProperties >> 10) & 0x07; }
}

class MessagePacketPackageItems {
  constructor(totalPackets, packetSequenceNo) {
    this.totalPackets = totalPackets;
    this.packetSequenceNo = packetSequenceNo;
  }
}

class ProtocolMessage {
  constructor(header) { this.header = header; }
}

class TerminalRegisterMessage extends ProtocolMessage {
  constructor(header, provincialId, cityId, manufacturerId, terminalModels, terminalId, licensePlateColor, licensePlate) {
    super(header);
    this.provincialId = provincialId;
    this.cityId = cityId;
    this.manufacturerId = manufacturerId;
    this.terminalModels = terminalModels;
    this.terminalId = terminalId;
    this.licensePlateColor = licensePlateColor;
    this.licensePlate = licensePlate;
  }
  toString() {
    return (
      `TerminalRegisterMessage(\n` +
      `  Message ID: 0x${this.header.messageId.toString(16).padStart(4, '0')},\n` +
      `  Serial No: ${this.header.messageSerialNo},\n` +
      `  Terminal Mobile No: ${this.header.terminalMobileNo},\n` + // This will now be trimmed
      `  Provincial ID: 0x${this.provincialId.toString(16).padStart(4, '0')},\n` +
      `  City ID: 0x${this.cityId.toString(16).padStart(4, '0')},\n` +
      `  Manufacturer ID: ${Array.from(this.manufacturerId).map((b) => b.toString(16).padStart(2, '0')).join('')},\n` +
      `  Terminal Models: ${Array.from(this.terminalModels).map((b) => b.toString(16).padStart(2, '0')).join('')},\n` +
      `  Terminal ID: ${Array.from(this.terminalId).map((b) => b.toString(16).padStart(2, '0')).join('')},\n` +
      `  License Plate Color: ${this.licensePlateColor},\n` +
      `  License Plate: "${this.licensePlate}"\n` +
      `)`
    );
  }
}

class ProtocolParser {
  unescape(escapedBytes) {
    const unescaped = [];
    for (let i = 0; i < escapedBytes.length; i++) {
      if (escapedBytes[i] === 0x7d) {
        if (i + 1 < escapedBytes.length) {
          if (escapedBytes[i + 1] === 0x01) { unescaped.push(0x7d); i++; }
          else if (escapedBytes[i + 1] === 0x02) { unescaped.push(0x7e); i++; }
          else { unescaped.push(0x7d); }
        } else { unescaped.push(0x7d); }
      } else { unescaped.push(escapedBytes[i]); }
    }
    return new Uint8Array(unescaped);
  }

  calculateChecksum(data) {
    if (data.length === 0) return 0;
    let checksum = 0;
    for (const byte of data) { checksum ^= byte; }
    return checksum;
  }

  parseHeader(payload) {
    let offset = 0;
    const messageId = readWord(payload, offset); offset += 2;
    const messageBodyProperties = readWord(payload, offset); offset += 2;
    const messageBodyLength = messageBodyProperties & 0x3ff;
    const terminalMobileNo = readBcd(payload, offset, 6); offset += 6; // This will use the updated readBcd
    const messageSerialNo = readWord(payload, offset); offset += 2;

    let packetItems = null;
    if (((messageBodyProperties >> 13) & 0x01) === 1) {
      const totalPackets = readWord(payload, offset); offset += 2;
      const packetSequenceNo = readWord(payload, offset); offset += 2;
      packetItems = new MessagePacketPackageItems(totalPackets, packetSequenceNo);
    }
    const header = new MessageHeader(messageId, messageBodyProperties, terminalMobileNo, messageSerialNo, packetItems);
    const messageContentStart = offset;
    const messageBodyAndChecksum = payload.subarray(messageContentStart);
    return { header: header, messageBodyAndChecksum: messageBodyAndChecksum, headerLength: messageContentStart, expectedBodyLength: messageBodyLength, };
  }

  parseMessageBody(header, messageBodyBytes) {
    let offset = 0;
    switch (header.messageId) {
      case 0x0100: // Terminal Register
        const provincialId = readWord(messageBodyBytes, offset); offset += 2;
        const cityId = readWord(messageBodyBytes, offset); offset += 2;
        const manufacturerId = readBytes(messageBodyBytes, offset, 5); offset += 5;
        const terminalModels = readBytes(messageBodyBytes, offset, 8); offset += 8;
        const terminalId = readBytes(messageBodyBytes, offset, 7); offset += 7;
        const licensePlateColor = readByte(messageBodyBytes, offset); offset += 1;
        const licensePlateLength = messageBodyBytes.length - offset;
        const licensePlate = readString(messageBodyBytes, offset, licensePlateLength);
        return new TerminalRegisterMessage(header, provincialId, cityId, manufacturerId, terminalModels, terminalId, licensePlateColor, licensePlate);
      default: return null;
    }
  }

  parse(rawMessage) {
    if (rawMessage.length < 2 || rawMessage[0] !== 0x7e || rawMessage[rawMessage.length - 1] !== 0x7e) {
      console.error('Error: Message missing identity bits (0x7e) or too short.');
      return null;
    }
    const escapedPayload = rawMessage.subarray(1, rawMessage.length - 1);
    const unescapedPayload = this.unescape(escapedPayload);
    if (unescapedPayload.length < 13) {
      console.error('Error: Unescaped payload too short to contain header and checksum.');
      return null;
    }
    const receivedChecksum = unescapedPayload[unescapedPayload.length - 1];
    const dataForChecksum = unescapedPayload.subarray(0, unescapedPayload.length - 1);
    const calculatedChecksum = this.calculateChecksum(dataForChecksum);
    if (receivedChecksum !== calculatedChecksum) {
      console.error(`Error: Checksum mismatch. Received: 0x${receivedChecksum.toString(16)}, Calculated: 0x${calculatedChecksum.toString(16)}`);
      return null;
    }
    const { header, messageBodyAndChecksum, expectedBodyLength } = this.parseHeader(dataForChecksum);
    const actualMessageBodyBytes = messageBodyAndChecksum.subarray(0, messageBodyAndChecksum.length - 1);
    if (actualMessageBodyBytes.length !== expectedBodyLength) {
      console.warn(`Warning: Actual message body length (${actualMessageBodyBytes.length}) does not match expected length (${expectedBodyLength}) from header.`);
    }
    return this.parseMessageBody(header, actualMessageBodyBytes);
  }
}

// Function to convert hex string to Uint8Array
function hexToBytes(hex) {
  if (hex.length % 2 !== 0) {
    throw new Error("Input hex string must have an even length.");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// // // Main execution for JavaScript
// function runJsCode() {
//   const parser = new ProtocolParser();
//   const hexString = "160301007b0100007703037d3876d74cc29dc4515c951d5db9b69022e8b3d167b9b640128592a04ca97cbc00001ac02fc02bc011c007c013c009c014c00a0005002f0035c012000a01000034000500050100000000000a00080006001700180019000b00020100000d0010000e0401040302010203040105010601ff01000100";

//   try {
//     const rawMessage = hexToBytes(hexString);
//     const parsedMessage = parser.parse(rawMessage);

//     if (parsedMessage instanceof TerminalRegisterMessage) {
//       console.log('\nParsed JavaScript Message with trimmed Mobile No:');
//       console.log(parsedMessage.toString());
//     } else {
//       console.log('\nJavaScript: Failed to parse message or unsupported message type for the provided string.');
//     }
//   } catch (e) {
//     console.error('JavaScript Error:', e);
//   }
// }

// // Call the function to run the example
// runJsCode();