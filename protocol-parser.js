// Data type readers
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
  return bcdString.startsWith('0') && bcdString.length > 1 ? bcdString.substring(1) : bcdString;
}

function readString(data, offset, length) {
  const bytes = data.subarray(offset, offset + length);
  try { return new TextDecoder('utf-8').decode(bytes); }
  catch (e) { return new TextDecoder('latin1').decode(bytes); }
}

class MessageHeader {
  constructor(messageId, messageBodyProperties, terminalMobileNo, messageSerialNo, packetItems = null) {
    this.messageId = messageId;
    this.messageBodyProperties = messageBodyProperties;
    this.terminalMobileNo = terminalMobileNo;
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
      `  Terminal Mobile No: ${this.header.terminalMobileNo},\n` +
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
    const terminalMobileNo = readBcd(payload, offset, 6); offset += 6;
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
    return { header, messageBodyAndChecksum, headerLength: messageContentStart, expectedBodyLength: messageBodyLength };
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

// Export the classes and utility functions
export {
  ProtocolParser,
  ProtocolMessage,
  TerminalRegisterMessage,
  MessageHeader,
  MessagePacketPackageItems,
  hexToBytes
};