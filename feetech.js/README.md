# feetech.js

Control feetech servos through browser

## Usage

```bash
# Install the package
npm install feetech.js
```

```javascript
import { scsServoSDK } from 'feetech.js';

await scsServoSDK.connect();

const position = await scsServoSDK.readPosition(1);
console.log(position); // 1122
```

Example usage:

see [test.html](test.html)

## TODO
- write position/speed protection(0-4096)
- syncWriteSpeed

