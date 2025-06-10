import net from 'net';
import dotenv from 'dotenv';

import {
  ProtocolParser,
  ProtocolMessage,
  TerminalRegisterMessage,
  MessageHeader,
  MessagePacketPackageItems,
  hexToBytes
} from './protocol-parser.js';

import { MessageHandler } from './message-handler.js';

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
    const parser = new ProtocolParser();
    const raw  = data.toString('hex')
    const formatted =data.toString('hex').match(/.{1,2}/g).join(' ')
    console.log('📤 Raw data buffer (complete):', raw);

   console.log('⏰ Timestamp:', new Date().toISOString());
   MessageHandler.handleDeviceMessage(socket, data, {
    unescapeBuffer: parser.unescape
  });



   try {
     const rawMessage = hexToBytes(raw);
     const parsedMessage = parser.parse(rawMessage);
 
     if (parsedMessage instanceof TerminalRegisterMessage) {
           console.log('✅ Parsed message:\n', parsedMessage.toString());
  
           console.log('='.repeat(50) + '\n');
    
     } else {
       console.log('\nJavaScript: Failed to parse message or unsupported message type for the provided string.');
       console.log('='.repeat(50) + '\n');
     }
   } catch (e) {
     console.error('JavaScript Error:', e);
     console.log('='.repeat(50) + '\n');
   }
 
    if (frontendSocket) {
      frontendSocket.write(JSON.stringify({raw: raw, hex: formatted}));
      console.log('📤 Data forwarded to Flutter client');
    } else {
      console.log('⚠️ No Flutter client connected to forward data');
    }
  });

});


deviceServer.listen(DEVICE_PORT, () => {
  console.log(`🚀 GS22 TCP server running on port ${DEVICE_PORT}`);
});




// // // Main execution for JavaScript
// function runJsCode() {
//   const parser = new ProtocolParser();
//   const hexString = "7e0100002d0480500221711c7a0000000037303131325345472d3938383847000000000000000000000030303232313731003530303232313731f67e";

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