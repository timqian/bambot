// Constants
export const BROADCAST_ID = 0xFE;  // 254
export const MAX_ID = 0xFC;  // 252

// Protocol instructions
export const INST_PING = 1;
export const INST_READ = 2;
export const INST_WRITE = 3;
export const INST_REG_WRITE = 4;
export const INST_ACTION = 5;
export const INST_SYNC_WRITE = 131;  // 0x83
export const INST_SYNC_READ = 130;  // 0x82
export const INST_STATUS = 85;  // 0x55, status packet instruction (0x55)

// Communication results
export const COMM_SUCCESS = 0;      // tx or rx packet communication success
export const COMM_PORT_BUSY = -1;   // Port is busy (in use)
export const COMM_TX_FAIL = -2;     // Failed transmit instruction packet
export const COMM_RX_FAIL = -3;     // Failed get status packet
export const COMM_TX_ERROR = -4;    // Incorrect instruction packet
export const COMM_RX_WAITING = -5;  // Now receiving status packet
export const COMM_RX_TIMEOUT = -6;  // There is no status packet
export const COMM_RX_CORRUPT = -7;  // Incorrect status packet
export const COMM_NOT_AVAILABLE = -9;

// Packet constants
export const TXPACKET_MAX_LEN = 250;
export const RXPACKET_MAX_LEN = 250;

// Protocol Packet positions
export const PKT_HEADER0 = 0;
export const PKT_HEADER1 = 1;
export const PKT_ID = 2;
export const PKT_LENGTH = 3;
export const PKT_INSTRUCTION = 4;
export const PKT_ERROR = 4;
export const PKT_PARAMETER0 = 5;

// Protocol Error bits
export const ERRBIT_VOLTAGE = 1;
export const ERRBIT_ANGLE = 2;
export const ERRBIT_OVERHEAT = 4;
export const ERRBIT_OVERELE = 8;
export const ERRBIT_OVERLOAD = 32;

// Default settings
const DEFAULT_BAUDRATE = 1000000;
const LATENCY_TIMER = 16;

// Global protocol end state
let SCS_END = 0; // (STS/SMS=0, SCS=1)

// Utility functions for handling word operations
export function SCS_LOWORD(l) {
  return l & 0xFFFF;
}

export function SCS_HIWORD(l) {
  return (l >> 16) & 0xFFFF;
}

export function SCS_LOBYTE(w) {
  if (SCS_END === 0) {
    return w & 0xFF;
  } else {
    return (w >> 8) & 0xFF;
  }
}

export function SCS_HIBYTE(w) {
  if (SCS_END === 0) {
    return (w >> 8) & 0xFF;
  } else {
    return w & 0xFF;
  }
}

export function SCS_MAKEWORD(a, b) {
  if (SCS_END === 0) {
    return (a & 0xFF) | ((b & 0xFF) << 8);
  } else {
    return (b & 0xFF) | ((a & 0xFF) << 8);
  }
}

export function SCS_MAKEDWORD(a, b) {
  return (a & 0xFFFF) | ((b & 0xFFFF) << 16);
}

export function SCS_TOHOST(a, b) {
  if (a & (1 << b)) {
    return -(a & ~(1 << b));
  } else {
    return a;
  }
}

export class PortHandler {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isOpen = false;
    this.isUsing = false;
    this.baudrate = DEFAULT_BAUDRATE;
    this.packetStartTime = 0;
    this.packetTimeout = 0;
    this.txTimePerByte = 0;
  }
  
  async requestPort() {
    try {
      this.port = await navigator.serial.requestPort();
      return true;
    } catch (err) {
      console.error('Error requesting serial port:', err);
      return false;
    }
  }
  
  async openPort() {
    if (!this.port) {
      return false;
    }
    
    try {
      await this.port.open({ baudRate: this.baudrate });
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();
      this.isOpen = true;
      this.txTimePerByte = (1000.0 / this.baudrate) * 10.0;
      return true;
    } catch (err) {
      console.error('Error opening port:', err);
      return false;
    }
  }
  
  async closePort() {
    if (this.reader) {
      await this.reader.releaseLock();
      this.reader = null;
    }
    
    if (this.writer) {
      await this.writer.releaseLock();
      this.writer = null;
    }
    
    if (this.port && this.isOpen) {
      await this.port.close();
      this.isOpen = false;
    }
  }
  
  async clearPort() {
    if (this.reader) {
      await this.reader.releaseLock();
      this.reader = this.port.readable.getReader();
    }
  }
  
  setBaudRate(baudrate) {
    this.baudrate = baudrate;
    this.txTimePerByte = (1000.0 / this.baudrate) * 10.0;
    return true;
  }
  
  getBaudRate() {
    return this.baudrate;
  }
  
  async writePort(data) {
    if (!this.isOpen || !this.writer) {
      return 0;
    }
    
    try {
      await this.writer.write(new Uint8Array(data));
      return data.length;
    } catch (err) {
      console.error('Error writing to port:', err);
      return 0;
    }
  }
  
  async readPort(length) {
    if (!this.isOpen || !this.reader) {
      return [];
    }
    
    try {
      // Increase timeout for more reliable data reception
      const timeoutMs = 500; 
      let totalBytes = [];
      const startTime = performance.now();
      
      // Continue reading until we get enough bytes or timeout
      while (totalBytes.length < length) {
        // Create a timeout promise
        const timeoutPromise = new Promise(resolve => {
          setTimeout(() => resolve({ value: new Uint8Array(), done: false, timeout: true }), 100); // Short internal timeout
        });
        
        // Race between reading and timeout
        const result = await Promise.race([
          this.reader.read(),
          timeoutPromise
        ]);
        
        if (result.timeout) {
          // Internal timeout - check if we've exceeded total timeout
          if (performance.now() - startTime > timeoutMs) {
            console.log(`readPort total timeout after ${timeoutMs}ms`);
            break;
          }
          continue; // Try reading again
        }
        
        if (result.done) {
          console.log('Reader done, stream closed');
          break;
        }
        
        if (result.value.length === 0) {
          // If there's no data but we haven't timed out yet, wait briefly and try again
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Check if we've exceeded total timeout
          if (performance.now() - startTime > timeoutMs) {
            console.log(`readPort total timeout after ${timeoutMs}ms`);
            break;
          }
          continue;
        }
        
        // Add received bytes to our total
        const newData = Array.from(result.value);
        totalBytes.push(...newData);
        console.log(`Read ${newData.length} bytes:`, newData.map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // If we've got enough data, we can stop
        if (totalBytes.length >= length) {
          break;
        }
      }
      
      return totalBytes;
    } catch (err) {
      console.error('Error reading from port:', err);
      return [];
    }
  }
  
  setPacketTimeout(packetLength) {
    this.packetStartTime = this.getCurrentTime();
    this.packetTimeout = (this.txTimePerByte * packetLength) + (LATENCY_TIMER * 2.0) + 2.0;
  }
  
  setPacketTimeoutMillis(msec) {
    this.packetStartTime = this.getCurrentTime();
    this.packetTimeout = msec;
  }
  
  isPacketTimeout() {
    if (this.getTimeSinceStart() > this.packetTimeout) {
      this.packetTimeout = 0;
      return true;
    }
    return false;
  }
  
  getCurrentTime() {
    return performance.now();
  }
  
  getTimeSinceStart() {
    const timeSince = this.getCurrentTime() - this.packetStartTime;
    if (timeSince < 0.0) {
      this.packetStartTime = this.getCurrentTime();
    }
    return timeSince;
  }
}

export class PacketHandler {
  constructor(protocolEnd = 0) {
    SCS_END = protocolEnd;
    console.log(`PacketHandler initialized with protocol_end=${protocolEnd} (STS/SMS=0, SCS=1)`);
  }
  
  getProtocolVersion() {
    return 1.0;
  }
  
  // 获取当前协议端设置的方法
  getProtocolEnd() {
    return SCS_END;
  }
  
  getTxRxResult(result) {
    if (result === COMM_SUCCESS) {
      return "[TxRxResult] Communication success!";
    } else if (result === COMM_PORT_BUSY) {
      return "[TxRxResult] Port is in use!";
    } else if (result === COMM_TX_FAIL) {
      return "[TxRxResult] Failed transmit instruction packet!";
    } else if (result === COMM_RX_FAIL) {
      return "[TxRxResult] Failed get status packet from device!";
    } else if (result === COMM_TX_ERROR) {
      return "[TxRxResult] Incorrect instruction packet!";
    } else if (result === COMM_RX_WAITING) {
      return "[TxRxResult] Now receiving status packet!";
    } else if (result === COMM_RX_TIMEOUT) {
      return "[TxRxResult] There is no status packet!";
    } else if (result === COMM_RX_CORRUPT) {
      return "[TxRxResult] Incorrect status packet!";
    } else if (result === COMM_NOT_AVAILABLE) {
      return "[TxRxResult] Protocol does not support this function!";
    } else {
      return "";
    }
  }
  
  getRxPacketError(error) {
    if (error & ERRBIT_VOLTAGE) {
      return "[RxPacketError] Input voltage error!";
    }
    if (error & ERRBIT_ANGLE) {
      return "[RxPacketError] Angle sen error!";
    }
    if (error & ERRBIT_OVERHEAT) {
      return "[RxPacketError] Overheat error!";
    }
    if (error & ERRBIT_OVERELE) {
      return "[RxPacketError] OverEle error!";
    }
    if (error & ERRBIT_OVERLOAD) {
      return "[RxPacketError] Overload error!";
    }
    return "";
  }
  
  async txPacket(port, txpacket) {
    let checksum = 0;
    const totalPacketLength = txpacket[PKT_LENGTH] + 4; // 4: HEADER0 HEADER1 ID LENGTH
    
    if (port.isUsing) {
      return COMM_PORT_BUSY;
    }
    port.isUsing = true;
    
    // Check max packet length
    if (totalPacketLength > TXPACKET_MAX_LEN) {
      port.isUsing = false;
      return COMM_TX_ERROR;
    }
    
    // Make packet header
    txpacket[PKT_HEADER0] = 0xFF;
    txpacket[PKT_HEADER1] = 0xFF;
    
    // Add checksum to packet
    for (let idx = 2; idx < totalPacketLength - 1; idx++) {
      checksum += txpacket[idx];
    }
    
    txpacket[totalPacketLength - 1] = (~checksum) & 0xFF;
    
    // TX packet
    await port.clearPort();
    const writtenPacketLength = await port.writePort(txpacket);
    if (totalPacketLength !== writtenPacketLength) {
      port.isUsing = false;
      return COMM_TX_FAIL;
    }
    
    return COMM_SUCCESS;
  }
  
  async rxPacket(port) {
    let rxpacket = [];
    let result = COMM_RX_FAIL;
    
    let waitLength = 6; // minimum length (HEADER0 HEADER1 ID LENGTH)
    
    while (true) {
      const data = await port.readPort(waitLength - rxpacket.length);
      rxpacket.push(...data);
      
      if (rxpacket.length >= waitLength) {
        // Find packet header
        let headerIndex = -1;
        for (let i = 0; i < rxpacket.length - 1; i++) {
          if (rxpacket[i] === 0xFF && rxpacket[i + 1] === 0xFF) {
            headerIndex = i;
            break;
          }
        }
        
        if (headerIndex === 0) {
          // Found at the beginning of the packet
          if (rxpacket[PKT_ID] > 0xFD || rxpacket[PKT_LENGTH] > RXPACKET_MAX_LEN) {
            // Invalid ID or length
            rxpacket.shift();
            continue;
          }
          
          // Recalculate expected packet length
          if (waitLength !== (rxpacket[PKT_LENGTH] + PKT_LENGTH + 1)) {
            waitLength = rxpacket[PKT_LENGTH] + PKT_LENGTH + 1;
            continue;
          }
          
          if (rxpacket.length < waitLength) {
            // Check timeout
            if (port.isPacketTimeout()) {
              result = rxpacket.length === 0 ? COMM_RX_TIMEOUT : COMM_RX_CORRUPT;
              break;
            }
            continue;
          }
          
          // Calculate checksum
          let checksum = 0;
          for (let i = 2; i < waitLength - 1; i++) {
            checksum += rxpacket[i];
          }
          checksum = (~checksum) & 0xFF;
          
          // Verify checksum
          if (rxpacket[waitLength - 1] === checksum) {
            result = COMM_SUCCESS;
          } else {
            result = COMM_RX_CORRUPT;
          }
          break;
        } else if (headerIndex > 0) {
          // Remove unnecessary bytes before header
          rxpacket = rxpacket.slice(headerIndex);
          continue;
        }
      }
      
      // Check timeout
      if (port.isPacketTimeout()) {
        result = rxpacket.length === 0 ? COMM_RX_TIMEOUT : COMM_RX_CORRUPT;
        break;
      }
    }
    
    if (result !== COMM_SUCCESS) {
      console.log(`rxPacket result: ${result}, packet: ${rxpacket.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
    } else {
      console.debug(`rxPacket successful: ${rxpacket.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
    }
    return [rxpacket, result];
  }
  
  async txRxPacket(port, txpacket) {
    let rxpacket = null;
    let error = 0;
    let result = COMM_TX_FAIL;
    
    try {
      // Check if port is already in use
      if (port.isUsing) {
        console.log("Port is busy, cannot start new transaction");
        return [rxpacket, COMM_PORT_BUSY, error];
      }
      
      // TX packet
      console.log("Sending packet:", txpacket.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' '));
      
      // Remove retry logic and just send once
      result = await this.txPacket(port, txpacket);
      console.log(`TX result: ${result}`);
      
      if (result !== COMM_SUCCESS) {
        console.log(`TX failed with result: ${result}`);
        port.isUsing = false; // Important: Release the port on TX failure
        return [rxpacket, result, error];
      }
      
      // If ID is broadcast, no need to wait for status packet
      if (txpacket[PKT_ID] === BROADCAST_ID) {
        port.isUsing = false;
        return [rxpacket, result, error];
      }
      
      // Set packet timeout
      if (txpacket[PKT_INSTRUCTION] === INST_READ) {
        const length = txpacket[PKT_PARAMETER0 + 1];
        // For READ instructions, we expect response to include the data
        port.setPacketTimeout(length + 10); // Add extra buffer
        console.log(`Set READ packet timeout for ${length + 10} bytes`);
      } else {
        // For other instructions, we expect a status packet
        port.setPacketTimeout(10); // HEADER0 HEADER1 ID LENGTH ERROR CHECKSUM + buffer
        console.log(`Set standard packet timeout for 10 bytes`);
      }
      
      // RX packet - no retries, just attempt once
      console.log(`Receiving packet`);
      
      // Clear port before receiving to ensure clean state
      await port.clearPort();
      
      const [rxpacketResult, resultRx] = await this.rxPacket(port);
      rxpacket = rxpacketResult;
      
      // Check if received packet is valid
      if (resultRx !== COMM_SUCCESS) {
        console.log(`Rx failed with result: ${resultRx}`);
        port.isUsing = false;
        return [rxpacket, resultRx, error];
      }
      
      // Verify packet structure
      if (rxpacket.length < 6) {
        console.log(`Received packet too short (${rxpacket.length} bytes)`);
        port.isUsing = false;
        return [rxpacket, COMM_RX_CORRUPT, error];
      }
      
      // Verify packet ID matches the sent ID
      if (rxpacket[PKT_ID] !== txpacket[PKT_ID]) {
        console.log(`Received packet ID (${rxpacket[PKT_ID]}) doesn't match sent ID (${txpacket[PKT_ID]})`);
        port.isUsing = false;
        return [rxpacket, COMM_RX_CORRUPT, error];
      }
      
      // Packet looks valid
      error = rxpacket[PKT_ERROR];
      port.isUsing = false; // Release port on success
      return [rxpacket, resultRx, error];
      
    } catch (err) {
      console.error("Exception in txRxPacket:", err);
      port.isUsing = false; // Release port on exception
      return [rxpacket, COMM_RX_FAIL, error];
    }
  }
  
  async ping(port, scsId) {
    let modelNumber = 0;
    let error = 0;

    try {
      if (scsId >= BROADCAST_ID) {
        console.log(`Cannot ping broadcast ID ${scsId}`);
        return [modelNumber, COMM_NOT_AVAILABLE, error];
      }

      const txpacket = new Array(6).fill(0);
      txpacket[PKT_ID] = scsId;
      txpacket[PKT_LENGTH] = 2;
      txpacket[PKT_INSTRUCTION] = INST_PING;

      console.log(`Pinging servo ID ${scsId}...`);
      
      // 发送ping指令并获取响应
      const [rxpacket, result, err] = await this.txRxPacket(port, txpacket);
      error = err;
      
      // 与Python SDK保持一致：如果ping成功，尝试读取地址3的型号信息
      if (result === COMM_SUCCESS) {
        console.log(`Ping to servo ID ${scsId} succeeded, reading model number from address 3`);
        // 读取地址3的型号信息（2字节）
        const [data, dataResult, dataError] = await this.readTxRx(port, scsId, 3, 2);
        
        if (dataResult === COMM_SUCCESS && data && data.length >= 2) {
          modelNumber = SCS_MAKEWORD(data[0], data[1]);
          console.log(`Model number read: ${modelNumber}`);
        } else {
          console.log(`Could not read model number: ${this.getTxRxResult(dataResult)}`);
        }
      } else {
        console.log(`Ping failed with result: ${result}, error: ${error}`);
      }
      
      return [modelNumber, result, error];
    } catch (error) {
      console.error(`Exception in ping():`, error);
      return [0, COMM_RX_FAIL, 0];
    }
  }
  
  // Read methods
  async readTxRx(port, scsId, address, length) {
    if (scsId >= BROADCAST_ID) {
      console.log('Cannot read from broadcast ID');
      return [[], COMM_NOT_AVAILABLE, 0];
    }
    
    // Create read packet
    const txpacket = new Array(8).fill(0);
    txpacket[PKT_ID] = scsId;
    txpacket[PKT_LENGTH] = 4;
    txpacket[PKT_INSTRUCTION] = INST_READ;
    txpacket[PKT_PARAMETER0] = address;
    txpacket[PKT_PARAMETER0 + 1] = length;
    
    console.log(`Reading ${length} bytes from address ${address} for servo ID ${scsId}`);
    
    // Send packet and get response
    const [rxpacket, result, error] = await this.txRxPacket(port, txpacket);
    
    // Process the result
    if (result !== COMM_SUCCESS) {
      console.log(`Read failed with result: ${result}, error: ${error}`);
      return [[], result, error];
    }
    
    if (!rxpacket || rxpacket.length < PKT_PARAMETER0 + length) {
      console.log(`Invalid response packet: expected at least ${PKT_PARAMETER0 + length} bytes, got ${rxpacket ? rxpacket.length : 0}`);
      return [[], COMM_RX_CORRUPT, error];
    }
    
    // Extract data from response
    const data = [];
    console.log(`Response packet length: ${rxpacket.length}, extracting ${length} bytes from offset ${PKT_PARAMETER0}`);
    console.log(`Response data bytes: ${rxpacket.slice(PKT_PARAMETER0, PKT_PARAMETER0 + length).map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
    
    for (let i = 0; i < length; i++) {
      data.push(rxpacket[PKT_PARAMETER0 + i]);
    }
    
    console.log(`Successfully read ${length} bytes: ${data.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
    return [data, result, error];
  }
  
  async read1ByteTxRx(port, scsId, address) {
    const [data, result, error] = await this.readTxRx(port, scsId, address, 1);
    const value = (data.length > 0) ? data[0] : 0;
    return [value, result, error];
  }
  
  async read2ByteTxRx(port, scsId, address) {
    const [data, result, error] = await this.readTxRx(port, scsId, address, 2);

    let value = 0;
    if (data.length >= 2) {
      value = SCS_MAKEWORD(data[0], data[1]);
    }
    
    return [value, result, error];
  }
  
  async read4ByteTxRx(port, scsId, address) {
    const [data, result, error] = await this.readTxRx(port, scsId, address, 4);
    
    let value = 0;
    if (data.length >= 4) {
      const loword = SCS_MAKEWORD(data[0], data[1]);
      const hiword = SCS_MAKEWORD(data[2], data[3]);
      value = SCS_MAKEDWORD(loword, hiword);
      
      console.log(`read4ByteTxRx: data=${data.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
      console.log(`  loword=${loword} (0x${loword.toString(16)}), hiword=${hiword} (0x${hiword.toString(16)})`);
      console.log(`  value=${value} (0x${value.toString(16)})`);
    }
    
    return [value, result, error];
  }
  
  // Write methods
  async writeTxRx(port, scsId, address, length, data) {
    if (scsId >= BROADCAST_ID) {
      return [COMM_NOT_AVAILABLE, 0];
    }
    
    // Create write packet
    const txpacket = new Array(length + 7).fill(0);
    txpacket[PKT_ID] = scsId;
    txpacket[PKT_LENGTH] = length + 3;
    txpacket[PKT_INSTRUCTION] = INST_WRITE;
    txpacket[PKT_PARAMETER0] = address;
    
    // Add data
    for (let i = 0; i < length; i++) {
      txpacket[PKT_PARAMETER0 + 1 + i] = data[i] & 0xFF;
    }
    
    // Send packet and get response
    const [rxpacket, result, error] = await this.txRxPacket(port, txpacket);
    
    return [result, error];
  }
  
  async write1ByteTxRx(port, scsId, address, data) {
    const dataArray = [data & 0xFF];
    return await this.writeTxRx(port, scsId, address, 1, dataArray);
  }
  
  async write2ByteTxRx(port, scsId, address, data) {
    const dataArray = [
      SCS_LOBYTE(data),
      SCS_HIBYTE(data)
    ];
    return await this.writeTxRx(port, scsId, address, 2, dataArray);
  }
  
  async write4ByteTxRx(port, scsId, address, data) {
    const dataArray = [
      SCS_LOBYTE(SCS_LOWORD(data)),
      SCS_HIBYTE(SCS_LOWORD(data)),
      SCS_LOBYTE(SCS_HIWORD(data)),
      SCS_HIBYTE(SCS_HIWORD(data))
    ];
    return await this.writeTxRx(port, scsId, address, 4, dataArray);
  }
  
  // Add syncReadTx for GroupSyncRead functionality
  async syncReadTx(port, startAddress, dataLength, param, paramLength) {
    // Create packet: HEADER0 HEADER1 ID LEN INST START_ADDR DATA_LEN PARAM... CHKSUM
    const txpacket = new Array(paramLength + 8).fill(0);

    txpacket[PKT_ID] = BROADCAST_ID;
    txpacket[PKT_LENGTH] = paramLength + 4; // 4: INST START_ADDR DATA_LEN CHKSUM
    txpacket[PKT_INSTRUCTION] = INST_SYNC_READ;
    txpacket[PKT_PARAMETER0] = startAddress;
    txpacket[PKT_PARAMETER0 + 1] = dataLength;

    // Add parameters
    for (let i = 0; i < paramLength; i++) {
      txpacket[PKT_PARAMETER0 + 2 + i] = param[i];
    }

    // Calculate checksum
    const totalLen = txpacket[PKT_LENGTH] + 4; // 4: HEADER0 HEADER1 ID LENGTH
    
    // Add headers
    txpacket[PKT_HEADER0] = 0xFF;
    txpacket[PKT_HEADER1] = 0xFF;
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 2; i < totalLen - 1; i++) {
      checksum += txpacket[i] & 0xFF;
    }
    txpacket[totalLen - 1] = (~checksum) & 0xFF;

    console.log(`SyncReadTx: ${txpacket.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);

    // Send packet
    await port.clearPort();
    const bytesWritten = await port.writePort(txpacket);
    if (bytesWritten !== totalLen) {
      return COMM_TX_FAIL;
    }
    
    // Set timeout based on expected response size
    port.setPacketTimeout((6 + dataLength) * paramLength);

    return COMM_SUCCESS;
  }

  // Add syncWriteTxOnly for GroupSyncWrite functionality
  async syncWriteTxOnly(port, startAddress, dataLength, param, paramLength) {
    // Create packet: HEADER0 HEADER1 ID LEN INST START_ADDR DATA_LEN PARAM... CHKSUM
    const txpacket = new Array(paramLength + 8).fill(0);

    txpacket[PKT_ID] = BROADCAST_ID;
    txpacket[PKT_LENGTH] = paramLength + 4; // 4: INST START_ADDR DATA_LEN CHKSUM
    txpacket[PKT_INSTRUCTION] = INST_SYNC_WRITE;
    txpacket[PKT_PARAMETER0] = startAddress;
    txpacket[PKT_PARAMETER0 + 1] = dataLength;

    // Add parameters
    for (let i = 0; i < paramLength; i++) {
      txpacket[PKT_PARAMETER0 + 2 + i] = param[i];
    }

    // Calculate checksum
    const totalLen = txpacket[PKT_LENGTH] + 4; // 4: HEADER0 HEADER1 ID LENGTH
    
    // Add headers
    txpacket[PKT_HEADER0] = 0xFF;
    txpacket[PKT_HEADER1] = 0xFF;
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 2; i < totalLen - 1; i++) {
      checksum += txpacket[i] & 0xFF;
    }
    txpacket[totalLen - 1] = (~checksum) & 0xFF;

    console.log(`SyncWriteTxOnly: ${txpacket.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);

    // Send packet - for sync write, we don't need a response
    await port.clearPort();
    const bytesWritten = await port.writePort(txpacket);
    if (bytesWritten !== totalLen) {
      return COMM_TX_FAIL;
    }
    
    return COMM_SUCCESS;
  }
  
  // 辅助方法：格式化数据包结构以方便调试
  formatPacketStructure(packet) {
    if (!packet || packet.length < 4) {
      return "Invalid packet (too short)";
    }
    
    try {
      let result = "";
      result += `HEADER: ${packet[0].toString(16).padStart(2,'0')} ${packet[1].toString(16).padStart(2,'0')} | `;
      result += `ID: ${packet[2]} | `;
      result += `LENGTH: ${packet[3]} | `;
      
      if (packet.length >= 5) {
        result += `ERROR/INST: ${packet[4].toString(16).padStart(2,'0')} | `;
      }
      
      if (packet.length >= 6) {
        result += "PARAMS: ";
        for (let i = 5; i < packet.length - 1; i++) {
          result += `${packet[i].toString(16).padStart(2,'0')} `;
        }
        result += `| CHECKSUM: ${packet[packet.length-1].toString(16).padStart(2,'0')}`;
      }
      
      return result;
    } catch (e) {
      return "Error formatting packet: " + e.message;
    }
  }
  
  /**
   * 从响应包中解析舵机型号
   * @param {Array} rxpacket - 响应数据包
   * @returns {number} 舵机型号
   */
  parseModelNumber(rxpacket) {
    if (!rxpacket || rxpacket.length < 7) {
      return 0;
    }
    
    // 检查是否有参数字段
    if (rxpacket.length <= PKT_PARAMETER0 + 1) {
      return 0;
    }
    
    const param1 = rxpacket[PKT_PARAMETER0];
    const param2 = rxpacket[PKT_PARAMETER0 + 1];
    
    if (SCS_END === 0) {
      // STS/SMS 协议的字节顺序
      return SCS_MAKEWORD(param1, param2);
    } else {
      // SCS 协议的字节顺序
      return SCS_MAKEWORD(param2, param1);
    }
  }
  
  /**
   * Verify packet header
   * @param {Array} packet - The packet to verify
   * @returns {Number} COMM_SUCCESS if packet is valid, error code otherwise
   */
  getPacketHeader(packet) {
    if (!packet || packet.length < 4) {
      return COMM_RX_CORRUPT;
    }
    
    // Check header
    if (packet[PKT_HEADER0] !== 0xFF || packet[PKT_HEADER1] !== 0xFF) {
      return COMM_RX_CORRUPT;
    }
    
    // Check ID validity
    if (packet[PKT_ID] > 0xFD) {
      return COMM_RX_CORRUPT;
    }
    
    // Check length
    if (packet.length != (packet[PKT_LENGTH] + 4)) {
      return COMM_RX_CORRUPT;
    }
    
    // Calculate checksum
    let checksum = 0;
    for (let i = 2; i < packet.length - 1; i++) {
      checksum += packet[i] & 0xFF;
    }
    checksum = (~checksum) & 0xFF;
    
    // Verify checksum
    if (packet[packet.length - 1] !== checksum) {
      return COMM_RX_CORRUPT;
    }
    
    return COMM_SUCCESS;
  }
}

/**
 * GroupSyncRead class
 * - This class is used to read multiple servos with the same control table address at once
 */
export class GroupSyncRead {
  constructor(port, ph, startAddress, dataLength) {
    this.port = port;
    this.ph = ph;
    this.startAddress = startAddress;
    this.dataLength = dataLength;
    
    this.isAvailableServiceID = new Set();
    this.dataDict = new Map();
    this.param = [];
    this.clearParam();
  }

  makeParam() {
    this.param = [];
    for (const id of this.isAvailableServiceID) {
      this.param.push(id);
    }
    return this.param.length;
  }

  addParam(scsId) {
    if (this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    this.isAvailableServiceID.add(scsId);
    this.dataDict.set(scsId, new Array(this.dataLength).fill(0));
    return true;
  }

  removeParam(scsId) {
    if (!this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    this.isAvailableServiceID.delete(scsId);
    this.dataDict.delete(scsId);
    return true;
  }

  clearParam() {
    this.isAvailableServiceID.clear();
    this.dataDict.clear();
    return true;
  }

  async txPacket() {
    if (this.isAvailableServiceID.size === 0) {
      return COMM_NOT_AVAILABLE;
    }

    const paramLength = this.makeParam();
    return await this.ph.syncReadTx(this.port, this.startAddress, this.dataLength, this.param, paramLength);
  }

  async rxPacket() {
    let result = COMM_RX_FAIL;

    if (this.isAvailableServiceID.size === 0) {
      return COMM_NOT_AVAILABLE;
    }

    // Set all servos' data as invalid
    for (const id of this.isAvailableServiceID) {
      this.dataDict.set(id, new Array(this.dataLength).fill(0));
      console.log(`Cleared data for servo ID ${id}`);
    }

    const [rxpacket, rxResult] = await this.ph.rxPacket(this.port);
    if (rxResult !== COMM_SUCCESS || !rxpacket || rxpacket.length === 0) {
      return rxResult;
    }

    // More tolerant of packets with unexpected values in the PKT_ERROR field
    // Don't require INST_STATUS to be exactly 0x55
    console.log(`GroupSyncRead rxPacket: ID=${rxpacket[PKT_ID]}, ERROR/INST field=0x${rxpacket[PKT_ERROR].toString(16)}`);

    // Check if the packet matches any of the available IDs
    if (!this.isAvailableServiceID.has(rxpacket[PKT_ID])) {
      console.log(`Received packet with ID ${rxpacket[PKT_ID]} which is not in the available IDs list`);
      return COMM_RX_CORRUPT;
    }

    // Extract data for the matching ID
    const scsId = rxpacket[PKT_ID];
    const data = new Array(this.dataLength).fill(0);

    // Extract the parameter data, which should start at PKT_PARAMETER0
    if (rxpacket.length < PKT_PARAMETER0 + this.dataLength) {
      console.log(`Packet too short: expected ${PKT_PARAMETER0 + this.dataLength} bytes, got ${rxpacket.length}`);
      return COMM_RX_CORRUPT;
    }

    for (let i = 0; i < this.dataLength; i++) {
      data[i] = rxpacket[PKT_PARAMETER0 + i];
    }

    // Update the data dict
    this.dataDict.set(scsId, data);
    console.log(`Updated data for servo ID ${scsId}: ${data.map(b => '0x' + b.toString(16).padStart(2,'0')).join(' ')}`);
    
    // Continue receiving until timeout or all data is received
    if (this.isAvailableServiceID.size > 1) {
      result = await this.rxPacket();
    } else {
      result = COMM_SUCCESS;
    }

    return result;
  }

  async txRxPacket() {
    try {
      // First check if port is being used
      if (this.port.isUsing) {
        console.log("Port is busy, cannot start sync read operation");
        return COMM_PORT_BUSY;
      }
      
      // Start the transmission
      console.log("Starting sync read TX/RX operation...");
      let result = await this.txPacket();
      if (result !== COMM_SUCCESS) {
        console.log(`Sync read TX failed with result: ${result}`);
        return result;
      }

      // Get a single response with a standard timeout
      console.log(`Attempting to receive a response...`);
      
      // Receive a single response
      result = await this.rxPacket();
      console.log(`Sync read RX result###: ${result}`);
      // Release port
      this.port.isUsing = false;
      
      return result;
    } catch (error) {
      console.error("Exception in GroupSyncRead txRxPacket:", error);
      // Make sure port is released
      this.port.isUsing = false;
      return COMM_RX_FAIL;
    }
  }

  isAvailable(scsId, address, dataLength) {
    if (!this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    const startAddr = this.startAddress;
    const endAddr = startAddr + this.dataLength - 1;
    
    const reqStartAddr = address;
    const reqEndAddr = reqStartAddr + dataLength - 1;
    
    if (reqStartAddr < startAddr || reqEndAddr > endAddr) {
      return false;
    }

    const data = this.dataDict.get(scsId);
    if (!data || data.length === 0) {
      return false;
    }

    return true;
  }

  getData(scsId, address, dataLength) {
    if (!this.isAvailable(scsId, address, dataLength)) {
      return 0;
    }

    const startAddr = this.startAddress;
    const data = this.dataDict.get(scsId);
    
    // Calculate data offset
    const dataOffset = address - startAddr;
    
    // Combine bytes according to dataLength
    switch (dataLength) {
      case 1:
        return data[dataOffset];
      case 2:
        return SCS_MAKEWORD(data[dataOffset], data[dataOffset + 1]);
      case 4:
        return SCS_MAKEDWORD(
          SCS_MAKEWORD(data[dataOffset], data[dataOffset + 1]),
          SCS_MAKEWORD(data[dataOffset + 2], data[dataOffset + 3])
        );
      default:
        return 0;
    }
  }
}

/**
 * GroupSyncWrite class
 * - This class is used to write multiple servos with the same control table address at once
 */
export class GroupSyncWrite {
  constructor(port, ph, startAddress, dataLength) {
    this.port = port;
    this.ph = ph;
    this.startAddress = startAddress;
    this.dataLength = dataLength;
    
    this.isAvailableServiceID = new Set();
    this.dataDict = new Map();
    this.param = [];
    this.clearParam();
  }

  makeParam() {
    this.param = [];
    for (const id of this.isAvailableServiceID) {
      // Add ID to parameter
      this.param.push(id);

      // Add data to parameter
      const data = this.dataDict.get(id);
      for (let i = 0; i < this.dataLength; i++) {
        this.param.push(data[i]);
      }
    }
    return this.param.length;
  }

  addParam(scsId, data) {
    if (this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    if (data.length !== this.dataLength) {
      console.error(`Data length (${data.length}) doesn't match required length (${this.dataLength})`);
      return false;
    }

    this.isAvailableServiceID.add(scsId);
    this.dataDict.set(scsId, data);
    return true;
  }

  removeParam(scsId) {
    if (!this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    this.isAvailableServiceID.delete(scsId);
    this.dataDict.delete(scsId);
    return true;
  }

  changeParam(scsId, data) {
    if (!this.isAvailableServiceID.has(scsId)) {
      return false;
    }

    if (data.length !== this.dataLength) {
      console.error(`Data length (${data.length}) doesn't match required length (${this.dataLength})`);
      return false;
    }

    this.dataDict.set(scsId, data);
    return true;
  }

  clearParam() {
    this.isAvailableServiceID.clear();
    this.dataDict.clear();
    return true;
  }

  async txPacket() {
    if (this.isAvailableServiceID.size === 0) {
      return COMM_NOT_AVAILABLE;
    }

    const paramLength = this.makeParam();
    return await this.ph.syncWriteTxOnly(this.port, this.startAddress, this.dataLength, this.param, paramLength);
  }
}
