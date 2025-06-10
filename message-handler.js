import { Buffer } from 'buffer';

export class MessageHandler {
    static parseMessage(buffer) {
        const messageId = buffer.readUInt16BE(0);
        const simNumber = buffer.slice(4, 10).toString('hex');
        const serialNo = buffer.readUInt16BE(10);
        const body = buffer.slice(12, -1);
        return { messageId, simNumber, serialNo, body };
      }
  static handleDeviceMessage(socket, data, { unescapeBuffer }) {
    // Validate message framing
    if (data[0] !== 0x7e || data[data.length - 1] !== 0x7e) return;

    const raw = data.toString('hex');
    const stripped = data.slice(1, -1);
    const unescaped = unescapeBuffer(stripped);

    const { messageId, simNumber, serialNo, body } = parseMessage(unescaped);
    const simBuffer = unescaped.slice(4, 10);
    
    console.log('📦 Parsed Message Details:');
    console.log('  - Message ID:', `0x${messageId.toString(16)}`);
    console.log('  - SIM Number:', simNumber);
    console.log('  - Serial Number:', serialNo);
    console.log('  - Message Body:', body);
    console.log('  - SIM Buffer:', simBuffer.toString('hex'));

    console.log(`📤 Received MsgID: 0x${messageId.toString(16)} from SIM: ${simNumber}`);

    switch (messageId) {
      case 0x0100:
        return this.handleRegister(socket, simBuffer, serialNo);

      case 0x0102:
        return this.handleAuth(socket, simBuffer, serialNo);

      case 0x0002:
        return this.handleHeartbeat(socket, simBuffer, serialNo);

      case 0x0200:
        return this.handleLocationReport(socket, simBuffer, serialNo);

      default:
        console.log(`[UNKNOWN MSG] ID: 0x${messageId.toString(16)}`);
    }
  }

  static handleRegister(socket, simBuffer, serialNo) {
    console.log(`[REGISTER] Serial: ${serialNo}`);
    const authCode = Buffer.from("123456", "ascii");
    const regResponse = Buffer.alloc(3 + authCode.length);
    regResponse.writeUInt16BE(serialNo, 0);
    regResponse.writeUInt8(0, 2);
    authCode.copy(regResponse, 3);
    sendResponse(socket, 0x8100, simBuffer, serialNo, regResponse);
  }

  static handleAuth(socket, simBuffer, serialNo) {
    console.log(`[AUTH]`);
    const authRes = Buffer.alloc(5);
    authRes.writeUInt16BE(serialNo, 0);
    authRes.writeUInt16BE(0x0102, 2);
    authRes.writeUInt8(0, 4);
    sendResponse(socket, 0x8001, simBuffer, serialNo, authRes);
  }

  static handleHeartbeat(socket, simBuffer, serialNo) {
    console.log(`[HEARTBEAT]`);
    const hb = Buffer.alloc(5);
    hb.writeUInt16BE(serialNo, 0);
    hb.writeUInt16BE(0x0002, 2);
    hb.writeUInt8(0, 4);
    sendResponse(socket, 0x8001, simBuffer, serialNo, hb);
  }

  static handleLocationReport(socket, simBuffer, serialNo) {
    console.log(`[LOCATION REPORT]`);
    sendResponse(socket, 0x8001, simBuffer, serialNo, Buffer.from([0, 2, 0]));
  }

  static sendResponse(socket, messageId, simBuffer, serialNo, bodyBuffer) {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(messageId, 0);          // Message ID
    header.writeUInt16BE(bodyBuffer.length, 2);  // Message body property
    simBuffer.copy(header, 4);                   // SIM
    header.writeUInt16BE(serialNo, 10);          // Serial No
  
    const fullMessage = Buffer.concat([header, bodyBuffer]);
    const checksum = Buffer.from([calculateChecksum(fullMessage)]);
  
    let escapedBody = Buffer.concat([fullMessage, checksum]);
    escapedBody = escapeBuffer(escapedBody);
  
    const finalPacket = Buffer.concat([
      Buffer.from([START_END_BYTE]),
      escapedBody,
      Buffer.from([START_END_BYTE]),
    ]);
  
    socket.write(finalPacket);
  }
}