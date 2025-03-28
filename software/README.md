# SCServo JavaScript SDK

This is a JavaScript implementation of the SCServo SDK for controlling Feetech Smart Servos over serial connections. The implementation is based on the original Python SDK but adapted for use in web browsers with the Web Serial API.

## Files

- `scsservo_sdk.mjs` - The main SDK file containing all the necessary classes and functions
- `scsservo_readwrite.html` - Basic example for reading and writing to a single servo
- `scsservo_sync_read_write.html` - Example demonstrating synchronous reading and writing to multiple servos

## How to Use

The SDK provides a modular approach to controlling SCServos:

### Basic Usage

```javascript
import { 
  PortHandler, 
  PacketHandler, 
  COMM_SUCCESS 
} from './scsservo_sdk.mjs';

// Connect to servo
const serialPort = await navigator.serial.requestPort();
await serialPort.open({ baudRate: 1000000 });
const port = new PortHandler(serialPort);
const packetHandler = new PacketHandler(0); // 0 for SCS_END, 1 for SCS_END_PROTOCOL_V2

// Read position from servo
const [position, result, error] = await packetHandler.read4ByteTxRx(port, servoId, address);
if (result === COMM_SUCCESS) {
  console.log(`Position: ${position}`);
} else {
  console.error(`Failed to read position: ${error}`);
}

// Write position to servo
const result = await packetHandler.write4ByteTxRx(port, servoId, address, position);
if (result === COMM_SUCCESS) {
  console.log("Position written successfully");
} else {
  console.error("Failed to write position");
}
```

### Sync Read/Write for Multiple Servos

```javascript
// Create GroupSyncRead instance
const syncRead = new GroupSyncRead(
  port, 
  packetHandler, 
  SCS_ADDR_SCS_PRESENT_POSITION,
  4  // 4 bytes for position
);

// Add servos to read from
syncRead.addParam(id1);
syncRead.addParam(id2);

// Transmit and receive packet
const result = await syncRead.txRxPacket();
if (result === COMM_SUCCESS) {
  // Get positions
  const position1 = syncRead.getData(id1, SCS_ADDR_SCS_PRESENT_POSITION, 4);
  const position2 = syncRead.getData(id2, SCS_ADDR_SCS_PRESENT_POSITION, 4);
}

// Create GroupSyncWrite instance
const syncWrite = new GroupSyncWrite(
  port, 
  packetHandler, 
  SCS_ADDR_SCS_GOAL_POSITION,
  4  // 4 bytes for position
);

// Add servos to write to
syncWrite.addParam(id1, [
  SCS_LOBYTE(SCS_LOWORD(position)),
  SCS_HIBYTE(SCS_LOWORD(position)),
  SCS_LOBYTE(SCS_HIWORD(position)),
  SCS_HIBYTE(SCS_HIWORD(position))
]);

// Send packet
await syncWrite.txPacket();
```

## Browser Compatibility

This SDK uses the Web Serial API, which is currently only supported in Chromium-based browsers (Chrome, Edge, Opera). To use this SDK:

1. Open the HTML example in a compatible browser
2. Click the Connect button to select your serial device
3. Control your servos through the interface

## Important Notes

- The Web Serial API requires a secure context (HTTPS) except for localhost
- You may need to enable the "Experimental Web Platform features" flag in Chrome (chrome://flags/#enable-experimental-web-platform-features) for older browser versions
- The examples assume SCServo servos with compatible firmware to respond to the commands

Follow the instractions here to use bambot: https://github.com/timqian/lerobot-bambot

> We are planing to build a new CLI tool the make it easier. Join the community to get updates

  <a href="https://discord.gg/Fq2gvSMyRJ"><img src="https://badgen.net/static/chat/on%20discord" alt="Discord"></a>
  <a href="https://i.v2ex.co/1U6OSqswl.jpeg"><img src="https://badgen.net/static/chat/on%20wechat?color=green" alt="WeChat"></a>
  <a href="https://x.com/tim_qian"><img src="https://badgen.net/static/follow/on%20X?color=black" alt="X"></a>