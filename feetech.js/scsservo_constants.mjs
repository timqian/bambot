// Constants for FeetTech SCS servos

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

// Control table addresses (SCS servos)
export const ADDR_SCS_TORQUE_ENABLE = 40;
export const ADDR_SCS_GOAL_ACC = 41;
export const ADDR_SCS_GOAL_POSITION = 42;
export const ADDR_SCS_GOAL_SPEED = 46;
export const ADDR_SCS_PRESENT_POSITION = 56;