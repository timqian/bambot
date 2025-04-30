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

## Example usage:

- simple example: [test.html](./test.html)
- the bambot website: [bambot.org](https://bambot.org)


