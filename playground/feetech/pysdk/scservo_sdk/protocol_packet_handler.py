#!/usr/bin/env python

from .scservo_def import *

TXPACKET_MAX_LEN = 250
RXPACKET_MAX_LEN = 250

# for Protocol Packet
PKT_HEADER0 = 0
PKT_HEADER1 = 1
PKT_ID = 2
PKT_LENGTH = 3
PKT_INSTRUCTION = 4
PKT_ERROR = 4
PKT_PARAMETER0 = 5

# Protocol Error bit
ERRBIT_VOLTAGE = 1
ERRBIT_ANGLE = 2
ERRBIT_OVERHEAT = 4
ERRBIT_OVERELE = 8
ERRBIT_OVERLOAD = 32


class protocol_packet_handler(object):
    def getProtocolVersion(self):
        return 1.0

    def getTxRxResult(self, result):
        if result == COMM_SUCCESS:
            return "[TxRxResult] Communication success!"
        elif result == COMM_PORT_BUSY:
            return "[TxRxResult] Port is in use!"
        elif result == COMM_TX_FAIL:
            return "[TxRxResult] Failed transmit instruction packet!"
        elif result == COMM_RX_FAIL:
            return "[TxRxResult] Failed get status packet from device!"
        elif result == COMM_TX_ERROR:
            return "[TxRxResult] Incorrect instruction packet!"
        elif result == COMM_RX_WAITING:
            return "[TxRxResult] Now receiving status packet!"
        elif result == COMM_RX_TIMEOUT:
            return "[TxRxResult] There is no status packet!"
        elif result == COMM_RX_CORRUPT:
            return "[TxRxResult] Incorrect status packet!"
        elif result == COMM_NOT_AVAILABLE:
            return "[TxRxResult] Protocol does not support this function!"
        else:
            return ""

    def getRxPacketError(self, error):
        if error & ERRBIT_VOLTAGE:
            return "[RxPacketError] Input voltage error!"

        if error & ERRBIT_ANGLE:
            return "[RxPacketError] Angle sen error!"

        if error & ERRBIT_OVERHEAT:
            return "[RxPacketError] Overheat error!"

        if error & ERRBIT_OVERELE:
            return "[RxPacketError] OverEle error!"
        
        if error & ERRBIT_OVERLOAD:
            return "[RxPacketError] Overload error!"

        return ""

    def txPacket(self, port, txpacket):
        checksum = 0
        total_packet_length = txpacket[PKT_LENGTH] + 4  # 4: HEADER0 HEADER1 ID LENGTH

        if port.is_using:
            return COMM_PORT_BUSY
        port.is_using = True

        # check max packet length
        if total_packet_length > TXPACKET_MAX_LEN:
            port.is_using = False
            return COMM_TX_ERROR

        # make packet header
        txpacket[PKT_HEADER0] = 0xFF
        txpacket[PKT_HEADER1] = 0xFF

        # add a checksum to the packet
        for idx in range(2, total_packet_length - 1):  # except header, checksum
            checksum += txpacket[idx]

        txpacket[total_packet_length - 1] = ~checksum & 0xFF

        #print "[TxPacket] %r" % txpacket

        # tx packet
        port.clearPort()
        written_packet_length = port.writePort(txpacket)
        if total_packet_length != written_packet_length:
            port.is_using = False
            return COMM_TX_FAIL

        return COMM_SUCCESS

    def rxPacket(self, port):
        rxpacket = []

        result = COMM_TX_FAIL
        checksum = 0
        rx_length = 0
        wait_length = 6  # minimum length (HEADER0 HEADER1 ID LENGTH ERROR CHKSUM)

        while True:
            rxpacket.extend(port.readPort(wait_length - rx_length))
            rx_length = len(rxpacket)
            if rx_length >= wait_length:
                # find packet header
                for idx in range(0, (rx_length - 1)):
                    if (rxpacket[idx] == 0xFF) and (rxpacket[idx + 1] == 0xFF):
                        break

                if idx == 0:  # found at the beginning of the packet
                    if (rxpacket[PKT_ID] > 0xFD) or (rxpacket[PKT_LENGTH] > RXPACKET_MAX_LEN) or (
                            rxpacket[PKT_ERROR] > 0x7F):
                        # unavailable ID or unavailable Length or unavailable Error
                        # remove the first byte in the packet
                        del rxpacket[0]
                        rx_length -= 1
                        continue

                    # re-calculate the exact length of the rx packet
                    if wait_length != (rxpacket[PKT_LENGTH] + PKT_LENGTH + 1):
                        wait_length = rxpacket[PKT_LENGTH] + PKT_LENGTH + 1
                        continue

                    if rx_length < wait_length:
                        # check timeout
                        if port.isPacketTimeout():
                            if rx_length == 0:
                                result = COMM_RX_TIMEOUT
                            else:
                                result = COMM_RX_CORRUPT
                            break
                        else:
                            continue

                    # calculate checksum
                    for i in range(2, wait_length - 1):  # except header, checksum
                        checksum += rxpacket[i]
                    checksum = ~checksum & 0xFF

                    # verify checksum
                    if rxpacket[wait_length - 1] == checksum:
                        result = COMM_SUCCESS
                    else:
                        result = COMM_RX_CORRUPT
                    break

                else:
                    # remove unnecessary packets
                    del rxpacket[0: idx]
                    rx_length -= idx

            else:
                # check timeout
                if port.isPacketTimeout():
                    if rx_length == 0:
                        result = COMM_RX_TIMEOUT
                    else:
                        result = COMM_RX_CORRUPT
                    break

        port.is_using = False

        #print "[RxPacket] %r" % rxpacket

        return rxpacket, result

    def txRxPacket(self, port, txpacket):
        rxpacket = None
        error = 0

        # tx packet
        result = self.txPacket(port, txpacket)
        if result != COMM_SUCCESS:
            return rxpacket, result, error

        # (ID == Broadcast ID) == no need to wait for status packet or not available
        if (txpacket[PKT_ID] == BROADCAST_ID):
            port.is_using = False
            return rxpacket, result, error

        # set packet timeout
        if txpacket[PKT_INSTRUCTION] == INST_READ:
            port.setPacketTimeout(txpacket[PKT_PARAMETER0 + 1] + 6)
        else:
            port.setPacketTimeout(6)  # HEADER0 HEADER1 ID LENGTH ERROR CHECKSUM

        # rx packet
        while True:
            rxpacket, result = self.rxPacket(port)
            if result != COMM_SUCCESS or txpacket[PKT_ID] == rxpacket[PKT_ID]:
                break

        if result == COMM_SUCCESS and txpacket[PKT_ID] == rxpacket[PKT_ID]:
            error = rxpacket[PKT_ERROR]

        return rxpacket, result, error

    def ping(self, port, scs_id):
        model_number = 0
        error = 0

        txpacket = [0] * 6

        if scs_id >= BROADCAST_ID:
            return model_number, COMM_NOT_AVAILABLE, error

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = 2
        txpacket[PKT_INSTRUCTION] = INST_PING

        rxpacket, result, error = self.txRxPacket(port, txpacket)

        if result == COMM_SUCCESS:
            data_read, result, error = self.readTxRx(port, scs_id, 3, 2)  # Address 3 : Model Number
            if result == COMM_SUCCESS:
                model_number = SCS_MAKEWORD(data_read[0], data_read[1])

        return model_number, result, error

    def action(self, port, scs_id):
        txpacket = [0] * 6

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = 2
        txpacket[PKT_INSTRUCTION] = INST_ACTION

        _, result, _ = self.txRxPacket(port, txpacket)

        return result

    def readTx(self, port, scs_id, address, length):

        txpacket = [0] * 8

        if scs_id >= BROADCAST_ID:
            return COMM_NOT_AVAILABLE

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = 4
        txpacket[PKT_INSTRUCTION] = INST_READ
        txpacket[PKT_PARAMETER0 + 0] = address
        txpacket[PKT_PARAMETER0 + 1] = length

        result = self.txPacket(port, txpacket)

        # set packet timeout
        if result == COMM_SUCCESS:
            port.setPacketTimeout(length + 6)

        return result

    def readRx(self, port, scs_id, length):
        result = COMM_TX_FAIL
        error = 0

        rxpacket = None
        data = []

        while True:
            rxpacket, result = self.rxPacket(port)

            if result != COMM_SUCCESS or rxpacket[PKT_ID] == scs_id:
                break

        if result == COMM_SUCCESS and rxpacket[PKT_ID] == scs_id:
            error = rxpacket[PKT_ERROR]

            data.extend(rxpacket[PKT_PARAMETER0: PKT_PARAMETER0 + length])

        return data, result, error

    def readTxRx(self, port, scs_id, address, length):
        txpacket = [0] * 8
        data = []

        if scs_id >= BROADCAST_ID:
            return data, COMM_NOT_AVAILABLE, 0

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = 4
        txpacket[PKT_INSTRUCTION] = INST_READ
        txpacket[PKT_PARAMETER0 + 0] = address
        txpacket[PKT_PARAMETER0 + 1] = length

        rxpacket, result, error = self.txRxPacket(port, txpacket)
        if result == COMM_SUCCESS:
            error = rxpacket[PKT_ERROR]

            data.extend(rxpacket[PKT_PARAMETER0: PKT_PARAMETER0 + length])

        return data, result, error

    def read1ByteTx(self, port, scs_id, address):
        return self.readTx(port, scs_id, address, 1)

    def read1ByteRx(self, port, scs_id):
        data, result, error = self.readRx(port, scs_id, 1)
        data_read = data[0] if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def read1ByteTxRx(self, port, scs_id, address):
        data, result, error = self.readTxRx(port, scs_id, address, 1)
        data_read = data[0] if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def read2ByteTx(self, port, scs_id, address):
        return self.readTx(port, scs_id, address, 2)

    def read2ByteRx(self, port, scs_id):
        data, result, error = self.readRx(port, scs_id, 2)
        data_read = SCS_MAKEWORD(data[0], data[1]) if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def read2ByteTxRx(self, port, scs_id, address):
        data, result, error = self.readTxRx(port, scs_id, address, 2)
        data_read = SCS_MAKEWORD(data[0], data[1]) if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def read4ByteTx(self, port, scs_id, address):
        return self.readTx(port, scs_id, address, 4)

    def read4ByteRx(self, port, scs_id):
        data, result, error = self.readRx(port, scs_id, 4)
        data_read = SCS_MAKEDWORD(SCS_MAKEWORD(data[0], data[1]),
                                  SCS_MAKEWORD(data[2], data[3])) if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def read4ByteTxRx(self, port, scs_id, address):
        data, result, error = self.readTxRx(port, scs_id, address, 4)
        data_read = SCS_MAKEDWORD(SCS_MAKEWORD(data[0], data[1]),
                                  SCS_MAKEWORD(data[2], data[3])) if (result == COMM_SUCCESS) else 0
        return data_read, result, error

    def writeTxOnly(self, port, scs_id, address, length, data):
        txpacket = [0] * (length + 7)

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = length + 3
        txpacket[PKT_INSTRUCTION] = INST_WRITE
        txpacket[PKT_PARAMETER0] = address

        txpacket[PKT_PARAMETER0 + 1: PKT_PARAMETER0 + 1 + length] = data[0: length]

        result = self.txPacket(port, txpacket)
        port.is_using = False

        return result

    def writeTxRx(self, port, scs_id, address, length, data):
        txpacket = [0] * (length + 7)

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = length + 3
        txpacket[PKT_INSTRUCTION] = INST_WRITE
        txpacket[PKT_PARAMETER0] = address

        txpacket[PKT_PARAMETER0 + 1: PKT_PARAMETER0 + 1 + length] = data[0: length]
        rxpacket, result, error = self.txRxPacket(port, txpacket)

        return result, error

    def write1ByteTxOnly(self, port, scs_id, address, data):
        data_write = [data]
        return self.writeTxOnly(port, scs_id, address, 1, data_write)

    def write1ByteTxRx(self, port, scs_id, address, data):
        data_write = [data]
        return self.writeTxRx(port, scs_id, address, 1, data_write)

    def write2ByteTxOnly(self, port, scs_id, address, data):
        data_write = [SCS_LOBYTE(data), SCS_HIBYTE(data)]
        return self.writeTxOnly(port, scs_id, address, 2, data_write)

    def write2ByteTxRx(self, port, scs_id, address, data):
        data_write = [SCS_LOBYTE(data), SCS_HIBYTE(data)]
        return self.writeTxRx(port, scs_id, address, 2, data_write)

    def write4ByteTxOnly(self, port, scs_id, address, data):
        data_write = [SCS_LOBYTE(SCS_LOWORD(data)),
                      SCS_HIBYTE(SCS_LOWORD(data)),
                      SCS_LOBYTE(SCS_HIWORD(data)),
                      SCS_HIBYTE(SCS_HIWORD(data))]
        return self.writeTxOnly(port, scs_id, address, 4, data_write)

    def write4ByteTxRx(self, port, scs_id, address, data):
        data_write = [SCS_LOBYTE(SCS_LOWORD(data)),
                      SCS_HIBYTE(SCS_LOWORD(data)),
                      SCS_LOBYTE(SCS_HIWORD(data)),
                      SCS_HIBYTE(SCS_HIWORD(data))]
        return self.writeTxRx(port, scs_id, address, 4, data_write)

    def regWriteTxOnly(self, port, scs_id, address, length, data):
        txpacket = [0] * (length + 7)

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = length + 3
        txpacket[PKT_INSTRUCTION] = INST_REG_WRITE
        txpacket[PKT_PARAMETER0] = address

        txpacket[PKT_PARAMETER0 + 1: PKT_PARAMETER0 + 1 + length] = data[0: length]

        result = self.txPacket(port, txpacket)
        port.is_using = False

        return result

    def regWriteTxRx(self, port, scs_id, address, length, data):
        txpacket = [0] * (length + 7)

        txpacket[PKT_ID] = scs_id
        txpacket[PKT_LENGTH] = length + 3
        txpacket[PKT_INSTRUCTION] = INST_REG_WRITE
        txpacket[PKT_PARAMETER0] = address

        txpacket[PKT_PARAMETER0 + 1: PKT_PARAMETER0 + 1 + length] = data[0: length]

        _, result, error = self.txRxPacket(port, txpacket)

        return result, error

    def syncReadTx(self, port, start_address, data_length, param, param_length):
        txpacket = [0] * (param_length + 8)
        # 8: HEADER0 HEADER1 ID LEN INST START_ADDR DATA_LEN CHKSUM

        txpacket[PKT_ID] = BROADCAST_ID
        txpacket[PKT_LENGTH] = param_length + 4  # 7: INST START_ADDR DATA_LEN CHKSUM
        txpacket[PKT_INSTRUCTION] = INST_SYNC_READ
        txpacket[PKT_PARAMETER0 + 0] = start_address
        txpacket[PKT_PARAMETER0 + 1] = data_length

        txpacket[PKT_PARAMETER0 + 2: PKT_PARAMETER0 + 2 + param_length] = param[0: param_length]

        result = self.txPacket(port, txpacket)
        if result == COMM_SUCCESS:
            port.setPacketTimeout((6 + data_length) * param_length)

        return result


    def syncWriteTxOnly(self, port, start_address, data_length, param, param_length):
        txpacket = [0] * (param_length + 8)
        # 8: HEADER0 HEADER1 ID LEN INST START_ADDR DATA_LEN ... CHKSUM

        txpacket[PKT_ID] = BROADCAST_ID
        txpacket[PKT_LENGTH] = param_length + 4  # 4: INST START_ADDR DATA_LEN ... CHKSUM
        txpacket[PKT_INSTRUCTION] = INST_SYNC_WRITE
        txpacket[PKT_PARAMETER0 + 0] = start_address
        txpacket[PKT_PARAMETER0 + 1] = data_length

        txpacket[PKT_PARAMETER0 + 2: PKT_PARAMETER0 + 2 + param_length] = param[0: param_length]

        _, result, _ = self.txRxPacket(port, txpacket)

        return result