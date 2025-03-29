#!/usr/bin/env python

BROADCAST_ID = 0xFE  # 254
MAX_ID = 0xFC  # 252
SCS_END = 0

# Instruction for DXL Protocol
INST_PING = 1
INST_READ = 2
INST_WRITE = 3
INST_REG_WRITE = 4
INST_ACTION = 5
INST_SYNC_WRITE = 131  # 0x83
INST_SYNC_READ = 130  # 0x82

# Communication Result
COMM_SUCCESS = 0  # tx or rx packet communication success
COMM_PORT_BUSY = -1  # Port is busy (in use)
COMM_TX_FAIL = -2  # Failed transmit instruction packet
COMM_RX_FAIL = -3  # Failed get status packet
COMM_TX_ERROR = -4  # Incorrect instruction packet
COMM_RX_WAITING = -5  # Now recieving status packet
COMM_RX_TIMEOUT = -6  # There is no status packet
COMM_RX_CORRUPT = -7  # Incorrect status packet
COMM_NOT_AVAILABLE = -9  #


# Macro for Control Table Value
def SCS_GETEND():
    global SCS_END
    return SCS_END

def SCS_SETEND(e):
    global SCS_END
    SCS_END = e

def SCS_TOHOST(a, b):
    if (a & (1<<b)):
        return -(a & ~(1<<b))
    else:
        return a


def SCS_TOSCS(a, b):
    if (a<0):
        return (-a | (1<<b))
    else:
        return a


def SCS_MAKEWORD(a, b):
    global SCS_END
    if SCS_END==0:
        return (a & 0xFF) | ((b & 0xFF) << 8)
    else:
        return (b & 0xFF) | ((a & 0xFF) << 8)


def SCS_MAKEDWORD(a, b):
    return (a & 0xFFFF) | (b & 0xFFFF) << 16


def SCS_LOWORD(l):
    return l & 0xFFFF


def SCS_HIWORD(l):
    return (l >> 16) & 0xFFFF


def SCS_LOBYTE(w):
    global SCS_END
    if SCS_END==0:
        return w & 0xFF
    else:
        return (w >> 8) & 0xFF


def SCS_HIBYTE(w):
    global SCS_END
    if SCS_END==0:
        return (w >> 8) & 0xFF
    else:
        return w & 0xFF