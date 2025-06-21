/**
 * @fileoverview Queclink GV500MAP Protocol Parser.
 * This script provides a comprehensive parser for various ASCII and HEX
 * report messages and events defined in the GV500MAP @Track Air Interface Protocol V5.00 document.
 */

class QueclinkParser {

    constructor() {
        // Mapping of ASCII command prefixes to their parsing functions
        this.asciiParsers = {
            'GTTOW': this.parsePositionRelatedReport, //
            'GTGEO': this.parsePositionRelatedReport,  //
            'GTSPD': this.parsePositionRelatedReport, //
            'GTRTL': this.parsePositionRelatedReport, //
            'GTDOG': this.parsePositionRelatedReport, //
            'GTIGL': this.parsePositionRelatedReport, //
            'GTVGL': this.parsePositionRelatedReport,  //

            'GTEPS': this.parseGTEPS, // 
            'GTFRI': this.parseGTFRI,  //
            'GTALS': this.parseGTALS,  //

          
            
          
            'GTHBM': this.parsePositionRelatedReport,
            'GTGES': this.parseGTGES, // 
            'GTINF': this.parseGTINF, //
            'GTGPS': this.parseGTGPS, //
            'GTALM': this.parseGTALM, //
            'GTCID': this.parseGTCID, //
            'GTCSQ': this.parseGTCSQ, //
            'GTVER': this.parseGTVER, //
            'GTBAT': this.parseGTBAT, //
            'GTTMZ': this.parseGTTMZ, //
            'GTGSV': this.parseGTGSV, //
            'GTATI': this.parseGTATI, //
            'GTAIF': this.parseGTAIF, //
            'GTBTI': this.parseGTBTI, //
            'GTPNA': this.parseSimpleEventReport,//
            'GTPFA': this.parseSimpleEventReport,//
            'GTPDP': this.parseSimpleEventReport,//
            'GTMPN': this.parseCommonEventReport,//
            'GTMPF': this.parseCommonEventReport,//
            'GTBTC': this.parseCommonEventReport,//
            'GTSTC': this.parseCommonEventReport, //
            'GTBPL': this.parseGTBPL, //
            'GTSTT': this.parseGTSTT, //
            'GTIGN': this.parseGTIGN, //
            'GTIGF': this.parseGTIGF, //

            'GTIDN': this.parseGTIDN_GTSTR_GTSTP_GTLSP, //
            'GTSTR': this.parseGTIDN_GTSTR_GTSTP_GTLSP,//
            'GTSTP': this.parseGTIDN_GTSTR_GTSTP_GTLSP,//
            'GTLSP': this.parseGTIDN_GTSTR_GTSTP_GTLSP,//
            


            'GTIDF': this.parseGTIDF,//

            'GTGSM': this.parseGTGSM, //
            
            'GTGSS': this.parseGTGSS, //
            'GTCRA': this.parseGTCRA,
            'GTASC': this.parseGTASC, //
            'GTRMD': this.parseGTRMD, //
            'GTUPC': this.parseGTUPC, //
            'GTEUC': this.parseGTEUC, //
            'GTBSF': this.parseGTBSF, //
            'GTSVR': this.parseGTSVR, //
            'GTOBD': this.parseGTOBD, //
            'GTOPN': this.parseGTOPN, //
            'GTOPF': this.parseGTOPF, //
            'GTJES': this.parseGTJES, //
            'GTOER': this.parseGTOER, //
            'GTOSM': this.parseGTOSM, //
            'GTVGN': this.parseGTVGN_GTVGF, // 
            'GTVGF': this.parseGTVGN_GTVGF, // Ensure GTVGF is correctly mapped
            'GTBAA': this.parseGTBAA, // 
            // Special handling for buffered messages, they start with +BUFF:
            'BUFF': this.parseBufferReport,
        };

        // Mapping of HEX message headers to their parsing functions
        this.hexParsers = {
            '2B41434B': this.parseHEXACK, // +ACK
            '2B525350': this.parseHEXRSP, // +RSP
            '2B455654': this.parseHEXEVT, // +EVT
            '2B494E46': this.parseHEXINF, // +INF
            '2B484244': this.parseHEXHBD, // +HBD
            '2B435244': this.parseHEXCRD, // +CRD
            '2B4F4244': this.parseHEXOBD, // +OBD
            '2B415449': this.parseHEXATI, // +ATI (Not explicitly listed as a header, but +RESP:GTATI exists)
        };
    }

    /**
     * Main parsing method to determine message type (ASCII or HEX) and dispatch to the correct parser.
     * @param {string} message The raw message string to parse.
     * @returns {object|null} The parsed message object or null if parsing fails.
     */
    parse(message) {
        if (!message || typeof message !== 'string') {
            console.error('Invalid message input: must be a non-empty string.');
            return null;
        }

        // Remove leading/trailing whitespace and the '$' tail character if present
        const cleanedMessage = message.trim().endsWith('$') ? message.trim().slice(0, -1) : message.trim();

        // Check for ASCII format
        if (cleanedMessage.startsWith('+RESP:') || cleanedMessage.startsWith('+ACK:') || cleanedMessage.startsWith('+BUFF:')) {
            return this.parseASCII(cleanedMessage);
        }

        // Check for HEX format (assuming it starts with "2B" which is HEX for '+')
        // And is longer than a typical ASCII message that might start with '+'
        if (cleanedMessage.match(/^[0-9A-Fa-f]+$/) && cleanedMessage.length > 10) { // Simple check for hex string
            return this.parseHEX(cleanedMessage);
        }

        console.warn('Unknown message format or invalid message:', message);
        return null;
    }

    /**
     * Parses ASCII formatted messages.
     * @param {string} message The cleaned ASCII message string.
     * @returns {object|null} The parsed message object.
     */
    parseASCII(message) {
        const parts = message.split(',');
        const header = parts[0]; // e.g., '+RESP:GTTOW' or '+ACK:GTBSI' or '+BUFF:GTFRI'
        const typeMatch = header.match(/^\+(RESP|ACK|BUFF):([A-Z0-9]+)$/);

        if (!typeMatch) {
            console.error('Malformed ASCII header:', header);
            return null;
        }

        const messagePrefix = typeMatch[1]; // 'RESP', 'ACK', 'BUFF'
        let commandType = typeMatch[2]; // e.g., 'GTTOW', 'GTBSI', 'GTFRI'

        let parserFn;

        if (messagePrefix === 'BUFF') {
            // For buffered messages, the commandType is after +BUFF: (e.g., GTFRI)
            // We need to re-use the standard RESP parser for that commandType
            parserFn = this.asciiParsers['BUFF'];
            // Pass the original commandType (e.g., GTFRI) as a parameter to the buffer parser
        } else {
            parserFn = this.asciiParsers[commandType];
        }

        if (parserFn) {
            try {
                // Pass the remaining parts (parameters) and the raw message for context
                const result = parserFn.call(this, parts.slice(1), messagePrefix, commandType);
                return {
                    originalMessage: message + '$', // Add back the tail for the original message
                    messageType: messagePrefix,
                    command: commandType,
                    parsedData: result
                };
            } catch (e) {
                console.error(`Error parsing ASCII message ${commandType}:`, e, message);
                return null;
            }
        } else {
            console.warn(`No parser found for ASCII command type: ${commandType}. Message: ${message}`);
            return null;
        }
    }

    /**
     * Parses HEX formatted messages.
     * @param {string} message The cleaned HEX message string.
     * @returns {object|null} The parsed message object.
     */
    parseHEX(message) {
        // HEX messages start with a 4-byte header (e.g., '2B525350' for '+RSP')
        const headerHex = message.substring(0, 8).toUpperCase(); // Get the first 8 hex characters (4 bytes)
        const parserFn = this.hexParsers[headerHex];

        if (parserFn) {
            try {
                // Pass the entire hex message string to the specific HEX parser
                const result = parserFn.call(this, message);
                return {
                    originalMessage: message,
                    messageType: 'HEX',
                    command: Object.keys(this.hexParsers).find(key => this.hexParsers[key] === parserFn), // Find the original command string
                    parsedData: result
                };
            } catch (e) {
                console.error(`Error parsing HEX message with header ${headerHex}:`, e, message);
                return null;
            }
        } else {
            console.warn(`No parser found for HEX message header: ${headerHex}. Message: ${message}`);
            return null;
        }
    }


    // --- Utility Functions ---

    /**
     * Converts a string value to a number. Returns null if the value is empty or cannot be parsed.
     * @param {string} value The string to convert.
     * @param {number} radix The radix (base) for parsing integers (e.g., 10 for decimal, 16 for hex).
     * @param {boolean} isFloat If true, parses as float, otherwise as integer.
     * @returns {number|null} The parsed number or null.
     */
    _toNumber(value, radix = 10, isFloat = false) {
        if (value === '' || value === undefined || value === null) {
            return null;
        }
        const parsed = isFloat ? parseFloat(value) : parseInt(value, radix);
        return isNaN(parsed) ? null : parsed;
    }

    _toNumberFromHex(value,isFloat = false ) {
        if (value === '' || value === undefined || value === null) {
            return null;
        }
        const parsed = this._toNumber(value,16,isFloat)
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Converts a string value to a string. Returns null if the value is empty.
     * @param {string} value The string value.
     * @returns {string|null} The string or null.
     */
    _toString(value) {
        return (value === '' || value === undefined || value === null) ? null : String(value);
    }

    /**
     * Maps CSQ RSSI value to signal strength in dBm according to Queclink specification.
     * @param {number} rssi The RSSI value (0-31, 99)
     * @returns {string} The signal strength description
     */
    //verified
    _mapCsqRssiToDbm(rssi) { 
        if (rssi === 0) return '<-113 dBm';
        if (rssi === 1) return '-111 dBm';
        if (rssi >= 2 && rssi <= 30) {
            // Linear mapping: 2 maps to -109, 30 maps to -53
            // Formula: dBm = -109 + (rssi - 2) * ((-53 - (-109)) / (30 - 2))
            const dbm = -109 + (rssi - 2) * (56 / 28);
            return `${Math.round(dbm)} dBm`;
        }
        if (rssi === 31) return '>-51 dBm';
        if (rssi === 99) return 'Unknown';
        return 'Invalid RSSI';
    }

    /**
     * Maps CSQ BER value to quality description.
     * @param {number} ber The BER value (0-7, 99)
     * @returns {string} The signal quality description
     */
    //verified
    _mapCsqBer(ber) {
        if (ber >= 0 && ber <= 7) return `BER ${ber}/7`;
        if (ber === 99) return 'Unknown signal strength';
        return 'Invalid BER';
    }

    /**
     * Maps network type number to description.
     * @param {number} networkType The network type number.
     * @returns {string} The network type description.
     */
    //verified
    _mapNetworkType(networkType) {
        const networkTypes = {
            0: 'Unregistered',
            1: 'EGPRS',
            2: 'LTE'
        };
        return networkTypes[networkType] || 'Unknown';
    }

    /**
     * Maps Bluetooth state number to description.
     * @param {number} state The Bluetooth state number.
     * @returns {string} The Bluetooth state description.
     */
    //verified
    _mapBluetoothState(state) {
        const states = {
            0: 'Not connected',
            1: 'Connected'
        };
        return states[state] || 'Unknown';
    }

    /**
     * Maps Bluetooth role number to description.
     * @param {number} role The role number.
     * @returns {string} The role description.
     */
    //verified
    _mapBluetoothRole(role) {
        const roles = {
            0: 'Master',
            1: 'Slave'
        };
        return roles[role] || 'Unknown';
    }

    /**
     * Maps real-time state number to description.
     * @param {number} state The real-time state number.
     * @returns {string} The real-time state description.
     */
    //verified
    _mapRealTimeState(state) {
        const states = {
            0: 'Real time data',
            1: 'Historical data'
        };
        return states[state] || 'Unknown';
    }

    /**
     * Parses Ghost status bitwise mask.
     * @param {string} statusHex The status in hex format.
     * @returns {object} The parsed status details.
     */
    //verified
    _parseGhostStatus(statusHex) {
        if (!statusHex) return {};
        
        const status = parseInt(statusHex, 16);
        return {
            gnssFixFailure: !!(status & (1 << 1)),
            detectedFakeCell: !!(status & (1 << 2)),
            batteryLowWarning: !!(status & (1 << 3)),
            rtcTimeFailure: !!(status & (1 << 4)),
            simCardError: !!(status & (1 << 5)),
            gsmUnavailable: !!(status & (1 << 6)),
            gprsUnavailable: !!(status & (1 << 7)),
            serverConnectionFailure: !!(status & (1 << 8)),
            mcuBbCommunicationError: !!(status & (1 << 15))
        };
    }

    /**
     * Parses a date-time string in BernadotYYMMDDHHMMSS format to a Date object.
     * @param {string} dtString The date-time string (14 characters).
     * @returns {Date|null} A Date object or null if invalid.
     */
    //verified
    _parseDateTime(dtString) {
        if (dtString && dtString.length === 14) {
            try {
                const year = parseInt(dtString.substring(0, 4), 10);
                const month = parseInt(dtString.substring(4, 6), 10) - 1; // Month is 0-indexed
                const day = parseInt(dtString.substring(6, 8), 10);
                const hour = parseInt(dtString.substring(8, 10), 10);
                const minute = parseInt(dtString.substring(10, 12), 10);
                const second = parseInt(dtString.substring(12, 14), 10);
                const date = new Date(year, month, day, hour, minute, second);
                // Basic validation for invalid dates like Feb 30th
                if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                    return date;
                }
            } catch (e) {
                // Ignore parsing errors and return null
            }
        }
        return null;
    }

    /**
     * Parses a time zone offset string into components.
     * @param {string} offset The time zone offset (e.g., "+0800", "-0530")
     * @returns {object} Parsed offset with sign, hours, and minutes
     */
    _parseTimeZoneOffset(offset) {
        if (!offset || offset.length !== 5) {
            return {
                sign: '+',
                hours: 0,
                minutes: 0,
                totalMinutes: 0
            };
        }
        
        const sign = offset.charAt(0);
        const hours = parseInt(offset.substring(1, 3), 10);
        const minutes = parseInt(offset.substring(3, 5), 10);
        const totalMinutes = (sign === '+' ? 1 : -1) * (hours * 60 + minutes);
        
        return {
            sign: sign,
            hours: hours,
            minutes: minutes,
            totalMinutes: totalMinutes
        };
    }

    /**
     * Parses a hexadecimal string into a signed decimal number (two's complement).
     * @param {string} hexStr The hexadecimal string (e.g., "FFFF" for -1).
     * @param {number} bitLength The total bit length (e.g., 16 for a 2-byte hex).
     * @returns {number} The signed decimal value.
     */
    _hexToSignedDecimal(hexStr, bitLength) {
        if (!hexStr) return 0;
        const num = parseInt(hexStr, 16);
        const maxVal = Math.pow(2, bitLength);
        const halfMax = Math.pow(2, bitLength - 1);

        if (num >= halfMax) {
            return num - maxVal;
        }
        return num;
    }

    /**

    * Parses the Supported PIDs hex value into detailed parameter availability information.
     * @param {string} supportedPidsHex - 8-character hex string representing the 32-bit bitmask
     * @returns {object} Object containing parsed PID support information
     */
    _parseSupportedPids(supportedPidsHex) {
        if (!supportedPidsHex || supportedPidsHex.length !== 8) {
            return {
                raw: supportedPidsHex || '',
                supportedParameters: {},
                supportedCount: 0,
                isValid: false
            };
        }

        // PID definitions based on GV500MAP specification
        const pidDefinitions = {
            31: { name: 'milStatus', description: 'Malfunction Indicator Lamp (MIL) Status' },
            30: { name: 'reserved30', description: 'Reserved' },
            29: { name: 'reserved29', description: 'Reserved' },
            28: { name: 'engineLoad', description: 'The percentage value of calculated engine load' },
            27: { name: 'engineCoolantTemperature', description: 'Engine coolant temperature' },
            26: { name: 'totalMileage', description: 'The Engine Total Mileage' },
            25: { name: 'reserved25', description: 'Reserved' },
            24: { name: 'reserved24', description: 'Reserved' },
            23: { name: 'reserved23', description: 'Reserved' },
            22: { name: 'reserved22', description: 'Reserved' },
            21: { name: 'intakeManifoldPressure', description: 'Intake Manifold Absolute Pressure' },
            20: { name: 'engineRpm', description: 'Revolutions per minute (RPM) of the engine' },
            19: { name: 'vehicleSpeed', description: 'Vehicle road speed' },
            18: { name: 'reserved18', description: 'Reserved' },
            17: { name: 'intakeAirTemperature', description: 'The output value of intake air temperature sensor' },
            16: { name: 'reserved16', description: 'Reserved' },
            15: { name: 'throttlePosition', description: 'The percentage value of throttle position sensor' },
            14: { name: 'reserved14', description: 'Reserved' },
            13: { name: 'reserved13', description: 'Reserved' },
            12: { name: 'reserved12', description: 'Reserved' },
            11: { name: 'reserved11', description: 'Reserved' },
            10: { name: 'reserved10', description: 'Reserved' },
            9: { name: 'reserved9', description: 'Reserved' },
            8: { name: 'vin', description: 'Vehicle identification number' },
            7: { name: 'dtcsClearedDistance', description: 'The distance accumulated since DTCs are cleared' },
            6: { name: 'milActivatedDistance', description: 'The distance accumulated since MIL is activated' },
            5: { name: 'fuelLevelInput', description: 'The percentage value of fuel level input' },
            4: { name: 'reserved4', description: 'Reserved' },
            3: { name: 'reserved3', description: 'Reserved' },
            2: { name: 'reserved2', description: 'Reserved' },
            1: { name: 'reserved1', description: 'Reserved' },
            0: { name: 'reserved0', description: 'Reserved' }
        };

        const decimalMask = parseInt(supportedPidsHex, 16);
        const supportedParameters = {};
        let supportedCount = 0;

        // Parse each bit position
        for (let bit = 0; bit <= 31; bit++) {
            const isSupported = ((decimalMask >> bit) & 1) === 1;
            const pidInfo = pidDefinitions[bit];
            
            if (pidInfo) {
                supportedParameters[pidInfo.name] = {
                    supported: isSupported,
                    bit: bit,
                    description: pidInfo.description
                };
                
                if (isSupported) {
                    supportedCount++;
                }
            }
        }

        return {
            raw: supportedPidsHex,
            decimal: decimalMask,
            binary: decimalMask.toString(2).padStart(32, '0'),
            supportedParameters: supportedParameters,
            supportedCount: supportedCount,
            isValid: true,
            // Helper methods for quick access to key parameters
            hasEngineRpm: supportedParameters.engineRpm?.supported || false,
            hasVehicleSpeed: supportedParameters.vehicleSpeed?.supported || false,
            hasMilStatus: supportedParameters.milStatus?.supported || false,
            hasEngineLoad: supportedParameters.engineLoad?.supported || false,
            hasCoolantTemp: supportedParameters.engineCoolantTemperature?.supported || false
        };
    }

    /**
     * Formats a 4-character hex version string to readable format.
     * @param {string} version The 4-character hex version (e.g., "012D")
     * @returns {string} Formatted version (e.g., "1.45")
     */
    _formatVersion(version) {
        if (!version || version.length !== 4) return version;
        
        const major = parseInt(version.substring(0, 2), 16);
        const minor = parseInt(version.substring(2, 4), 16);
        
        return `${major}.${minor}`;
    }

    /**
     * Formats a 6-character hex OBD version string to readable format.
     * @param {string} version The 6-character hex version (e.g., "04010A")
     * @returns {string} Formatted version (e.g., "4.1.10")
     */
    _formatObdVersion(version) {
        if (!version || version.length !== 6) return version;
        
        const major = parseInt(version.substring(0, 2), 16);
        const minor = parseInt(version.substring(2, 4), 16);
        const patch = parseInt(version.substring(4, 6), 16);
        
        return `${major}.${minor}.${patch}`;
    }

    /**
     * Parses a 6-character protocol version hex string into detailed components.
     * @param {string} protocolVersion The 6-character hex protocol version (e.g., "5E010A")
     * @returns {object} Parsed protocol version with device type and version info
     */
    _parseProtocolVersion(protocolVersion) {
        if (!protocolVersion || protocolVersion.length !== 6) {
            return {
                raw: protocolVersion,
                deviceType: null,
                deviceTypeName: 'Unknown',
                majorVersion: null,
                minorVersion: null,
                formattedVersion: null
            };
        }

        const deviceTypeHex = protocolVersion.substring(0, 2);
        const majorVersionHex = protocolVersion.substring(2, 4);
        const minorVersionHex = protocolVersion.substring(4, 6);

        const deviceType = parseInt(deviceTypeHex, 16);
        const majorVersion = parseInt(majorVersionHex, 16);
        const minorVersion = parseInt(minorVersionHex, 16);

        // Device type mapping
        const deviceTypeNames = {
            0x5E: 'GV500MAP',
            // Add other device types as needed
        };

        const deviceTypeName = deviceTypeNames[deviceType] || `Unknown (0x${deviceTypeHex})`;
        const formattedVersion = `${majorVersion}.${minorVersion}`;

        return {
            raw: protocolVersion,
            deviceType: deviceType,
            deviceTypeName: deviceTypeName,
            majorVersion: majorVersion,
            minorVersion: minorVersion,
            formattedVersion: formattedVersion
        };
    }

    /**
     * Decodes a hexadecimal bitmask into an object of boolean flags.
     * @param {string} hexMask The hexadecimal string representing the bitmask.
     * @param {object} definitions An object where keys are bit positions (0-indexed) and values are flag names.
     * @returns {object} An object with flag names as keys and boolean values.
     */
    _parseBitmask(hexMask, definitions) {
        const result = {};
        if (!hexMask) {
            for (const bit in definitions) {
                result[definitions[bit]] = false;
            }
            return result;
        }

        const decimalMask = parseInt(hexMask, 16);
        for (const bit in definitions) {
            if (definitions.hasOwnProperty(bit)) {
                result[definitions[bit]] = ((decimalMask >> parseInt(bit, 10)) & 1) === 1;
            }
        }
        return result;
    }

    /**
     * Parses the Report ID and Report Type from a two-character hex string.
     * @param {string} hexValue The two-character hex string (e.g., "00", "01", "10").
     * @returns {{reportId: number|null, reportType: number|null}} Parsed values.
     */
    _parseReportIdAndType(hexValue) {
        const val = this._toNumber(hexValue, 16);
        if (val === null) {
            return { reportId: null, reportType: null };
        }
        const reportId = (val >> 4) & 0xF; // Higher 4 bits
        const reportType = val & 0xF;     // Lower 4 bits
        return { reportId, reportType };
    }

    /**
     * Common ACK message parser.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed ACK message.
     */
    _parseCommonACK(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            deviceName: this._toString(params[2]),
            serialNumber: this._toNumberFromHex(params[3]), // Changed to toString for raw hex string
            sendTime: this._parseDateTime(params[4]),
            countNumber: this._toNumberFromHex(params[5]) // Changed to toString for raw hex string
        };
    }


    // --- ASCII Report Parsers (Section 3.3) ---

    /**
     * Parses Position Related Reports (+RESP:GTTOW, GTGEO, GTSPD, GTRTL, GTDOG, GTIGL, GTVGL, GTHBM, GTEPS).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parsePositionRelatedReport(params) {
      
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            reserved: this._toString(params[4]),
            reportIdType: this._parseReportIdAndType(params[5]),
            number: this._toNumber(params[6]),
            gnssAccuracy: this._toNumber(params[7]),
            speed: this._toNumber(params[8], 10, true),
            azimuth: this._toNumber(params[9]),
            altitude: this._toNumber(params[10], 10, true),
            longitude: this._toNumber(params[11], 10, true),
            latitude: this._toNumber(params[12], 10, true),
            gnssUtcTime: this._parseDateTime(params[13]),
            mcc: this._toString(params[14]),
            mnc: this._toString(params[15]),
            lac: this._toNumber(params[16], 16),
            cellId: this._toNumber(params[17], 16),
            reserved1: this._toString(params[18]),
            mileage: this._toNumber(params[19], 10, true),
            sendTime: this._parseDateTime(params[20]),
            countNumber: this._toNumberFromHex(params[21]),
        };
    }

    /**
     * Parses +RESP:GTFRI (Fixed Report Information).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTFRI(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            externalPowerVoltage: this._toNumber(params[4]),
            reportIdType: this._parseReportIdAndType(params[5]),
            number: this._toNumber(params[6]),
            gnssAccuracy: this._toNumber(params[7]),
            speed: this._toNumber(params[8], 10, true),
            azimuth: this._toNumber(params[9]),
            altitude: this._toNumber(params[10], 10, true),
            longitude: this._toNumber(params[11], 10, true),
            latitude: this._toNumber(params[12], 10, true),
            gnssUtcTime: this._parseDateTime(params[13]),
            mcc: this._toString(params[14]),
            mnc: this._toString(params[15]),
            lac: this._toNumber(params[16], 16),
            cellId: this._toNumber(params[17], 16),
            reserved: this._toString(params[18]),
            mileage: this._toNumber(params[19], 10, true),
            hourMeterCount: this._toString(params[20]), // Format: HHHHH:MM:SS
            reserved1: this._toString(params[21]),
            reserved2: this._toString(params[22]),
            reserved3: this._toString(params[23]),
            deviceStatus: this._toNumberFromHex(params[24]), // 6-byte hex status
            engineRpm: this._toNumber(params[25]),
            fuelConsumption: this._toNumber(params[26], 10, true),
            fuelLevelInput: this._toNumber(params[27]),
            sendTime: this._parseDateTime(params[28]),
            countNumber: this._toNumberFromHex(params[29]),
        };
    }

    /**
     * Parses +RESP:GTEPS (External Power Supply Monitoring Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTEPS(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            externalPowerVoltage: this._toNumber(params[4]), // mV (0-99999)
            reportIdType: this._parseReportIdAndType(params[5]),
            number: this._toNumber(params[6]),
            gnssAccuracy: this._toNumber(params[7]),
            speed: this._toNumber(params[8], 10, true),
            azimuth: this._toNumber(params[9]),
            altitude: this._toNumber(params[10], 10, true),
            longitude: this._toNumber(params[11], 10, true),
            latitude: this._toNumber(params[12], 10, true),
            gnssUtcTime: this._parseDateTime(params[13]),
            mcc: this._toString(params[14]),
            mnc: this._toString(params[15]),
            lac: this._toNumber(params[16], 16),
            cellId: this._toNumber(params[17], 16),
            reserved: this._toString(params[18]),
            mileage: this._toNumber(params[19], 10, true),
            sendTime: this._parseDateTime(params[20]),
            countNumber: this._toNumberFromHex(params[21]),
        };
    }

    /**
     * Parses +RESP:GTINF (Device Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTINF(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            motionStatus: this._toString(params[4]),
            iccId: this._toString(params[5]),
            csqRssi: this._toNumber(params[6]),
            csqRssiDbm: this._mapCsqRssiToDbm(this._toNumber(params[6])),
            csqBer: this._toNumber(params[7]),
            csqBerDescription: this._mapCsqBer(this._toNumber(params[7])),
            externalPowerSupply: this._toNumber(params[8]), // 0|1
            externalPowerVoltage: this._toNumber(params[9]),
            reserved1: this._toString(params[10]),
            backupBatteryVoltage: this._toNumber(params[11], 10, true),
            charging: this._toNumber(params[12]), // 0|1
            ledOn: this._toNumber(params[13]), // 0-4
            reserved2: this._toString(params[14]),
            reserved3: this._toString(params[15]),
            lastFixUtcTime: this._parseDateTime(params[16]),
            reserved4: this._toString(params[17]), // empty in example
            reserved5: this._toString(params[18]), // empty in example
            reserved6: this._toString(params[19]), // empty in example
            reserved7: this._toString(params[20]), // empty in example
            reserved8: this._toString(params[21]), // empty in example (extra field found in the provided message)
            timeZoneOffset: this._toString(params[22]),
            daylightSaving: this._toNumber(params[23]),
            sendTime: this._parseDateTime(params[24]),
            countNumber: this._toNumberFromHex(params[25]), // Kept as string as per user request
        };
    }

    /**
     * Parses +RESP:GTGPS (Report for Real Time Querying - GPS).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTGPS(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            reserved1: this._toString(params[4]),
            reserved2: this._toString(params[5]),
            reserved3: this._toString(params[6]),
            reportCompositionMask: this._toNumber(params[7], 16), // HEX mask
            currentGnssAntenna: this._toNumber(params[8]), // 1|2
            reserved4: this._toString(params[9]),
            lastFixUtcTime: this._parseDateTime(params[10]),
            sendTime: this._parseDateTime(params[11]),
            countNumber: this._toNumberFromHex(params[12]), // Changed to toString for raw hex string
        };
    }

    /**
     * Parses +RESP:GTALM (All Configurations Report).
     * This is a complex one as it contains sub-packaged configurations.
     * We'll return the raw configuration string for further parsing by a separate utility if needed.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTALM(params) {
    
        const parts = params.split(',');

        // Extract common header information
        const reportId = parts[0];
        const deviceId = parts[1];
        const sendTime = this.parseDateTime(parts[2]);
        const countNumber = parseInt(parts[3], 10);

        // The configuration content starts from the 5th part (index 4)
        const configContent = parts.slice(4).join(',');

        const configurations = {};

        // Function to parse a specific configuration section
        const parseConfigSection = (sectionName, content) => {
            const section = {};
            // Implement parsing logic for each section based on the provided specifications
            // This will involve splitting the content further and assigning to specific keys
            switch (sectionName) {
                case 'BSI':
                    const bsiParts = content.split(',');
                    section.apn = bsiParts[0];
                    section.apnUser = bsiParts[1];
                    section.apnPassword = bsiParts[2];
                    section.reserved1 = bsiParts[3];
                    section.reserved2 = bsiParts[4];
                    section.reserved3 = bsiParts[5];
                    section.networkMode = parseInt(bsiParts[6], 10);
                    section.lteMode = parseInt(bsiParts[7], 10);
                    break;
                case 'SRI':
                    const sriParts = content.split(',');
                    section.reportMode = parseInt(sriParts[0], 10);
                    section.reserved = sriParts[1];
                    section.bufferMode = parseInt(sriParts[2], 10);
                    section.mainServerIPDomain = sriParts[3];
                    section.mainServerPort = parseInt(sriParts[4], 10);
                    section.backupServerIP = sriParts[5];
                    section.backupServerPort = parseInt(sriParts[6], 10);
                    section.smsGateway = sriParts[7];
                    section.heartbeatInterval = parseInt(sriParts[8], 10);
                    section.sackEnable = parseInt(sriParts[9], 10);
                    section.protocolFormat = parseInt(sriParts[10], 10);
                    section.enableSMSACK = parseInt(sriParts[11], 10);
                    section.highPriorityMask = sriParts[12];
                    section.reserved2 = sriParts[13];
                    section.encryptionMode = parseInt(sriParts[14], 10);
                    break;
                case 'CFG':
                    const cfgParts = content.split(',');
                    section.password = cfgParts[0];
                    section.deviceName = cfgParts[1];
                    section.odoEnable = parseInt(cfgParts[2], 10);
                    section.odoInitialMileage = parseFloat(cfgParts[3]);
                    section.odoMileageMode = parseInt(cfgParts[4], 10);
                    section.reserved1 = cfgParts[5];
                    section.reportMask = cfgParts[6];
                    section.powerSavingMode = parseInt(cfgParts[7], 10);
                    section.sleepMode = parseInt(cfgParts[8], 10);
                    section.eventMask = cfgParts[9];
                    section.reserved2 = cfgParts[10];
                    section.infoReportEnable = parseInt(cfgParts[11], 10);
                    section.infoReportInterval = parseInt(cfgParts[12], 10);
                    section.backupBatteryOn = parseInt(cfgParts[13], 10);
                    section.backupBattCharge = parseInt(cfgParts[14], 10);
                    section.agpsMode = parseInt(cfgParts[15], 10);
                    section.cellInfoReport = parseInt(cfgParts[16], 10);
                    section.gnssLostTime = parseInt(cfgParts[17], 10);
                    section.towMode = parseInt(cfgParts[18], 10);
                    section.gnssAntennaMode = parseInt(cfgParts[19], 10);
                    section.gnssAntennaTimeout = parseInt(cfgParts[20], 10);
                    break;
                case 'TOW':
                    const towParts = content.split(',');
                    section.towEnable = parseInt(towParts[0], 10);
                    section.engineOffToTow = parseInt(towParts[1], 10);
                    section.fakeTowDelay = parseInt(towParts[2], 10);
                    section.towInterval = parseInt(towParts[3], 10);
                    // Skipping 4 reserved fields (indices 4, 5, 6, 7)
                    section.restDuration = parseInt(towParts[8], 10);
                    section.motionDuration = parseInt(towParts[9], 10);
                    section.motionThreshold = parseInt(towParts[10], 10);
                    break;
                case 'EPS':
                    const epsParts = content.split(',');
                    section.epsMode = parseInt(epsParts[0], 10); // Mode
                    section.minThreshold = parseInt(epsParts[1], 10); // Min Threshold
                    section.maxThreshold = parseInt(epsParts[2], 10); // Max Threshold
                    section.samplePeriod = parseInt(epsParts[3], 10); // Sample Period
                    section.debounceTime = parseInt(epsParts[4], 10); // Debounce Time
                    section.syncWithFRI = parseInt(epsParts[5], 10); // Sync with FRI
                    section.voltageMarginError = parseInt(epsParts[6], 10); // Voltage Margin Error
                    section.debounceVoltageThreshold = parseInt(epsParts[7], 10); // Debounce Voltage Threshold
                    section.mpnmpfValidityTime = parseInt(epsParts[8], 10); // MPN/MPF Validity Time
                    break;
                case 'TMA':
                    const tmaParts = content.split(',');
                    section.sign = tmaParts[0]; // Sign
                    section.hourOffset = parseInt(tmaParts[1], 10); // Hour Offset
                    section.minuteOffset = parseInt(tmaParts[2], 10); // Minute Offset
                    section.daylightSaving = parseInt(tmaParts[3], 10); // Daylight Saving
                    // Reserved fields (indices 4, 5, 6, 7, 8) are skipped
                    break;
                case 'OWH':
                    const owhParts = content.split(',');
                    section.owhMode = parseInt(owhParts[0], 10); // OWH Mode
                    section.dayOfWork = parseInt(owhParts[1], 10); // Day of Work
                    section.workingHoursStart1 = owhParts[2]; // Working Hours Start1 (HHMM)
                    section.workingHoursEnd1 = owhParts[3]; // Working Hours End1 (HHMM)
                    section.workingHoursStart2 = owhParts[4]; // Working Hours Start2 (HHMM)
                    section.workingHoursEnd2 = owhParts[5]; // Working Hours End2 (HHMM)
                    // Reserved fields (indices 6-17) are skipped
                    break;
                case 'FRI':
                    const friParts = content.split(',');
                    section.mode = parseInt(friParts[0], 10); // FRI Mode
                    section.discardNoFix = parseInt(friParts[1], 10); // Discard No Fix
                    section.periodEnable = parseInt(friParts[2], 10); // Period Enable
                    section.beginTime = friParts[3]; // Begin Time (HHMM)
                    section.endTime = friParts[4]; // End Time (HHMM)
                    section.sendInterval = parseInt(friParts[5], 10); // Send Interval (seconds)
                    section.distance = parseInt(friParts[6], 10); // Distance / Mileage (meters)
                    section.cornerReport = parseInt(friParts[7], 10); // Corner Report (degrees)
                    section.igfReportInterval = parseInt(friParts[8], 10); // IGF Report Interval (seconds)
                    break;
                case 'GEO':
                case 'GEOID2':
                case 'GEOID3':
                case 'GEOID4':
                    const geoParts = content.split(',');
                    section.geoId = parseInt(geoParts[0], 10);
                    section.mode = parseInt(geoParts[1], 10);
                    section.longitude = parseFloat(geoParts[2]);
                    section.latitude = parseFloat(geoParts[3]);
                    section.radius = parseInt(geoParts[4], 10);
                    section.checkInterval = parseInt(geoParts[5], 10);
                    // Reserved fields (indices 6, 7, 8, 9) are skipped
                    section.triggerMode = parseInt(geoParts[10], 10); // Trigger Mode
                    section.triggerReport = parseInt(geoParts[11], 10); // Trigger Report
                    section.stateMode = parseInt(geoParts[12], 10); // State Mode
                    // Reserved field (index 13) is skipped
                    break;
                    
                case 'SPD':
                    const spdParts = content.split(',');
                    section.mode = parseInt(spdParts[0], 10);
                    section.minSpeed = parseInt(spdParts[1], 10);
                    section.maxSpeed = parseInt(spdParts[2], 10);
                    section.validity = parseInt(spdParts[3], 10);
                    section.sendInterval = parseInt(spdParts[4], 10);
                    // Reserved fields (indices 5-19) are skipped
                    break;
                case 'DOG':
                    const dogParts = content.split(',');
                    section.mode = parseInt(dogParts[0], 10); // DOG Mode
                    section.ignitionFreq = parseInt(dogParts[1], 10); // Ignition Frequency
                    section.interval = parseInt(dogParts[2], 10); // Interval
                    section.time = dogParts[3]; // Time (HHMM)
                    section.reportBeforeRB = parseInt(dogParts[4], 10); // Report Before Reboot
                    // Reserved fields (indices 5, 6, 7) are skipped
                    section.noNetworkInterval = parseInt(dogParts[8], 10); // No Network Interval
                    section.noActivationInterval = parseInt(dogParts[9], 10); // No Activation Interval
                    section.sendFailureTimeout = parseInt(dogParts[10], 10); // Send Failure Timeout
                    // Reserved fields (indices 11-20) are skipped
                    break;
                case 'IDL':
                    const idlParts = content.split(',');
                    section.mode = parseInt(idlParts[0], 10); // Mode
                    section.timeToIdling = parseInt(idlParts[1], 10); // Time to Idling
                    section.timeToMovement = parseInt(idlParts[2], 10); // Time to Movement
                    // Reserved fields (indices 3-19) are skipped
                    break;
                case 'HMC':
                    const hmcParts = content.split(',');
                    section.enable = parseInt(hmcParts[0], 10);
                    section.initHourMeter = hmcParts[1];
                    break;
                case 'HBM':
                    const hbmParts = content.split(',');
                    section.hbmEnable = parseInt(hbmParts[0], 10);
                    // Reserved field (index 1) is skipped
                    section.discardUnknownEvent = parseInt(hbmParts[2], 10);
                    section.highSpeed = parseInt(hbmParts[3], 10);
                    section.deltaVhb = parseInt(hbmParts[4], 10);
                    section.deltaVha = parseInt(hbmParts[5], 10);
                    // Reserved field (index 6) is skipped
                    section.mediumSpeed = parseInt(hbmParts[7], 10);
                    section.deltaVmb = parseInt(hbmParts[8], 10);
                    section.deltaVma = parseInt(hbmParts[9], 10);
                    // Reserved fields (indices 10, 11) are skipped
                    section.deltaVlb = parseInt(hbmParts[12], 10);
                    section.deltaVla = parseInt(hbmParts[13], 10);
                    // Reserved fields (indices 14, 15, 16, 17) are skipped
                    section.corneringBrakingThreshold = parseInt(hbmParts[18], 10);
                    section.accelerationThreshold = parseInt(hbmParts[19], 10);
                    section.accelerationDuration = parseInt(hbmParts[20], 10);
                    // Reserved fields (indices 21-22) are skipped
                    break;
                case 'SSR':
                    const ssrParts = content.split(',');
                    section.mode = parseInt(ssrParts[0], 10);
                    section.timeToStop = parseInt(ssrParts[1], 10);
                    section.timeToStart = parseInt(ssrParts[2], 10);
                    section.startSpeed = parseInt(ssrParts[3], 10);
                    section.longStop = parseInt(ssrParts[4], 10);
                    section.timeUnit = parseInt(ssrParts[5], 10);
                    // Skip reserved fields (indices 6-7)
                    break;
                case 'OBD':
                    const obdParts = content.split(',');
                    section.mode = parseInt(obdParts[0], 10);
                    section.checkInterval = parseInt(obdParts[1], 10);
                    section.reportInterval = parseInt(obdParts[2], 10);
                    section.reportIntervalIGF = parseInt(obdParts[3], 10);
                    section.reportMask = obdParts[4];
                    section.eventMask = obdParts[5];
                    section.displacement = parseFloat(obdParts[6]);
                    section.fuelOilType = parseInt(obdParts[7], 10);
                    section.customFuelRatio = parseFloat(obdParts[8]);
                    section.customFuelDensity = parseFloat(obdParts[9]);
                    section.journeySummaryMask = obdParts[10];
                    // Skip reserved field (index 11)
                    section.igfDebounceTime = parseInt(obdParts[12], 10);
                    // Skip reserved fields (indices 13-14)
                    break;
                case 'OSM':
                    const osmParts = content.split(',');
                    section.id = parseInt(osmParts[0], 10);
                    section.mode = parseInt(osmParts[1], 10);
                    section.reportMask = osmParts[2];
                    section.minThreshold = parseInt(osmParts[3], 10);
                    section.maxThreshold = parseInt(osmParts[4], 10);
                    section.sendInterval = parseInt(osmParts[5], 10);
                    // Skip reserved fields (indices 6-12)
                    break;
                case 'EMG':
                    const emgParts = content.split(',');
                    section.mode = parseInt(emgParts[0], 10);
                    section.emergencyPeriod = parseInt(emgParts[1], 10);
                    section.emergencyReportInterval = parseInt(emgParts[2], 10);
                    // Skip reserved fields (indices 3-7)
                    break;
                case 'RMD':
                    const rmdParts = content.split(',');
                    section.mode = parseInt(rmdParts[0], 10);
                    // Skip reserved fields (indices 1-4)
                    section.homeOperatorList = rmdParts[5];
                    // Skip reserved fields (indices 6-7)
                    section.roamingOperatorList = rmdParts[8];
                    // Skip reserved fields (indices 9-10)
                    section.blockedOperatorList = rmdParts[11];
                    // Skip reserved field (index 12)
                    section.knownRoamingEventMask = rmdParts[13];
                    // Skip reserved fields (indices 14-15)
                    section.unknownRoamingEventMask = rmdParts[16];
                    // Skip reserved fields (indices 17-25)
                    break;
                case 'CMD':
                    const cmdParts = content.split(',');
                    section.mode = parseInt(cmdParts[0], 10);
                    section.storedCmdId = parseInt(cmdParts[1], 10);
                    section.commandString = cmdParts[2];
                    // Skip reserved fields (indices 3-6)
                    break;
                case 'UDF':
                    const udfParts = content.split(',');
                    section.mode = parseInt(udfParts[0], 10);
                    section.groupId = parseInt(udfParts[1], 10);
                    section.inputIdMask = udfParts[2]; // HEX value
                    section.debounceTime = parseInt(udfParts[3], 10);
                    // Skip reserved fields (indices 4-5)
                    section.stocmdIdMask = udfParts[6]; // HEX value
                    section.stocmdAck = parseInt(udfParts[7], 10);
                    // Skip reserved fields (indices 8-11)
                    break;
                case 'UPC':
                    const upcParts = content.split(',');
                    section.maxDownloadRetry = parseInt(upcParts[0], 10);
                    section.downloadTimeout = parseInt(upcParts[1], 10);
                    section.downloadProtocol = parseInt(upcParts[2], 10);
                    section.enableReport = parseInt(upcParts[3], 10);
                    section.updateInterval = parseInt(upcParts[4], 10);
                    section.downloadUrl = upcParts[5];
                    section.mode = parseInt(upcParts[6], 10);
                    // Skip reserved field (index 7)
                    section.extendedStatusReport = parseInt(upcParts[8], 10);
                    section.identifierNumber = upcParts[9]; // HEX value
                    // Skip reserved field (index 10)
                    section.updateStatusMask = upcParts[11]; // HEX value
                    break;
                case 'GAM':
                    const gamParts = content.split(',');
                    section.mode = parseInt(gamParts[0], 10);
                    section.speedMode = parseInt(gamParts[1], 10);
                    section.motionSpeedThreshold = parseInt(gamParts[2], 10);
                    section.motionCumulativeTime = parseInt(gamParts[3], 10);
                    section.motionlessCumulativeTime = parseInt(gamParts[4], 10);
                    section.gnssFixFailureTimeout = parseInt(gamParts[5], 10);
                    // Skip reserved fields (indices 6-9)
                    break;
                case 'VVS':
                    const vvsParts = content.split(',');
                    section.ignitionOnVoltage = parseInt(vvsParts[0], 10);
                    section.voltageOffset = parseInt(vvsParts[1], 10);
                    section.ignitionOnDebounce = parseInt(vvsParts[2], 10);
                    section.smartVoltageAdjustment = parseInt(vvsParts[3], 10);
                    section.ignitionOffDebounce = parseInt(vvsParts[4], 10);
                    break;
                case 'AVS':
                    const avsParts = content.split(',');
                    section.restValidity = parseInt(avsParts[0], 10);
                    section.movementValidity = parseInt(avsParts[1], 10);
                    // Skip reserved fields (indices 2-4)
                    break;
                case 'VMS':
                    const vmsParts = content.split(',');
                    section.virtualIgnitionMode = parseInt(vmsParts[0], 10);
                    section.virtualIgnitionOnMask = vmsParts[1];
                    section.virtualIgnitionOffMask = vmsParts[2];
                    section.virtualIgnitionOnLogic = parseInt(vmsParts[3], 10);
                    // Skip reserved field (index 4)
                    break;
                case 'ASC':
                    const ascParts = content.split(',');
                    section.brakeSpeedThreshold = parseInt(ascParts[0], 10);
                    section.deltaSpeedThreshold = parseInt(ascParts[1], 10);
                    section.deltaHeadingThreshold = parseInt(ascParts[2], 10);
                    // Skip reserved fields (indices 3-11)
                    break;
                case 'BAS':
                    const basParts = content.split(',');
                    section.index = parseInt(basParts[0], 10);
                    section.accessoryType = parseInt(basParts[1], 10);
                    section.accessoryModel = parseInt(basParts[2], 10);
                    section.accessoryName = basParts[3];
                    section.accessoryMac = basParts[4]; // HEX value
                    section.accessoryAppendMask = basParts[5]; // HEX value
                    // Skip reserved fields (indices 6-19)
                    break;
                case 'FVR':
                    const fvrParts = content.split(',');
                    section.configName = fvrParts[0];
                    section.configVersion = fvrParts[1];
                    section.commandMask = fvrParts[2]; // HEX value
                    section.geoIdMask = fvrParts[3]; // HEX value
                    // Skip reserved fields (indices 4-5)
                    section.digitalSignature = fvrParts[6];
                    // Skip reserved fields (indices 7-10)
                    section.generationTime = fvrParts[11]; // YYYYMMDDHHMMSS format
                    break;
                case 'BTS':
                    const btsParts = content.split(',');
                    section.mode = parseInt(btsParts[0], 10);
                    // Skip reserved field (index 1)
                    section.bluetoothName = btsParts[2];
                    // Skip reserved fields (indices 3-19)
                    break;
                case 'SVR':
                    const svrParts = content.split(',');
                    section.mode = parseInt(svrParts[0], 10);
                    section.ghostMacAddress = svrParts[1]; // HEX value
                    section.connectInterval = parseInt(svrParts[2], 10);
                    section.connectFailCount = parseInt(svrParts[3], 10);
                    section.matchConnectedImei = svrParts[4];
                    section.btiReportInterval = parseInt(svrParts[5], 10);
                    // Skip reserved fields (indices 6-7)
                    break;
                case 'BSF':
                    const bsfParts = content.split(',');
                    section.mode = parseInt(bsfParts[0], 10);
                    section.scanDataType = parseInt(bsfParts[1], 10);
                    section.uuid = bsfParts[2]; // HEX value, can contain up to 10 UUIDs
                    // Skip reserved field (index 3)
                    section.scanInterval = parseInt(bsfParts[4], 10);
                    section.lostCount = parseInt(bsfParts[5], 10);
                    // Skip reserved field (index 6)
                    break;
                case 'WLT':
                    const wltParts = content.split(',');
                    section.numberFilter = parseInt(wltParts[0], 10);
                    section.phoneNumberList = wltParts.slice(1, 11); // Assuming 10 phone numbers
                    // Reserved fields (indices 11-12) are skipped
                    break;
                case 'HRM':
                    const hrmParts = content.split(',');
                    // Reserved fields (indices 0-1) are skipped
                    section.ackMask = hrmParts[2]; // +ACK Mask
                    section.rspMask = hrmParts[3]; // +RSP Mask
                    section.evtMask = hrmParts[4]; // +EVT Mask
                    section.infMask = hrmParts[5]; // +INF Mask
                    section.hbdMask = hrmParts[6]; // +HBD Mask
                    section.crdMask = hrmParts[7]; // +CRD Mask
                    // Reserved fields (indices 8-9) are skipped
                    section.obdMask = hrmParts[10]; // +OBD Mask
                    break;
                case 'CRA':
                    const craParts = content.split(',');
                    section.mode = parseInt(craParts[0], 10);
                    section.thresholdX = parseInt(craParts[1], 10);
                    section.thresholdY = parseInt(craParts[2], 10);
                    section.thresholdZ = parseInt(craParts[3], 10);
                    section.samplingStart = parseInt(craParts[4], 10);
                    section.samplesBeforeCrash = parseInt(craParts[5], 10);
                    section.samplesAfterCrash = parseInt(craParts[6], 10);
                    // Reserved fields (indices 7-10) are skipped
                    break;
                case 'PDS':
                    const pdsParts = content.split(',');
                    section.mode = parseInt(pdsParts[0], 10);
                    section.mask = pdsParts[1];
                    // Reserved fields (indices 2-6) are skipped
                    break;
                default:
                    // Handle unknown sections or log a warning
                    console.warn(`Unknown GTALM configuration section: ${sectionName}`);
                    section.rawContent = content;
                    break;
            }
            return section;
        };

        // Parse the configuration content based on the section headers
        const configSections = configContent.split(';');
        configSections.forEach(section => {
            const sectionParts = section.split(',');
            if (sectionParts.length > 0) {
                const sectionName = sectionParts[0];
                const sectionData = sectionParts.slice(1).join(',');
                configurations[sectionName] = parseConfigSection(sectionName, sectionData);
            }
        });

        return {
            type: 'GTALM',
            reportId,
            deviceId,
            sendTime,
            countNumber,
            configurations,
        };
    }


    /**
     * Parses +RESP:GTALS (Configuration Query Response).
     * Returns configuration information for specific AT commands (e.g., FRI, GEO, etc.)
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTALS(params) {
        // Based on the specification, GTALS has the following structure:
        // +RESP:GTALS,protocolVersion,uniqueId,vin,deviceName,subATCommand,mode,discardNoFix,reserved,periodEnable,startTime,endTime,reserved,sendInterval,distance,mileage,reserved,cornerReport,igfReportInterval,reserved,reserved,reserved,reserved,sendTime,countNumber,$
        
        const result = {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            subATCommand: this._toString(params[4]), // The AT command being queried (e.g., 'FRI')
            mode: this._toNumber(params[5], 10),
            discardNoFix: this._toNumber(params[6], 10),
            // params[7] is reserved
            periodEnable: this._toNumber(params[8], 10),
            startTime: this._toString(params[9]), // HHMM format
            endTime: this._toString(params[10]), // HHMM format
            // params[11] is reserved
            sendInterval: this._toNumber(params[12], 10), // seconds (1-86400)
            distance: this._toNumber(params[13], 10), // meters (50-65535)
            mileage: this._toNumber(params[14], 10), // meters (50-65535)
            // params[15] is reserved
            cornerReport: this._toNumber(params[16], 10), // degrees (0-180)
            igfReportInterval: this._toNumber(params[17], 10), // seconds (1-86400)
            // params[18-21] are reserved
            sendTime: this._parseDateTime(params[params.length - 2]),
            countNumber: this._toNumberFromHex(params[params.length - 1])
        };
        
        return result;
    }

    /**
     * Parses +RESP:GTCID (ICCID Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTCID(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            iccId: this._toString(params[4]),
            sendTime: this._parseDateTime(params[5]),
            countNumber: this._toNumberFromHex(params[6]), // Changed to toString for raw hex string
        };
    }

/**
 * Parses +RESP:GTCSQ (Signal Quality Report).
 * @param {string[]} params The parameters array.
 * @returns {object} The parsed report.
 */
parseGTCSQ(params) {
    const csqRssi = this._toNumber(params[4]);
    const csqBer = this._toNumber(params[5]);
    
    return {
        protocolVersion: this._parseProtocolVersion(params[0]),
        uniqueId: this._toString(params[1]),
        vin: this._toString(params[2]),
        deviceName: this._toString(params[3]),
        csqRssi: csqRssi,
        csqRssiDbm: this._mapCsqRssiToDbm(csqRssi),
        csqBer: csqBer,
        csqBerDescription: this._mapCsqBer(csqBer),
        sendTime: this._parseDateTime(params[6]),
        countNumber: this._toNumberFromHex(params[7]),
    };
}
/**
 * Parses +RESP:GTVER (Version Information Report).
 * @param {string[]} params The parameters array.
 * @returns {object} The parsed report.
 */
parseGTVER(params) {
    // Based on the specification: +RESP:GTVER,protocolVersion,uniqueId,vin,deviceName,deviceType,firmwareVersion,hardwareVersion,sendTime,countNumber,$
    // Example: +RESP:GTVER,5E0100,135790246811220,,GV500MAP,GV500MAP,012D,0102,0101,0106,20190403173310,09A7$
    
    return {
        protocolVersion: this._parseProtocolVersion(params[0]),
        uniqueId: this._toString(params[1]),
        vin: this._toString(params[2]),
        deviceName: this._toString(params[3]),
        deviceType: this._toString(params[4]),
        firmwareVersion: this._toString(params[5]),
        firmwareVersionFormatted: this._formatVersion(params[5]),
        hardwareVersion: this._toString(params[6]),
        hardwareVersionFormatted: this._formatVersion(params[6]),
        sendTime: this._parseDateTime(params[7]),
        countNumber: this._toNumberFromHex(params[8])
    };
}

    /**
     * Parses +RESP:GTBAT (Battery Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTBAT(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            externalPowerSupply: this._toNumber(params[4]), // 0: disconnected, 1: connected
            externalPowerVoltage: this._toNumber(params[5]), // 0-99999 mV
            // params[6] is reserved (empty in example)
            backupBatteryVoltage: this._toNumber(params[7], 10, true), // 0.00-4.20 V
            charging: this._toNumber(params[8]), // 0: not charging, 1: charging
            ledOn: this._toNumber(params[9]), // 0-4
            sendTime: this._parseDateTime(params[10]),
            countNumber: this._toNumberFromHex(params[11])
        };
    }

    /**
     * Parses +RESP:GTTMZ (Time Zone Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTTMZ(params) {
        const timeZoneOffset = this._toString(params[4]); // e.g., "+0800"
        
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            timeZoneOffset: timeZoneOffset,
            timeZoneOffsetParsed: this._parseTimeZoneOffset(timeZoneOffset),
            daylightSaving: this._toNumber(params[5]), // 0: disabled, 1: enabled
            sendTime: this._parseDateTime(params[6]),
            countNumber: this._toNumberFromHex(params[7])
        };
    }

    /**
     * Parses +RESP:GTGSV (Satellite Information Report).
     * This report includes a variable number of satellite data.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTGSV(params) {
        // Based on the specification: +RESP:GTGSV,protocolVersion,uniqueId,vin,deviceName,svCount,svId1,svPower1,svId2,svPower2,...,sendTime,countNumber,$
        // Example: +RESP:GTGSV,5E0100,135790246811220,,,15,3,42,4,48,14,39,16,43,22,44,23,36,25,0,26,47,27,29,29,26,31,45,32,41,40,0,42,36,50,37,20160405133851,000B$
        
        const satellites = [];
        const svCount = this._toNumber(params[4]);
        const satelliteDataStartIndex = 5;
        
        // Each satellite has 2 parameters: SV ID and SV Power
        for (let i = 0; i < svCount; i++) {
            const svIdIndex = satelliteDataStartIndex + (i * 2);
            const svPowerIndex = satelliteDataStartIndex + (i * 2) + 1;
            
            if (params[svIdIndex] === undefined || params[svPowerIndex] === undefined) {
                break; // Avoid reading past the end
            }
            
            const svId = this._toNumber(params[svIdIndex]);
            const svPower = this._toNumber(params[svPowerIndex]);
            
            satellites.push({
                svId: svId,
                svPower: svPower,
                hasSignal: svPower > 0 // Helper field to indicate if satellite has signal
            });
        }
        
        // Calculate indices for sendTime and countNumber
        const sendTimeIndex = satelliteDataStartIndex + (svCount * 2);
        const countNumberIndex = sendTimeIndex + 1;
        
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            svCount: svCount,
            satellites: satellites,
            activeSatellites: satellites.filter(sat => sat.svPower > 0).length,
            sendTime: this._parseDateTime(params[sendTimeIndex]),
            countNumber: this._toNumberFromHex(params[countNumberIndex])
        };
    }

    /**
     * Parses +RESP:GTATI (Advanced Version Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTATI(params) {
        // Based on the specification: +RESP:GTATI,protocolVersion,uniqueId,vin,deviceName,deviceType,atiMask,firmwareVersion,mcuFirmwareVersion,obdFirmwareVersion,bleFirmwareVersion,modemFirmwareVersion,hardwareVersion,modemHardwareVersion,sensorId,sendTime,countNumber,$
        // Example: +RESP:GTATI,5E0100,135790246811220,,GV500MAP,GV500MAP,00000001,012D,20190404092603,0A71$
        // Note: The example appears to be missing some fields, but we'll follow the specification
        
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            deviceType: this._toString(params[4]),
            atiMask: this._toString(params[5]),
            firmwareVersion: this._toString(params[6]),
            firmwareVersionFormatted: this._formatVersion(params[6]),
            mcuFirmwareVersion: this._toString(params[7]),
            mcuFirmwareVersionFormatted: this._formatVersion(params[7]),
            obdFirmwareVersion: this._toString(params[8]),
            obdFirmwareVersionFormatted: this._formatObdVersion(params[8]),
            bleFirmwareVersion: this._toString(params[9]),
            bleFirmwareVersionFormatted: this._formatVersion(params[9]),
            modemFirmwareVersion: this._toString(params[10]),
            modemFirmwareVersionFormatted: this._formatVersion(params[10]),
            hardwareVersion: this._toString(params[11]),
            hardwareVersionFormatted: this._formatVersion(params[11]),
            modemHardwareVersion: this._toString(params[12]),
            modemHardwareVersionFormatted: this._formatVersion(params[12]),
            sensorId: this._toString(params[13]),
            sendTime: this._parseDateTime(params[14]),
            countNumber: this._toNumberFromHex(params[15])
        };
    }

    /**
     * Parses +RESP:GTAIF (Network Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTAIF(params) {
        const csqRssi = this._toNumber(params[8]);
        const csqBer = this._toNumber(params[9]);
        
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            apn: this._toString(params[4]),
            apnUserName: this._toString(params[5]),
            apnPassword: this._toString(params[6]),
            iccid: this._toString(params[7]),
            csqRssi: csqRssi,
            csqRssiDbm: this._mapCsqRssiToDbm(csqRssi),
            csqBer: csqBer,
            csqBerDescription: this._mapCsqBer(csqBer),
            cellId: this._toString(params[10]),
            ipAddress: this._toString(params[11]),
            mainDns: this._toString(params[12]),
            backupDns: this._toString(params[13]),
            // params[14], params[15], params[16] are reserved fields
            networkType: this._toNumber(params[17]),
            networkTypeDescription: this._mapNetworkType(this._toNumber(params[17])),
            sendTime: this._parseDateTime(params[18]),
            countNumber: this._toNumberFromHex(params[19])
        };
    }

    /**
     * Parses +RESP:GTBTI (Bluetooth Information Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTBTI(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            bluetoothName: this._toString(params[4]),
            bluetoothMacAddress: this._toString(params[5]),
            bluetoothState: this._toNumber(params[6]),
            bluetoothStateDescription: this._mapBluetoothState(this._toNumber(params[6])),
            connectedDeviceNumber: this._toNumber(params[7]),
            // params[8] is reserved
            connectedDeviceMac: this._toString(params[9]),
            role: this._toNumber(params[10]),
            roleDescription: this._mapBluetoothRole(this._toNumber(params[10])),
            realTimeState: this._toNumber(params[11]),
            realTimeStateDescription: this._mapRealTimeState(this._toNumber(params[11])),
            ghostBatteryPercentage: this._toNumber(params[12]),
            ghostStatus: this._toString(params[13]),
            ghostStatusDetails: this._parseGhostStatus(this._toString(params[13])),
            // params[14-19] are reserved fields
            sendTime: this._parseDateTime(params[20]),
            countNumber: this._toNumberFromHex(params[21])
        };
    }

    /**
     * Parses simple event reports (+RESP:GTPNA, GTPFA, GTPDP).
     * These reports only contain basic header and timestamp info.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseSimpleEventReport(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            sendTime: this._parseDateTime(params[4]),
            countNumber: this._toNumber(params[5], 16) // Changed to toString for raw hex string
        };
    }

    /**
     * Parses common event reports (+RESP:GTMPN, GTMPF, GTBTC, GTSTC).
     * These follow the common event report format from the documentation.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseCommonEventReport(params) {
        // Check if this is GTSTC format (has reserved field at param 4)
        const isGTSTC = params.length >= 18 && params[4] === '';
        
        if (isGTSTC) {
            // GTSTC format with reserved field at param 4
            return {
                protocolVersion: this._parseProtocolVersion(params[0]),
                uniqueId: this._toString(params[1]),
                vin: this._toString(params[2]),
                deviceName: this._toString(params[3]),
                // params[4] is reserved field (empty)
                gnssAccuracy: this._toNumber(params[5]),
                speed: this._toNumber(params[6], 10, true),
                azimuth: this._toNumber(params[7]),
                altitude: this._toNumber(params[8], 10, true),
                longitude: this._toNumber(params[9], 10, true),
                latitude: this._toNumber(params[10], 10, true),
                gnssUtcTime: this._parseDateTime(params[11]),
                mcc: this._toString(params[12]),
                mnc: this._toString(params[13]),
                lac: this._toString(params[14]),
                cellId: this._toString(params[15]),
                // params[16] is reserved field (00)
                sendTime: this._parseDateTime(params[17]),
                countNumber: this._toNumberFromHex(params[18])
            };
        } else {
            // Standard format for GTMPN, GTMPF, GTBTC
            return {
                protocolVersion: this._parseProtocolVersion(params[0]),
                uniqueId: this._toString(params[1]),
                vin: this._toString(params[2]),
                deviceName: this._toString(params[3]),
                gnssAccuracy: this._toNumber(params[4]),
                speed: this._toNumber(params[5], 10, true),
                azimuth: this._toNumber(params[6]),
                altitude: this._toNumber(params[7], 10, true),
                longitude: this._toNumber(params[8], 10, true),
                latitude: this._toNumber(params[9], 10, true),
                gnssUtcTime: this._parseDateTime(params[10]),
                mcc: this._toString(params[11]),
                mnc: this._toString(params[12]),
                lac: this._toString(params[13]),
                cellId: this._toString(params[14]),
                // params[15] is reserved field (00)
                sendTime: this._parseDateTime(params[16]),
                countNumber: this._toNumberFromHex(params[17])
            };
        }
    }

    /**
     * Parses +RESP:GTRMD (Roaming Detection Report).
     * This message reports changes in network roaming state.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTRMD(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            roamingState: this._toNumber(params[4]), // 0: Home, 1: Known Roaming, 2: Unknown Roaming, 3: Blocking Report
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toString(params[14]),
            cellId: this._toString(params[15]),
            // params[16] is reserved field (00)
            sendTime: this._parseDateTime(params[17]),
            countNumber: this._toNumberFromHex(params[18])
        };
    }

    /**
     * Parses +RESP:GTIDN, GTSTR, GTSTP, GTLSP (Ignition Detection, Start, Stop, Last Stop Position Reports).
     * These messages include mileage information at parameter 18.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTIDN_GTSTR_GTSTP_GTLSP(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            // params[4] and params[5] are reserved fields (empty)
            gnssAccuracy: this._toNumber(params[6]),
            speed: this._toNumber(params[7], 10, true),
            azimuth: this._toNumber(params[8]),
            altitude: this._toNumber(params[9], 10, true),
            longitude: this._toNumber(params[10], 10, true),
            latitude: this._toNumber(params[11], 10, true),
            gnssUtcTime: this._parseDateTime(params[12]),
            mcc: this._toString(params[13]),
            mnc: this._toString(params[14]),
            lac: this._toString(params[15]),
            cellId: this._toString(params[16]),
            // params[17] is reserved field (00)
            mileage: this._toNumber(params[18], 10, true), // In kilometers
            sendTime: this._parseDateTime(params[19]),
            countNumber: this._toNumberFromHex(params[20])
        };
    }

    /**
     * Parses +RESP:GTIGF (Ignition Off Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTIGF(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            durationOfIgnitionOn: this._toNumber(params[4]), // Duration in seconds
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toString(params[14]),
            cellId: this._toString(params[15]),
            // params[16] is reserved field (00)
            hourMeterCount: this._toString(params[17]), // Format: HHHHH:MM:SS
            mileage: this._toNumber(params[18], 10, true), // In kilometers
            sendTime: this._parseDateTime(params[19]),
            countNumber: this._toNumberFromHex(params[20])
        };
    }

    /**
     * Parses +RESP:GTIGN (Ignition On Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTIGN(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            durationOfIgnitionOff: this._toNumber(params[4]), // Duration in seconds
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toString(params[14]),
            cellId: this._toString(params[15]),
            // params[16] is reserved field (00)
            hourMeterCount: this._toString(params[17]), // Format: HHHHH:MM:SS
            mileage: this._toNumber(params[18], 10, true), // In kilometers
            sendTime: this._parseDateTime(params[19]),
            countNumber: this._toNumberFromHex(params[20])
        };
    }

    /**
     * Parses +RESP:GTBPL (Backup Battery Low Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTBPL(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            backupBatteryVoltage: this._toNumber(params[4], 10, true),
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toString(params[14]),
            cellId: this._toString(params[15]),
            // params[16] is reserved field (00)
            sendTime: this._parseDateTime(params[17]),
            countNumber: this._toNumberFromHex(params[18])
        };
    }

    /**
     * Parses +RESP:GTGES (Geo-fence Exit/Entry Status Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTGES(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            reserved: this._toString(params[4]),
            reportIdType: this._parseReportIdAndType(params[5]),
            triggerMode: this._toNumber(params[6]), // 0|21|22
            radius: this._toNumber(params[7]), // 50-6000000(m)
            checkInterval: this._toNumber(params[8]), // 0|5-86400(sec)
            number: this._toNumber(params[9]),
            gnssAccuracy: this._toNumber(params[10]),
            speed: this._toNumber(params[11], 10, true),
            azimuth: this._toNumber(params[12]),
            altitude: this._toNumber(params[13], 10, true),
            longitude: this._toNumber(params[14], 10, true),
            latitude: this._toNumber(params[15], 10, true),
            gnssUtcTime: this._parseDateTime(params[16]),
            mcc: this._toString(params[17]),
            mnc: this._toString(params[18]),
            lac: this._toNumber(params[19], 16),
            cellId: this._toNumber(params[20], 16),
            reserved1: this._toString(params[21]),
            mileage: this._toNumber(params[22], 10, true),
            sendTime: this._parseDateTime(params[23]),
            countNumber: this._toNumberFromHex(params[24]),
        };
    }

    /**
     * Parses +RESP:GTSTT (Stop / Start Report).
     * This report has a 'Motion Status' field instead of 'Report ID, Number' sequence.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTSTT(params) {
        const motionStatusCode = this._toNumber(params[4]);
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            motionStatus: motionStatusCode,
            motionStatusDescription: this._getMotionStatusDescription(motionStatusCode),
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toNumber(params[14], 16),
            cellId: this._toNumber(params[15], 16),
            reserved: this._toString(params[16]),
            sendTime: this._parseDateTime(params[17]),
            countNumber: this._toNumberFromHex(params[18]),
        };
    }

    /**
     * Gets the description for motion status codes.
     * @param {number} statusCode The motion status code.
     * @returns {string} The description of the motion status.
     */
    _getMotionStatusDescription(statusCode) {
        const statusMap = {
            11: 'Ignition Off Rest',
            12: 'Ignition Off Motion', 
            16: 'Tow',
            21: 'Ignition On Rest',
            22: 'Ignition On Motion',
            41: 'Sensor Rest',
            42: 'Sensor Motion'
        };
        return statusMap[statusCode] || `Unknown Status (${statusCode})`;
    }

    /**
     * Parses +RESP:GTCRA (Crash Report - ASCII).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTCRA(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            crashCounter: this._toNumberFromHex(params[4]), // 2-byte HEX value (0x00 to 0xFF)
            gnssAccuracy: this._toNumber(params[5]),
            speed: this._toNumber(params[6], 10, true),
            azimuth: this._toNumber(params[7]),
            altitude: this._toNumber(params[8], 10, true),
            longitude: this._toNumber(params[9], 10, true),
            latitude: this._toNumber(params[10], 10, true),
            gnssUtcTime: this._parseDateTime(params[11]),
            mcc: this._toString(params[12]),
            mnc: this._toString(params[13]),
            lac: this._toString(params[14]),
            cellId: this._toString(params[15]),
            // params[16] is reserved field (00)
            sendTime: this._parseDateTime(params[17]),
            countNumber: this._toNumberFromHex(params[18])
        };
    }

    /**
     * Parses +RESP:GTASC (Three-Axis Self-Calibration Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTASC(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            // Acceleration calibration factors for forward direction
            xForward: this._toNumber(params[4], 10, true), // -1.00 to 1.00
            yForward: this._toNumber(params[5], 10, true), // -1.00 to 1.00
            zForward: this._toNumber(params[6], 10, true), // -1.00 to 1.00
            // Acceleration calibration factors for side direction
            xSide: this._toNumber(params[7], 10, true), // -1.00 to 1.00
            ySide: this._toNumber(params[8], 10, true), // -1.00 to 1.00
            zSide: this._toNumber(params[9], 10, true), // -1.00 to 1.00
            // Acceleration calibration factors for vertical direction
            xVertical: this._toNumber(params[10], 10, true), // -1.00 to 1.00
            yVertical: this._toNumber(params[11], 10, true), // -1.00 to 1.00
            zVertical: this._toNumber(params[12], 10, true), // -1.00 to 1.00
            gnssAccuracy: this._toNumber(params[13]),
            speed: this._toNumber(params[14], 10, true),
            heading: this._toNumber(params[15]), // Note: specification says "Heading" not "Azimuth"
            altitude: this._toNumber(params[16], 10, true),
            longitude: this._toNumber(params[17], 10, true),
            latitude: this._toNumber(params[18], 10, true),
            gnssUtcTime: this._parseDateTime(params[19]),
            mcc: this._toString(params[20]),
            mnc: this._toString(params[21]),
            lac: this._toString(params[22]),
            cellId: this._toString(params[23]),
            // params[24] is reserved field (00)
            sendTime: this._parseDateTime(params[25]),
            countNumber: this._toNumberFromHex(params[26])
        };
    }

    /**
     * Parses +RESP:GTVGN / +RESP:GTVGF (Virtual Ignition On/Off Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTVGN_GTVGF(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            reserved1: this._toString(params[4]),
            reportType: this._toNumber(params[5]), // 2|4|7
            duration: this._toNumber(params[6]), // Duration of Ignition Off (GTVGN) or On (GTVGF)
            gnssAccuracy: this._toNumber(params[7]),
            speed: this._toNumber(params[8], 10, true),
            azimuth: this._toNumber(params[9]),
            altitude: this._toNumber(params[10], 10, true),
            longitude: this._toNumber(params[11], 10, true),
            latitude: this._toNumber(params[12], 10, true),
            gnssUtcTime: this._parseDateTime(params[13]),
            mcc: this._toString(params[14]),
            mnc: this._toString(params[15]),
            lac: this._toNumber(params[16], 16),
            cellId: this._toNumber(params[17], 16),
            reserved2: this._toString(params[18]),
            hourMeterCount: this._toString(params[19]), // HHHHH:MM:SS format
            mileage: this._toNumber(params[20], 10, true),
            sendTime: this._parseDateTime(params[21]),
            countNumber: this._toNumberFromHex(params[22]),
        };
    }

    /**
     * Parses +RESP:GTUPC (Over-the-air Configuration Update Report).
     * This message reports the status of configuration update processes.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTUPC(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            commandId: this._toNumber(params[4]), // 0-999, command ID in update config file
            result: this._toNumber(params[5]), // 100-103|200-202|300-302|304-306
            downloadUrl: this._toString(params[6]), // Complete URL to download configuration
            sendTime: this._parseDateTime(params[7]),
            countNumber: this._toNumberFromHex(params[8])
        };
    }

    /**
     * Parses +RESP:GTEUC (Extended Over-the-air Configuration Update Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTEUC(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            commandId: this._toNumber(params[4]),
            result: this._toNumber(params[5]), // Numerical result code
            downloadUrl: this._toString(params[6]),
            identifierNumber: this._toString(params[7]), // Hex string, e.g., "FFFFFFFF"
            reserved1: this._toString(params[8]),
            reserved2: this._toString(params[9]),
            reserved3: this._toString(params[10]),
            reserved4: this._toString(params[11]),
            sendTime: this._parseDateTime(params[12]),
            countNumber: this._toNumberFromHex(params[13]), // Changed to toString for raw hex string
        };
    }

    /**
     * Parses +RESP:GTBSF (Bluetooth iBeacon Report).
     * This message reports detection of a single Bluetooth iBeacon.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTBSF(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            // params[4] is reserved field
            number: this._toNumber(params[5]), // 0-10, number of detected beacons
            mac: this._toString(params[6]), // 12-byte HEX MAC address
            uuid: this._toString(params[7]), // 32-byte HEX UUID
            major: this._toNumberFromHex(params[8]), // 4-byte HEX Major
            minor: this._toNumberFromHex(params[9]), // 4-byte HEX Minor
            gnssAccuracy: this._toNumber(params[10]),
            speed: this._toNumber(params[11], 10, true),
            azimuth: this._toNumber(params[12]),
            altitude: this._toNumber(params[13], 10, true),
            longitude: this._toNumber(params[14], 10, true),
            latitude: this._toNumber(params[15], 10, true),
            gnssUtcTime: this._parseDateTime(params[16]),
            mcc: this._toString(params[17]),
            mnc: this._toString(params[18]),
            lac: this._toString(params[19]),
            cellId: this._toString(params[20]),
            // params[21] is reserved field (00)
            sendTime: this._parseDateTime(params[22]),
            countNumber: this._toNumberFromHex(params[23])
        };
    }

    /**
     * Parses +RESP:GTSVR (Stolen Vehicle Recovery Message).
     * Format: +RESP:GTSVR,{18 parameters}
     * 
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTSVR(params) {
        if (params.length < 18) {
            throw new Error(`GTSVR message expects 18 parameters, got ${params.length}`);
        }

        return {
            messageType: 'GTSVR',
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: params[1],
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            svrWorkingState: parseInt(params[4]), // 0: Lost connection, 1: Resumed connection, 2: Failed to match
            ghostMacBroadcast: params[5], // 12-character MAC address
            svrAppendingInformation: this._toString(params[6]), // Additional Bluetooth information
            reserved1: params[7],
            gnssAccuracy: parseInt(params[8]),
            speed: parseFloat(params[9]),
            azimuth: parseInt(params[10]),
            altitude: parseFloat(params[11]),
            longitude: parseFloat(params[12]),
            latitude: parseFloat(params[13]),
            gnssUtcTime: this._parseDateTime(params[14]),
            mcc: params[15],
            mnc: params[16],
            lac: params[17],
            cellId: params[18],
            reserved2: params[19] || '00',
            sendTime: this._parseDateTime(params[20]),
            countNumber: params[21]
        };
    }

    /**
     * Gets the appropriate report mask definitions based on report type.
     * @param {string} reportType The type of report ('OBD' or 'OSM')
     * @returns {object} The mask definitions object
     */
    _getReportMaskDefinitions(reportType) {
        const maskDefinitions = {
            OBD: {
                0: 'VIN', 1: 'OBDConnection', 2: 'OBDPowerVoltage', 3: 'SupportedPIDs',
                4: 'EngineRPM', 5: 'VehicleSpeed', 6: 'EngineCoolantTemperature', 7: 'FuelConsumption',
                8: 'DTCsClearedDistance', 9: 'MILActivatedDistance', 10: 'MILStatus',
                11: 'NumberOfDTCs', 12: 'DiagnosticTroubleCodes', 13: 'ThrottlePosition',
                14: 'EngineLoad', 15: 'FuelLevelInput', 16: 'OBDProtocol', 17: 'OBDMileage',
                20: 'GNSSInformation', 21: 'GSMInformation'
            },
            OSM: {
                0: 'VIN', 1: 'OBDConnection', 2: 'OBDPowerVoltage', 3: 'SupportedPIDs',
                4: 'EngineRPM', 5: 'VehicleSpeed', 6: 'EngineCoolantTemperature', 7: 'FuelConsumption',
                8: 'DTCsClearedDistance', 9: 'MILActivatedDistance', 10: 'MILStatus',
                11: 'NumberOfDTCs', 12: 'DiagnosticTroubleCodes', 13: 'ThrottlePosition',
                14: 'EngineLoad', 15: 'FuelLevelInput', 16: 'OBDProtocol',
                20: 'GNSSInformation', 21: 'GSMInformation', 22: 'Mileage' // OBD Mileage
            }
        };
        
        return maskDefinitions[reportType] || maskDefinitions.OBD;
    }

    /**
     * Parses +RESP:GTOBD (OBDII Information Report).
     * Format: +RESP:GTOBD,{32 parameters}
     * 
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTOBD(params) {
        if (params.length < 32) {
            throw new Error(`GTOBD message expects 32 parameters, got ${params.length}`);
        }

        const obdReportMaskDefs = this._getReportMaskDefinitions('OBD');

        const parsedMask = this._parseBitmask(params[5], obdReportMaskDefs);

        const parsedData = {
            messageType: 'GTOBD',
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]), // First VIN
            deviceName: this._toString(params[3]),
            reportType: this._toNumber(params[4]), // 0: Periodic, 1: Real-time request
            reportMask: parsedMask, // Parsed bitmask object
            
            // OBD-specific fields
            obdVin: this._toString(params[6]), // Second VIN (OBD)
            obdConnection: this._toNumber(params[7]), // 0: Not connected, 1: Connected
            obdPowerVoltage: this._toNumber(params[8]), // 0-99999 mV
            supportedPids: this._toString(params[9]), // 8-byte HEX
            supportedPidsParsed: this._parseSupportedPids(params[9]), // Parsed PID support information
            engineRpm: this._toNumber(params[10]), // 0-16383 rpm
            vehicleSpeed: this._toNumber(params[11]), // 0-255 km/h
            engineCoolantTemperature: this._toNumber(params[12]), // -40 to 215°C
            fuelConsumption: this._parseFloatOrSpecial(params[13]), // L/100km, inf, or nan
            dtcsClearedDistance: this._toNumber(params[14]), // 0-65535 km
            milActivatedDistance: this._toNumber(params[15]), // 0-65535 km
            milStatus: this._toNumber(params[16]), // 0: Off, 1: On
            numberOfDtcs: this._toNumber(params[17]), // 0-127
            diagnosticTroubleCodes: this._parseDtcCodes(params[18], this._toNumber(params[17])), // HEX codes
            throttlePosition: this._toNumber(params[19]), // 0-100%
            engineLoad: this._toNumber(params[20]), // 0-100%
            fuelLevelInput: this._toNumber(params[21]), // 0-100%
            obdProtocol: this._parseObdProtocol(params[22]), // Enhanced with protocol parser
            obdMileage: this._toNumber(params[23], 10, true), // 0.0-4294967.0 km
            
            // GNSS Information
            gnssAccuracy: this._toNumber(params[24]),
            speed: this._toNumber(params[25], 10, true), // 0.0-999.9 km/h
            azimuth: this._toNumber(params[26]), // 0-359
            altitude: this._toNumber(params[27], 10, true), // (-)XXXXX.X m
            longitude: this._toNumber(params[28], 10, true), // -180 to 180
            latitude: this._toNumber(params[29], 10, true), // -90 to 90
            gnssUtcTime: this._parseDateTime(params[30]),
            
            // GSM Information
            mcc: this._toString(params[31]), // 4-digit
            mnc: this._toString(params[32]), // 4-digit
            lac: this._toNumber(params[33], 16), // HEX
            cellId: this._toNumber(params[34], 16), // HEX (4 or 8 bytes)
            reserved: this._toString(params[35]) || '00',
            
            // Final fields
            mileage: this._toNumber(params[36], 10, true), // 0.0-4294967.0 km
            sendTime: this._parseDateTime(params[37]),
            countNumber: this._toNumber(params[38],16) // HEX
        };

        return parsedData;
    }

    /**
     * Helper function to parse fuel consumption that can be numeric, 'inf', or 'nan'
     * @param {string} value The fuel consumption value
     * @returns {number|string} Parsed value
     */
    _parseFloatOrSpecial(value) {
        if (value === 'inf' || value === 'nan') {
            return value;
        }
        return this._toNumber(value, 10, true);
    }

    /**
     * Helper function to parse diagnostic trouble codes
     * @param {string} dtcString The DTC string in HEX format
     * @param {number} count Number of DTCs
     * @returns {Array} Array of DTC codes
     */
    _parseDtcCodes(dtcString, count) {
        if (!dtcString || count === 0) {
            return [];
        }
        // Each DTC is typically 4 hex characters (2 bytes)
        const dtcs = [];
        for (let i = 0; i < count && i * 4 < dtcString.length; i++) {
            dtcs.push(dtcString.substr(i * 4, 4));
        }
        return dtcs;
    }


    /**
     * Parses +RESP:GTOPN (OBDII Port Plug In Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTOPN(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            gnssAccuracy: this._toNumber(params[4]),
            speed: this._toNumber(params[5], 10, true),
            azimuth: this._toNumber(params[6]),
            altitude: this._toNumber(params[7], 10, true),
            longitude: this._toNumber(params[8], 10, true),
            latitude: this._toNumber(params[9], 10, true),
            gnssUtcTime: this._parseDateTime(params[10]),
            mcc: this._toString(params[11]),
            mnc: this._toString(params[12]),
            lac: this._toNumber(params[13], 16),
            cellId: this._toNumber(params[14], 16),
            reserved: this._toString(params[15]) || '00',
            sendTime: this._parseDateTime(params[16]),
            countNumber: this._toNumberFromHex(params[17])
        };
    }

    /**
     * Parses +RESP:GTOPF (OBDII Port Plug Out Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTOPF(params) {
        // GTOPF has identical structure to GTOPN
        return this.parseGTOPN(params);
    }

    /**
     * Parses +RESP:GTOER (OBDII Error Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTOER(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),           // 5E0100
            uniqueId: this._toString(params[1]),                  // 135790246811220
            vin: this._toString(params[2]),                       // 1G1JC5444R7252367
            deviceName: this._toString(params[3]),                // (empty)
            code: this._toString(params[4]),                      // 200 (000-999)
            obdProtocol: this._parseObdProtocol(params[5]),       // Enhanced with protocol parser
            reserved1: this._toString(params[6]),                 // (empty) - Reserved field
            gnssAccuracy: this._toNumber(params[7]),              // 0 (0-50)
            speed: this._toNumber(params[8], 10, true),           // 4.3 (0.0-999.9 km/h)
            azimuth: this._toNumber(params[9]),                   // 92 (0-359)
            altitude: this._toNumber(params[10], 10, true),       // 70.0 (±XXXXX.X m)
            longitude: this._toNumber(params[11], 10, true),      // 121.354335 (-180 to 180)
            latitude: this._toNumber(params[12], 10, true),       // 31.222073 (-90 to 90)
            gnssUtcTime: this._parseDateTime(params[13]),         // 20090214013254
            mcc: this._toString(params[14]),                      // 0460
            mnc: this._toString(params[15]),                      // 0000
            lac: this._toNumber(params[16], 16),                  // 18D8 (HEX)
            cellId: this._toNumber(params[17], 16),               // 6141 (HEX)
            reserved2: this._toString(params[18]) || '00',        // (empty) - Reserved field
            sendTime: this._parseDateTime(params[19]),            // 20090214093254
            countNumber: this._toNumberFromHex(params[20])               // 11F0
        };
    }

    /**
     * Parses OBD protocol code and returns detailed protocol information.
     * @param {string} protocolCode The OBD protocol code ('00'-'64')
     * @returns {object} The parsed protocol information
     */
    _parseObdProtocol(protocolCode) {
        const protocols = {
            '00': { code: '00', protocol: 'Unknown', description: 'Searching' },
            '33': { code: '33', protocol: 'ISO 15765', description: 'ID 11bits 500kb' },
            '34': { code: '34', protocol: 'ISO 15765', description: 'ID 29bits 500kb' },
            '35': { code: '35', protocol: 'ISO 15765', description: 'ID 11bits 250kb' },
            '36': { code: '36', protocol: 'ISO 15765', description: 'ID 29bits 250kb' },
            '53': { code: '53', protocol: 'ISO 15765', description: 'ID 11bits 125kbps' },
            '54': { code: '54', protocol: 'ISO 15765', description: 'ID 29bits 25kbps' },
            '63': { code: '63', protocol: 'ISO 15765', description: 'ID 11bits 33.3kbps' },
            '64': { code: '64', protocol: 'ISO 15765', description: 'ID 29bits 33.3kbps' }
        };

        const normalizedCode = protocolCode.padStart(2, '0');
        return protocols[normalizedCode] || {
            code: normalizedCode,
            protocol: 'Unknown',
            description: `Unknown protocol code: ${normalizedCode}`
        };
    }

    /**
     * Parses +RESP:GTJES (Journey Summary Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTJES(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),           // 5E0100
            uniqueId: this._toString(params[1]),                  // 862193022000541
            vin: this._toString(params[2]),                       // 1G1JC5444R7252367
            deviceName: this._toString(params[3]),                // (empty)
            jesMask: this._toString(params[4]),                   // 7F (HEX bitmask)
            journeyFuelConsumption: this._toNumber(params[5]),    // 0 (0-100)
            maxRpm: this._toNumber(params[6]),                    // 1180 (0-16383 rpm)
            averageRpm: this._toNumber(params[7]),                // 1034 (0-16383 rpm)
            maxThrottlePosition: this._toNumber(params[8]),       // 90 (0-100)
            averageThrottlePosition: this._toNumber(params[9]),   // 50 (0-100)
            maxEngineLoad: this._toNumber(params[10]),            // 54 (0-100)
            averageEngineLoad: this._toNumber(params[11]),        // 22 (0-100)
            tripMileage: this._toNumber(params[12]),              // 0 (0-65535 km)
            gnssAccuracy: this._toNumber(params[13]),             // 0 (0-50)
            speed: this._toNumber(params[14], 10, true),          // 0.0 (0.0-999.9 km/h)
            azimuth: this._toNumber(params[15]),                  // 0 (0-359)
            altitude: this._toNumber(params[16], 10, true),       // 58.1 (±XXXXX.X m)
            longitude: this._toNumber(params[17], 10, true),      // 117.201418 (-180 to 180)
            latitude: this._toNumber(params[18], 10, true),       // 31.833063 (-90 to 90)
            gnssUtcTime: this._parseDateTime(params[19]),         // 20131226121346
            mcc: this._toString(params[20]),                      // 0460
            mnc: this._toString(params[21]),                      // 0000
            lac: this._toNumber(params[22], 16),                  // 5678 (HEX)
            cellId: this._toNumber(params[23], 16),               // 2D7E (HEX)
            reserved: this._toString(params[24]) || '00',         // 00
            mileage: this._toNumber(params[25], 10, true),        // Current total mileage
            sendTime: this._parseDateTime(params[26]),            // 20131226121348
            countNumber: this._toNumberFromHex(params[27])               // 000C
        };
    }


    /**
     * Parses +RESP:GTOSM (OBDII Status Monitoring Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTOSM(params) {
        if (params.length < 32) {
            throw new Error(`GTOSM message expects 32 parameters, got ${params.length}`);
        }

        const osmReportMaskDefs = this._getReportMaskDefinitions('OSM');
        const parsedMask = this._parseBitmask(params[6], osmReportMaskDefs);

        return {
            messageType: 'GTOSM',
            protocolVersion: this._parseProtocolVersion(params[0]),           // Protocol Version (HEX)
            uniqueId: this._toString(params[1]),                  // Unique ID (IMEI)
            vin: this._toString(params[2]),                       // VIN (17 chars)
            deviceName: this._toString(params[3]),                // Device Name
            recordId: this._toNumber(params[4]),                  // Record ID (0-8)
            reportType: this._toNumber(params[5]),                // Report Type (0|1)
            reportMask: parsedMask,                               // Parsed Report Mask
            obdVin: this._toString(params[7]),                    // OBD VIN (17 chars)
            obdConnection: this._toNumber(params[8]),             // OBD Connection (0|1)
            obdPowerVoltage: this._toNumber(params[9]),           // OBD Power Voltage (0-99999 mV)
            supportedPids: this._toString(params[10]),            // Supported PIDs (8 HEX)
            supportedPidsParsed: this._parseSupportedPids(params[10]), // Parsed PID support information
            engineRpm: this._toNumber(params[11]),                // Engine RPM (0-16383 rpm)
            vehicleSpeed: this._toNumber(params[12]),             // Vehicle Speed (0-255 km/h)
            engineCoolantTemperature: this._toNumber(params[13]), // Engine Coolant Temperature (-40 to 215°C)
            fuelConsumption: this._parseFloatOrSpecial(params[14]), // Fuel Consumption (0.0-999.9 L/100km|Inf|NaN)
            dtcsClearedDistance: this._toNumber(params[15]),      // DTCs Cleared Distance (0-65535 km)
            milActivatedDistance: this._toNumber(params[16]),     // MIL Activated Distance (0-65535 km)
            milStatus: this._toNumber(params[17]),                // MIL Status (0|1)
            numberOfDtcs: this._toNumber(params[18]),             // Number of DTCs (0-127)
            diagnosticTroubleCodes: this._toString(params[19]),   // Diagnostic Trouble Codes (HEX)
            throttlePosition: this._toNumber(params[20]),         // Throttle Position (0-100%)
            engineLoad: this._toNumber(params[21]),               // Engine Load (0-100%)
            fuelLevelInput: this._toNumber(params[22]),           // Fuel Level Input (0-100%)
            obdProtocol: this._parseObdProtocol(params[23]),      // OBD Protocol (00-64)
            gnssAccuracy: this._toNumber(params[24]),             // GNSS Accuracy
            speed: this._toNumber(params[25], 10, true),          // Speed (0.0-999.9 km/h)
            azimuth: this._toNumber(params[26]),                  // Azimuth (0-359)
            altitude: this._toNumber(params[27], 10, true),       // Altitude (±XXXXX.X m)
            longitude: this._toNumber(params[28], 10, true),      // Longitude (-180 to 180)
            latitude: this._toNumber(params[29], 10, true),       // Latitude (-90 to 90)
            gnssUtcTime: this._parseDateTime(params[30]),         // GNSS UTC Time (YYYYMMDDHHMMSS)
            mcc: this._toString(params[31]),                      // MCC (0XXX)
            mnc: this._toString(params[32]),                      // MNC (0XXX)
            lac: this._toNumber(params[33], 16),                  // LAC (HEX)
            cellId: this._toNumber(params[34], 16),               // Cell ID (HEX)
            reserved: this._toString(params[35]) || '00',         // Reserved (00)
            mileage: this._toNumber(params[36], 10, true),        // Mileage (0.0-4294967.0 km)
            sendTime: this._parseDateTime(params[37]),            // Send Time (YYYYMMDDHHMMSS)
            countNumber: this._toNumberFromHex(params[38])               // Count Number (HEX)
        };
    }


    /**
     * Parses +RESP:GTBAA (Bluetooth Accessory Alarm Report).
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTBAA(params) {
        if (params.length < 24) {
            throw new Error(`GTBAA message expects 24 parameters, got ${params.length}`);
        }

        return {
            messageType: 'GTBAA',
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            index: this._toNumberFromHex(params[4]), // Index of Bluetooth accessory (HEX)
            accessoryType: this._toNumber(params[5]), // 0: No accessory, 13: Relay accessory
            accessoryModel: this._toNumber(params[6]), // Model of Bluetooth accessory
            alarmType: this._toNumberFromHex(params[7]), // HEX - 15: Relay event notification
            appendMask: this._toString(params[8]), // HEX - Bitwise mask for reported data fields
            accessoryName: this._toString(params[9]), // Name of Bluetooth accessory
            accessoryMac: this._toString(params[10]), // MAC address (12 hex chars)
            relayConfigResult: this._toNumber(params[11]), // 0-4: Configuration result
            relayState: this._toNumber(params[12]), // 0-1: Current relay state
            gnssAccuracy: this._toNumber(params[13]),
            speed: this._toNumber(params[14], 10, true),
            azimuth: this._toNumber(params[15]),
            altitude: this._toNumber(params[16], 10, true),
            longitude: this._toNumber(params[17], 10, true),
            latitude: this._toNumber(params[18], 10, true),
            gnssUtcTime: this._parseDateTime(params[19]),
            mcc: this._toString(params[20]),
            mnc: this._toString(params[21]),
            lac: this._toString(params[22]),
            cellId: this._toString(params[23]),
            reserved: this._toString(params[24]) || '00',
            sendTime: this._parseDateTime(params[25]),
            countNumber: this._toNumberFromHex(params[26])
        };
    }

    /**
     * Parses Buffered Reports (+BUFF:GTXXX).
     * It extracts the original command type and re-uses the appropriate ASCII parser.
     * @param {string[]} params The parameters array (excluding "+BUFF:").
     * @param {string} messagePrefix The prefix ('BUFF').
     * @param {string} commandType The original command type (e.g., 'GTFRI').
     * @returns {object} The parsed buffered report.
     */
    parseBufferReport(params, messagePrefix, commandType) {
        // The first parameter in `params` will be the original command type, e.g., 'GTFRI'
        const originalCommandType = commandType; // Already extracted as `commandType`

        // Remove the original command type from params to pass the rest to the specific parser
        const remainingParams = params.slice(1);

        const originalParserFn = this.asciiParsers[originalCommandType];

        if (originalParserFn) {
            try {
                const parsedOriginalMessage = originalParserFn.call(this, remainingParams);
                return {
                    originalCommand: originalCommandType,
                    ...parsedOriginalMessage
                };
            } catch (e) {
                console.error(`Error parsing buffered message for ${originalCommandType}:`, e);
                return null;
            }
        } else {
            console.warn(`No specific parser found for buffered command type: ${originalCommandType}`);
            return {
                originalCommand: originalCommandType,
                rawData: remainingParams.join(',') // Fallback to raw data if no specific parser
            };
        }
    }


        /**
     * Parses +RESP:GTGSM (GSM Cell Information Report).
     * This message includes cellular network information for neighbor cells and serving cell.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
        parseGTGSM(params) {
            const neighborCells = [];
            
            // Parse 6 neighbor cells (parameters 5-40)
            for (let i = 0; i < 6; i++) {
                const baseIndex = 5 + (i * 6);
                neighborCells.push({
                    mcc: this._toString(params[baseIndex]),
                    mnc: this._toString(params[baseIndex + 1]),
                    lac: this._toString(params[baseIndex + 2]),
                    cellId: this._toString(params[baseIndex + 3]),
                    rxLevel: this._toNumber(params[baseIndex + 4]),
                    // params[baseIndex + 5] is reserved field (00)
                });
            }
            
            return {
                protocolVersion: this._parseProtocolVersion(params[0]),
                uniqueId: this._toString(params[1]),
                vin: this._toString(params[2]),
                deviceName: this._toString(params[3]),
                fixType: this._toString(params[4]), // FRI|GIR|RTL
                neighborCells: neighborCells,
                servingCell: {
                    mcc: this._toString(params[41]),
                    mnc: this._toString(params[42]),
                    lac: this._toString(params[43]),
                    cellId: this._toString(params[44]),
                    rxLevel: this._toNumber(params[45]),
                    // params[46] is reserved field (00)
                },
                sendTime: this._parseDateTime(params[47]),
                countNumber: this._toNumberFromHex(params[48])
            };
        }

        /**
         * Parses +RESP:GTGSS (GNSS Status Report).
         * This message provides GNSS signal status, satellite information, and motion status.
         * @param {string[]} params The parameters array.
         * @returns {object} The parsed report.
         */
        parseGTGSS(params) {
            return {
                protocolVersion: this._parseProtocolVersion(params[0]),
                uniqueId: this._toString(params[1]),
                vin: this._toString(params[2]),
                deviceName: this._toString(params[3]),
                gnssSignalStatus: this._toNumber(params[4]), // 0: signal lost, 1: signal recovered
                satellitesInUse: this._toNumber(params[5]), // 0-15 satellites
                motionStatus: this._toString(params[6]), // 2-byte HEX: 11|12|16|1A|21|22|41|42
                // params[7] is reserved field (empty)
                gnssAccuracy: this._toNumber(params[8]),
                speed: this._toNumber(params[9], 10, true),
                azimuth: this._toNumber(params[10]),
                altitude: this._toNumber(params[11], 10, true),
                longitude: this._toNumber(params[12], 10, true),
                latitude: this._toNumber(params[13], 10, true),
                gnssUtcTime: this._parseDateTime(params[14]),
                mcc: this._toString(params[15]),
                mnc: this._toString(params[16]),
                lac: this._toString(params[17]),
                cellId: this._toString(params[18]),
                // params[19] is reserved field (00)
                sendTime: this._parseDateTime(params[20]),
                countNumber: this._toNumberFromHex(params[21])
            };
        }

        
    /**
     * Parses +RESP:GTIDF (Idling Detection Finish Report).
     * This message includes motion status and duration of idling status.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTIDF(params) {
        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            motionStatus: this._toString(params[4]), // 11|12|16|1A|22
            durationOfIdlingStatus: this._toNumber(params[5]), // Duration in seconds (0-999999)
            gnssAccuracy: this._toNumber(params[6]),
            speed: this._toNumber(params[7], 10, true),
            azimuth: this._toNumber(params[8]),
            altitude: this._toNumber(params[9], 10, true),
            longitude: this._toNumber(params[10], 10, true),
            latitude: this._toNumber(params[11], 10, true),
            gnssUtcTime: this._parseDateTime(params[12]),
            mcc: this._toString(params[13]),
            mnc: this._toString(params[14]),
            lac: this._toString(params[15]),
            cellId: this._toString(params[16]),
            // params[17] is reserved field (00)
            mileage: this._toNumber(params[18], 10, true), // In kilometers
            sendTime: this._parseDateTime(params[19]),
            countNumber: this._toNumberFromHex(params[20])
        };
    }

    /**
     * Parses +RESP:GTCRD (Crash Data Packet - ASCII).
     * This message contains a large, compact hexadecimal data field that needs specific decoding.
     * @param {string[]} params The parameters array.
     * @returns {object} The parsed report.
     */
    parseGTCRD(params) {
        // Parameters:
        // 0: Protocol Version
        // 1: Unique ID
        // 2: VIN
        // 3: Device Name
        // 4: Crash Status (single HEX byte, but document example shows '0')
        // 5: Total Frame (integer)
        // 6: Frame Number (integer)
        // 7: Data (long hex string)
        // N-2: Send Time
        // N-1: Count Number

        const crashStatusHex = this._toString(params[4]);
        const crashStatus = {};
        if (crashStatusHex) {
            const crashStatusInt = parseInt(crashStatusHex, 16);
            crashStatus.crashDetected = ((crashStatusInt >> 0) & 1) === 1;
            crashStatus.crashSeverity = (crashStatusInt >> 1) & 0x7; // 3 bits for severity
            crashStatus.xAxisCrashDetected = ((crashStatusInt >> 3) & 1) === 1;
            crashStatus.xAxisDirection = ((crashStatusInt >> 4) & 1) === 1 ? 'negative' : 'positive';
            crashStatus.yAxisCrashDetected = ((crashStatusInt >> 5) & 1) === 1;
            crashStatus.yAxisDirection = ((crashStatusInt >> 6) & 1) === 1 ? 'negative' : 'positive';
            crashStatus.zAxisDetected = ((crashStatusInt >> 7) & 1) === 1;
            crashStatus.zAxisDirection = ((crashStatusInt >> 8) & 1) === 1 ? 'negative' : 'positive';
        }


        const dataHex = this._toString(params[7]);
        const accelerationSamples = [];

        if (dataHex && dataHex.length % 12 === 0) { // 12 characters per XYZ group (4 for X, 4 for Y, 4 for Z)
            for (let i = 0; i < dataHex.length; i += 12) {
                const xHex = dataHex.substring(i, i + 4);
                const yHex = dataHex.substring(i + 4, i + 8);
                const zHex = dataHex.substring(i + 8, i + 12);

                accelerationSamples.push({
                    x: this._hexToSignedDecimal(xHex, 16),
                    y: this._hexToSignedDecimal(yHex, 16),
                    z: this._hexToSignedDecimal(zHex, 16),
                });
            }
        }

        return {
            protocolVersion: this._parseProtocolVersion(params[0]),
            uniqueId: this._toString(params[1]),
            vin: this._toString(params[2]),
            deviceName: this._toString(params[3]),
            crashStatus: crashStatus,
            totalFrames: this._toNumber(params[5]),
            frameNumber: this._toNumber(params[6]),
            accelerationSamples: accelerationSamples,
            sendTime: this._parseDateTime(params[params.length - 2]),
            countNumber: this._toNumberFromHex(params[params.length - 1]), // Changed to toString for raw hex string
        };
    }

    // --- HEX Report Parsers (Section 4) ---

    /**
     * Parses HEX ACK message (+ACK).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXACK(hexMessage) {
        // Example: 2B 41 43 4B 0B 00 FC 17 BF 00 5E 5E 01 00 01 29 56 40 19 03 33 23 5C 02 30 68 41 08 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04 60 00 00 18 77 00 00 87 90 00 00 00 00 00 41 89 37 00 00 00 00 00 00 00 00 00 00 07 E3 03 0D 07 20 30 15 26 60 64 0D 0A
        // Header: 2B 41 43 4B (+ACK)
        // Message Type: 1 byte (Always 0B for ACK in example, but not general according to doc)
        // Report Mask: 4 bytes (FC 17 BF 00) - This is for RSP. For ACK it's 2 bytes 00-FF
        // Length: 2 bytes (00 94)
        // Unique ID: 8 bytes (IMEI/Device Name)
        // Device Type: 1 byte (5E)
        // Protocol Version: 2 bytes
        // Firmware Version: 2 bytes
        // Serial Number: 2 bytes
        // Send Time: 7 bytes (YYYYMMDDHHMMSS)
        // Count Number: 2 bytes
        // Checksum: 2 bytes
        // Tail Characters: 2 bytes (0D 0A)

        // The document's example `+ACK:GTBSI,5E0100,135790246811220,,0000,20090214093254,11F0$`
        // and the HEX `+ACK` example `2B41434B0B00FC37FF0082...` from page 186
        // are different. The HEX example provided for +RSP seems to be used as a template for +ACK/RSP/EVT/INF.
        // Let's rely on the structure defined on page 186 for `+ACK` (HEX).

        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getSignedDecimal = (length, bitLength) => this._hexToSignedDecimal(getHexBytes(length), bitLength);
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // 2B41434B (+ACK)
        const messageType = getDecimal(1); // Usually 0x0B based on example, but general is one byte
        const reportMask = getHexBytes(2); // Example says 2 bytes for +ACK Mask
        const length = getDecimal(2); // Total length of payload excluding header and length itself

        const deviceType = getHexBytes(1); // '5E'
        const protocolVersion = getHexBytes(2);
        const firmwareVersion = getHexBytes(2);
        const uniqueId = getHexBytes(8); // This is actually IMEI/DeviceName combined for HEX
        const vin = getAscii(17); // VIN is variable length, example for +RSP shows 17.

        // The fields after Unique ID seem to follow a more generic format for +RSP/EVT/INF
        // but for +ACK it's simpler based on page 186 table.
        // Parameters for +ACK:
        // Message Header (4), Message Type (1), Report Mask (2), Length (2)
        // Device Type (1), Protocol Version (2), Firmware Version (2)
        // Unique ID (8), Serial Number (2)
        // Send Time (7), Count Number (2)
        // Checksum (2), Tail Characters (2)

        // Redefining parsing based on Page 186 Table for +ACK (HEX)
        offset = 0; // Reset offset for accurate parsing
        getHexBytes(4); // Skip Message Header
        getHexBytes(1); // Skip Message Type (always 0x0B in example, but not universal)
        const hexReportMask = getHexBytes(2); // +ACK Mask (00-FF)
        const hexLength = getDecimal(2); // Length of the data part

        const hexDeviceType = getHexBytes(1); // 5E
        const hexFirmwareVersion = getHexBytes(2);
        const hexUniqueId = getHexBytes(8); // IMEI / Device Name
        const hexSerialNumber = getHexBytes(2); // Kept as hex string for consistency
        const hexSendTime = this._parseHexDateTime(getHexBytes(7)); // BernadotYYMMDDHHMMSS as 7 bytes
        const hexCountNumber = getHexBytes(2); // Kept as hex string for consistency
        const hexChecksum = getHexBytes(2);
        const hexTailCharacters = getHexBytes(2); // 0D 0A

        return {
            messageType: 'HEX_ACK',
            hexHeader: header,
            reportMask: hexReportMask,
            length: hexLength,
            deviceType: hexDeviceType,
            protocolVersion: this._parseProtocolVersion(params[0]),
            firmwareVersion: hexFirmwareVersion,
            uniqueId: hexUniqueId,
            serialNumber: hexSerialNumber, // Raw hex string
            sendTime: hexSendTime, // Already a Date object or null from helper
            countNumber: hexCountNumber, // Raw hex string
            checksum: hexChecksum,
            tailCharacters: hexTailCharacters,
        };
    }

    /**
     * Helper to convert HEX time (7 bytes) to Date.
     * @param {string} hexTime 14 character hex string representing 7 bytes.
     * @returns {Date|null}
     */
    _parseHexDateTime(hexTime) {
        if (!hexTime || hexTime.length !== 14) return null;
        try {
            const year = parseInt(hexTime.substring(0, 4), 16); // 2 bytes for year
            const month = parseInt(hexTime.substring(4, 6), 16) - 1;
            const day = parseInt(hexTime.substring(6, 8), 16);
            const hour = parseInt(hexTime.substring(8, 10), 16);
            const minute = parseInt(hexTime.substring(10, 12), 16);
            const second = parseInt(hexTime.substring(12, 14), 16);
            const date = new Date(year, month, day, hour, minute, second);
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        } catch (e) {
            // Ignore parsing errors and return null
        }
        return null;
    }

    /**
     * Converts a hex string to ASCII string.
     * @param {string} hex The hex string.
     * @returns {string} The ASCII string.
     */
    _hexToAscii(hex) {
        let str = '';
        for (let i = 0; i < hex.length; i += 2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    }

    /**
     * Parses HEX RSP message (+RSP).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXRSP(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getSignedDecimal = (length, bitLength) => this._hexToSignedDecimal(getHexBytes(length), bitLength);
        const getFloat = (length, divisor = 1) => this._toNumber(getHexBytes(length), 16, false) / divisor; // For specific float conversions
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +RSP
        const messageType = getDecimal(1); // Message Type (e.g., 0B for GTTOW)
        const reportMask = getHexBytes(4); // 4 bytes for +RSP Mask (FC 17 BF 00 in example)
        const length = getDecimal(2);

        const deviceType = getHexBytes(1); // 5E
        const protocolVersion = getHexBytes(2);
        const firmwareVersion = getHexBytes(2);
        const uniqueId = getHexBytes(8); // IMEI/DeviceName combined for HEX
        const vin = getAscii(17);

        // Parameters based on Page 190 Table (+RSP)
        // Note: Fields are conditional on Report Mask
        const parsedReport = {
            messageType: 'HEX_RSP',
            hexHeader: header,
            messageCode: messageType, // This represents the report ID/Type sometimes, needs mapping
            reportMask: reportMask,
            length: length,
            deviceType: deviceType,
            protocolVersion: protocolVersion,
            firmwareVersion: firmwareVersion,
            uniqueId: uniqueId,
            vin: vin,
        };

        // Example: 2B 52 53 50 0B 00 FC 17 BF 00 94 5E 01 00 01 29 56 40 19 03 33 23 5C 02 30 68 41 08 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 04 60 00 00 18 77 00 00 87 90 00 00 00 00 00 41 89 37 00 00 00 00 00 00 00 00 00 00 07 E3 03 0D 07 20 30 15 26 60 64 0D 0A
        // This is a simplified parsing. A real parser would need to check each bit in `reportMask`
        // and conditionally parse the corresponding fields.
        // For demonstration, let's parse a fixed set from the example.

        // This is where it gets complex. The document lists fields that are present IF the corresponding
        // bit in the `+RSP Mask` is set.
        // Since I don't have the full GTHRM mask definition, I'll parse based on common fields presence in the example
        // (External Power Voltage, Engine RPM, Fuel Consumption, Fuel Level Input, etc.)

        // Based on the example and general parameter order for common position reports (ASCII)
        // The structure of HEX reports are highly dependent on the masks set by AT+GTHRM.
        // Without the full GTHRM specification, providing a complete and accurate HEX parser
        // that dynamically adapts to mask settings is challenging.
        // I will provide a parser that reads common fields in the expected order based on the example structure.

        // Order as per Page 190-191 table, assuming default mask or a common mask
        parsedReport.externalPowerVoltage = getDecimal(2);
        parsedReport.engineRpm = getDecimal(2);
        parsedReport.fuelConsumption = getFloat(2, 10); // 1 implicit decimal
        parsedReport.fuelLevelInput = getDecimal(1);
        parsedReport.motionStatus = getDecimal(1); // Interpreted from HEX
        parsedReport.satellitesInUse = getDecimal(1);
        const { reportId, reportType } = this._parseReportIdAndType(getHexBytes(1));
        parsedReport.reportId = reportId;
        parsedReport.reportType = reportType;
        parsedReport.number = getDecimal(1); // Number of GNSS positions (usually 1)
        parsedReport.gnssAccuracy = getDecimal(1);
        parsedReport.speed = getFloat(2, 10); // Check if this needs to be signed for negative speed
        parsedReport.azimuth = getDecimal(2);
        parsedReport.altitude = getSignedDecimal(2, 16); // Assuming meters, 2 bytes signed
        parsedReport.longitude = getSignedDecimal(4, 32) / 1000000; // 4 bytes, 6 decimal places
        parsedReport.latitude = getSignedDecimal(4, 32) / 1000000; // 4 bytes, 6 decimal places
        parsedReport.gnssUtcTime = this._parseHexDateTime(getHexBytes(7)); // 7 bytes for datetime
        parsedReport.mcc = getDecimal(2);
        parsedReport.mnc = getDecimal(2);
        parsedReport.lac = getDecimal(2);
        parsedReport.cellId = getDecimal(4); // Can be 4 or 8 in ASCII, usually 4 here.
        parsedReport.reserved = getHexBytes(2); // 2 bytes Reserved (00 00)
        parsedReport.mileage = getDecimal(4) / 10; // 4 bytes, 1 implicit decimal km

        // Hour Meter Count (Optional, 6 bytes)
        // In the example, there are many 00s, implying optional fields not present.
        // This is a best effort to parse the common fields given the documentation.
        // For accurate parsing of HEX, the AT+GTHRM configuration would be essential.
        parsedReport.hourMeterCount = {
             hours: getDecimal(4), // 4 bytes for hours
             minutes: getDecimal(1), // 1 byte for minutes
             seconds: getDecimal(1), // 1 byte for seconds
        };

        parsedReport.sendTime = this._parseHexDateTime(getHexBytes(7));
        parsedReport.countNumber = getHexBytes(2); // Kept as hex string for consistency
        parsedReport.checksum = getHexBytes(2);
        parsedReport.tailCharacters = getHexBytes(2); // 0D 0A

        return parsedReport;
    }

    /**
     * Parses HEX EVT message (+EVT).
     * Similar structure to +RSP, but specific to event reports.
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXEVT(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getSignedDecimal = (length, bitLength) => this._hexToSignedDecimal(getHexBytes(length), bitLength);
        const getFloat = (length, divisor = 1) => this._toNumber(getHexBytes(length), 16, false) / divisor;
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +EVT
        const messageType = getDecimal(1); // Message Type
        const reportMask = getHexBytes(4); // +EVT Mask (FFFFFFFF)
        const length = getDecimal(2);

        const parsedReport = {
            messageType: 'HEX_EVT',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            length: length,
            // ... parse other fields based on the +EVT table (Page 198 onwards)
            // This is a placeholder and needs full definition based on the EVT Mask bits.
            // Example from doc: 2B4556544900FC37FF0082... (example for +RESP:GTSVR)
            deviceType: getHexBytes(1),
            protocolVersion: getHexBytes(2),
            firmwareVersion: getHexBytes(2),
            uniqueId: getHexBytes(8),
            vin: getAscii(17),
            externalPowerVoltage: getDecimal(2),
            motionStatus: getHexBytes(1),
            satellitesInView: getDecimal(1),
            svrWorkingState: getDecimal(1), // Specific to GTSVR
            ghostDeviceMacBroadcast: getHexBytes(6), // Specific to GTSVR
            svrAppendingLength: getDecimal(1), // Specific to GTSVR
            svrAppendingInformation: getHexBytes(getDecimal(1)), // Variable length, needs to read length first, not explicitly defined
            reserved: getHexBytes(1),
            number: getDecimal(1),
            gnssAccuracy: getDecimal(1),
            speed: getFloat(3, 10),
            azimuth: getDecimal(2),
            altitude: getSignedDecimal(2, 16),
            longitude: getSignedDecimal(4, 32) / 1000000,
            latitude: getSignedDecimal(4, 32) / 1000000,
            gnssUtcTime: this._parseHexDateTime(getHexBytes(7)),
            mcc: getDecimal(2),
            mnc: getDecimal(2),
            lac: getDecimal(2),
            cellId: getDecimal(4),
            reserved2: getHexBytes(1),
            currentMileage: getFloat(3, 10),
            totalMileage: getFloat(5, 10),
            currentHourMeterCount: getHexBytes(3), // HHMMSS format hex
            totalHourMeterCount: getHexBytes(6), // HHHHHHMMSS hex
            sendTime: this._parseHexDateTime(getHexBytes(7)),
            countNumber: getHexBytes(2), // Kept as hex string for consistency
            checksum: getHexBytes(2),
            tailCharacters: getHexBytes(2),
        };

        return parsedReport;
    }

    /**
     * Parses HEX INF message (+INF).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXINF(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +INF
        const messageType = getDecimal(1); // Message Type
        const reportMask = getHexBytes(2); // +INF Mask (00-FF)
        const infExpansionMask = getHexBytes(2); // +INF Expansion Mask (00-FF)
        const length = getDecimal(2);

        const parsedReport = {
            messageType: 'HEX_INF',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            infExpansionMask: infExpansionMask,
            length: length,
            // ... fields based on Page 194-195 table and masks
            uniqueId: getHexBytes(8),
            vin: getAscii(17),
            deviceType: getHexBytes(1),
            protocolVersion: getHexBytes(2),
            firmwareVersion: getHexBytes(2),
            hardwareVersion: getHexBytes(2),
            mcuVersion: getHexBytes(2),
            reserved1: getHexBytes(2),
            motionStatus: getHexBytes(1),
            reserved2: getHexBytes(1),
            satellitesInUse: getDecimal(1),
            powerSavingEnableOwHModeOutsideWorkingHoursAgps: getHexBytes(1), // Bitmask
            lastFixUtcTime: this._parseHexDateTime(getHexBytes(7)),
            timeZone: getDecimal(2), // Hex, 2 bytes
            daylightSaving: getDecimal(1),
            csqRssi: getDecimal(1),
            csqBer: getDecimal(1),
            externalPowerSupply: getDecimal(1),
            externalPowerVoltage: getDecimal(2),
            backupBatteryVoltage: getDecimal(2),
            charging: getDecimal(1),
            ledOn: getDecimal(1),
            reserved3: getHexBytes(1),
            reserved4: getHexBytes(1),
            reserved5: getHexBytes(1),
            reserved6: getHexBytes(1),
            reserved7: getHexBytes(1),
            obdProtocol: getHexBytes(1),
            obdConnection: getDecimal(1),
            obdPowerVoltage: getDecimal(2),
            supportedPids: getHexBytes(4),
            supportedPidsParsed: this._parseSupportedPids(getHexBytes(4)),
            engineRpm: getDecimal(2),
            vehicleSpeed: getDecimal(1),
            engineCoolantTemperature: getSignedDecimal(1, 8),
            fuelConsumption: getDecimal(2),
            milStatus: getDecimal(1),
            numberOfDtcs: getDecimal(1),
            dtcs: getHexBytes(getDecimal(1) * 2), // Variable, requires previous field value
            // Continue parsing based on masks and table
            sendTime: this._parseHexDateTime(getHexBytes(7)),
            countNumber: getHexBytes(2), // Kept as hex string for consistency
            checksum: getHexBytes(2),
            tailCharacters: getHexBytes(2),
        };
        return parsedReport;
    }

    /**
     * Parses HEX HBD message (+HBD).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXHBD(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);

        const header = getHexBytes(4); // +HBD
        const messageType = getDecimal(1); // Message Type (always 00)
        const reportMask = getHexBytes(2); // +HBD Mask (00-FF)
        const length = getDecimal(2);

        const parsedReport = {
            messageType: 'HEX_HBD',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            length: length,
            // ... fields based on Page 224 table and masks
            deviceType: getHexBytes(1),
            protocolVersion: getHexBytes(2),
            firmwareVersion: getHexBytes(2),
            uniqueId: getHexBytes(8),
            sendTime: this._parseHexDateTime(getHexBytes(7)),
            countNumber: getHexBytes(2), // Kept as hex string for consistency
            checksum: getHexBytes(2),
            tailCharacters: getHexBytes(2),
        };
        return parsedReport;
    }

    /**
     * Parses HEX CRD message (+CRD).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXCRD(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getSignedDecimal = (length, bitLength) => this._hexToSignedDecimal(getHexBytes(length), bitLength);
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +CRD
        const messageType = getDecimal(1); // Message Type
        const reportMask = getHexBytes(4); // +CRD Mask
        const length = getDecimal(2);

        const deviceType = getHexBytes(1);
        const protocolVersion = getHexBytes(2);
        const firmwareVersion = getHexBytes(2);
        const uniqueId = getHexBytes(8);
        const vin = getAscii(17);

        const crashStatus = getHexBytes(1); // Single byte hex for status bitmask
        const totalFrame = getDecimal(1);
        const frameNumber = getDecimal(1);

        const dataHex = hexMessage.substring(offset, hexMessage.length - (2 + 2) * 2); // Data is until checksum and tail
        const accelerationSamples = [];

        let dataOffset = 0;
        while (dataOffset < dataHex.length) {
            const xHex = dataHex.substring(dataOffset, dataOffset + 4);
            const yHex = dataHex.substring(dataOffset + 4, dataOffset + 8);
            const zHex = dataHex.substring(dataOffset + 8, dataOffset + 12);
            accelerationSamples.push({
                x: this._hexToSignedDecimal(xHex, 16),
                y: this._hexToSignedDecimal(yHex, 16),
                z: this._hexToSignedDecimal(zHex, 16),
            });
            dataOffset += 12;
        }
        offset += dataHex.length; // Update overall offset after consuming dataHex

        const sendTime = this._parseHexDateTime(getHexBytes(7));
        const countNumber = getHexBytes(2); // Kept as hex string for consistency
        const checksum = getHexBytes(2);
        const tailCharacters = getHexBytes(2);

        return {
            messageType: 'HEX_CRD',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            length: length,
            deviceType: deviceType,
            protocolVersion: protocolVersion,
            firmwareVersion: firmwareVersion,
            uniqueId: uniqueId,
            vin: vin,
            crashStatus: crashStatus, // Raw hex for now, could be parsed into object
            totalFrame: totalFrame,
            frameNumber: frameNumber,
            accelerationSamples: accelerationSamples,
            sendTime: sendTime,
            countNumber: countNumber,
            checksum: checksum,
            tailCharacters: tailCharacters,
        };
    }

    /**
     * Parses HEX OBD message (+OBD).
     * This covers +RESP:GTOBD and +RESP:GTOSM in HEX format.
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXOBD(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getSignedDecimal = (length, bitLength) => this._hexToSignedDecimal(getHexBytes(length), bitLength);
        const getFloat = (length, divisor = 1) => this._toNumber(getHexBytes(length), 16, false) / divisor;
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +OBD
        const messageType = getDecimal(1); // Message Type (e.g., 00 for GTOBD, 04 for GTOSM)
        const reportMask = getHexBytes(4); // +OBD Mask (4 bytes)
        const length = getDecimal(2);

        const parsedReport = {
            messageType: 'HEX_OBD',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            length: length,
            deviceType: getHexBytes(1),
            protocolVersion: getHexBytes(2),
            firmwareVersion: getHexBytes(2),
            uniqueId: getHexBytes(8),
            vin: getAscii(17),
            // ... fields based on Page 229-231 table (+OBD)
            reportType: getDecimal(1), // XY for OSM, 0 for GTOBD
            obdReportMask: getHexBytes(4), // Redundant with main reportMask, but exists in table
            vin2: getAscii(17), // VIN again in table, might be conditional
            obdConnection: getDecimal(1),
            obdPowerVoltage: getDecimal(2),
            supportedPids: getHexBytes(4),
            engineRpm: getDecimal(2),
            vehicleSpeed: getDecimal(1),
            engineCoolantTemperature: getSignedDecimal(1, 8),
            fuelConsumption: getFloat(2, 10), // 1 implicit decimal
            milStatus: getDecimal(1),
            numberOfDtcs: getDecimal(1),
            // dtcs: variable length based on numberOfDtcs
            dtcsClearedDistance: getDecimal(2),
            milActivatedDistance: getDecimal(2),
            throttlePosition: getDecimal(1),
            engineLoad: getDecimal(1),
            fuelLevelInput: getDecimal(1),
            obdProtocol: getHexBytes(1),
            // GNSS / GSM information could follow based on masks
            // Example shows GNSS/GSM info as part of the overall flow
            // This is complex and needs more precise mask parsing to extract dynamically.
            // For now, hardcoding common fields based on the example.
            gnssAccuracy: getDecimal(1), // assuming 1 byte
            speed: getFloat(3, 10), // assuming 3 bytes
            azimuth: getDecimal(2), // assuming 2 bytes
            altitude: getSignedDecimal(2, 16), // assuming 2 bytes
            longitude: getSignedDecimal(4, 32) / 1000000,
            latitude: getSignedDecimal(4, 32) / 1000000,
            gnssUtcTime: this._parseHexDateTime(getHexBytes(7)),
            mcc: getDecimal(2),
            mnc: getDecimal(2),
            lac: getDecimal(2),
            cellId: getDecimal(4),
            reserved: getHexBytes(2),
            sendTime: this._parseHexDateTime(getHexBytes(7)),
            countNumber: getHexBytes(2), // Kept as hex string for consistency
            checksum: getHexBytes(2),
            tailCharacters: getHexBytes(2),
        };
        return parsedReport;
    }

    /**
     * Parses HEX ATI message (+ATI).
     * @param {string} hexMessage The full hex message string.
     * @returns {object} The parsed message.
     */
    parseHEXATI(hexMessage) {
        let offset = 0;
        const getHexBytes = (length) => {
            const hex = hexMessage.substring(offset, offset + length * 2);
            offset += length * 2;
            return hex;
        };
        const getDecimal = (length) => this._toNumber(getHexBytes(length), 16);
        const getAscii = (length) => this._hexToAscii(getHexBytes(length));

        const header = getHexBytes(4); // +ATI
        const messageType = getDecimal(1); // Message Type
        const reportMask = getHexBytes(4); // +ATI Mask
        const length = getDecimal(2);

        const parsedReport = {
            messageType: 'HEX_ATI',
            hexHeader: header,
            messageCode: messageType,
            reportMask: reportMask,
            length: length,
            deviceType: getHexBytes(1),
            protocolVersion: getHexBytes(2),
            firmwareVersion: getHexBytes(2),
            uniqueId: getHexBytes(8),
            // ... fields based on Page 228-229 table and masks
            // This needs the ATI Mask bits to dynamically parse.
            // For example, if Bit 0 of ATI Mask is set, Firmware Version is included.
            // I'll parse all fields present in the table as a best effort.
            firmwareVersionField: getAscii(3), // Example shows "V5.00" as text
            mcuFirmwareVersion: getAscii(3),
            obdFirmwareVersion: getAscii(3),
            bluetoothFirmwareVersion: getAscii(3),
            modemFirmwareVersion: getAscii(3),
            hardwareVersion: getAscii(3),
            modemHardwareVersion: getAscii(3),
            sensorId: getAscii(3),
            sendTime: this._parseHexDateTime(getHexBytes(7)),
            countNumber: getHexBytes(2), // Kept as hex string for consistency
            checksum: getHexBytes(2),
            tailCharacters: getHexBytes(2),
        };
        return parsedReport;
    }
}

// Export the parser for use
// For example:
const parser = new QueclinkParser();
const parsedData = parser.parse("+RESP:GTOSM,5E0500,861971050198167,MZBEU812TRN617180,GV500MAP,6,1,71FFFF,MZBEU812TRN617180,1,13553,903A81C0,1108,44,,4.7,10758,0,0,0,,17,17,,33,0,18.4,117,538.9,78.409098,17.403438,20250619151140,0404,0049,4F29,9813,00,7.5,20250619204140,0C0A$");
console.log(parsedData);

export default QueclinkParser;