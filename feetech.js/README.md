# feetech.js

Control feetech servos through browser

## Documentations
https://deepwiki.com/timqian/bambot/4.1-feetech.js-sdk

## Quick start

```bash
# Install the package
npm install feetech.js
```

```javascript
import { scsServoSDK } from 'feetech.js';

// request permission to access the USB device and connect to it
// Note: This will prompt the user to select a USB device
await scsServoSDK.connect();

// read servo position
const position = await scsServoSDK.readPosition(1);
console.log(position); // 1122
```

## Example usage:

- Test and config servos: [bambot.org/feetech.js](https://bambot.org/feetech.js)
- Simple html + js example: [test.html](https://github.com/timqian/bambot/blob/main/feetech.js/test.html)
- Control different bots: [bambot.org](https://bambot.org)


## Ref
- https://github.com/Adam-Software/Feetech-Servo-SDK