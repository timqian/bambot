#!/usr/bin/env python
#
# *********     Sync Read and Sync Write Example      *********
#
#
# Available SCServo model on this example : All models using Protocol SCS
# This example is tested with a SCServo(STS/SMS), and an URT
# Be sure that SCServo(STS/SMS) properties are already set as %% ID : 1 / Baudnum : 6 (Baudrate : 1000000)
#

import os

if os.name == 'nt':
    import msvcrt
    def getch():
        return msvcrt.getch().decode()
else:
    import sys, tty, termios
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    def getch():
        try:
            tty.setraw(sys.stdin.fileno())
            ch = sys.stdin.read(1)
        finally:
            termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return ch

from scservo_sdk import *                    # Uses SCServo SDK library

# Control table address
ADDR_SCS_TORQUE_ENABLE     = 40
ADDR_STS_GOAL_ACC          = 41
ADDR_STS_GOAL_POSITION     = 42
ADDR_STS_GOAL_SPEED        = 46
ADDR_STS_PRESENT_POSITION  = 56

# Default setting
SCS1_ID                     = 1                 # SCServo#1 ID : 1
SCS2_ID                     = 2                 # SCServo#1 ID : 2
BAUDRATE                    = 1000000           # SCServo default baudrate : 1000000
DEVICENAME                  = '/dev/ttyUSB0'    # Check which port is being used on your controller
                                                # ex) Windows: "COM1"   Linux: "/dev/ttyUSB0" Mac: "/dev/tty.usbserial-*"

SCS_MINIMUM_POSITION_VALUE  = 100               # SCServo will rotate between this value
SCS_MAXIMUM_POSITION_VALUE  = 4000              # and this value (note that the SCServo would not move when the position value is out of movable range. Check e-manual about the range of the SCServo you use.)
SCS_MOVING_STATUS_THRESHOLD = 20                # SCServo moving status threshold
SCS_MOVING_SPEED            = 0                 # SCServo moving speed
SCS_MOVING_ACC              = 0                 # SCServo moving acc
protocol_end                = 0                 # SCServo bit end(STS/SMS=0, SCS=1)

index = 0
scs_goal_position = [SCS_MINIMUM_POSITION_VALUE, SCS_MAXIMUM_POSITION_VALUE]         # Goal position

# Initialize PortHandler instance
# Set the port path
# Get methods and members of PortHandlerLinux or PortHandlerWindows
portHandler = PortHandler(DEVICENAME)

# Initialize PacketHandler instance
# Get methods and members of Protocol
packetHandler = PacketHandler(protocol_end)

# Initialize GroupSyncWrite instance
groupSyncWrite = GroupSyncWrite(portHandler, packetHandler, ADDR_STS_GOAL_POSITION, 2)

# Initialize GroupSyncRead instace for Present Position
groupSyncRead = GroupSyncRead(portHandler, packetHandler, ADDR_STS_PRESENT_POSITION, 4)

# Open port
if portHandler.openPort():
    print("Succeeded to open the port")
else:
    print("Failed to open the port")
    print("Press any key to terminate...")
    getch()
    quit()


# Set port baudrate
if portHandler.setBaudRate(BAUDRATE):
    print("Succeeded to change the baudrate")
else:
    print("Failed to change the baudrate")
    print("Press any key to terminate...")
    getch()
    quit()

# SCServo#1 acc
scs_comm_result, scs_error = packetHandler.write1ByteTxRx(portHandler, SCS1_ID, ADDR_STS_GOAL_ACC, SCS_MOVING_ACC)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# SCServo#2 acc
scs_comm_result, scs_error = packetHandler.write1ByteTxRx(portHandler, SCS2_ID, ADDR_STS_GOAL_ACC, SCS_MOVING_ACC)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# SCServo#1 speed
scs_comm_result, scs_error = packetHandler.write2ByteTxRx(portHandler, SCS1_ID, ADDR_STS_GOAL_SPEED, SCS_MOVING_SPEED)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# SCServo#2 speed
scs_comm_result, scs_error = packetHandler.write2ByteTxRx(portHandler, SCS2_ID, ADDR_STS_GOAL_SPEED, SCS_MOVING_SPEED)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# Add parameter storage for SCServo#1 present position value
scs_addparam_result = groupSyncRead.addParam(SCS1_ID)
if scs_addparam_result != True:
    print("[ID:%03d] groupSyncRead addparam failed" % SCS1_ID)
    quit()

# Add parameter storage for SCServo#2 present position value
scs_addparam_result = groupSyncRead.addParam(SCS2_ID)
if scs_addparam_result != True:
    print("[ID:%03d] groupSyncRead addparam failed" % SCS2_ID)
    quit()

while 1:
    print("Press any key to continue! (or press ESC to quit!)")
    if getch() == chr(0x1b):
        break

    # Allocate goal position value into byte array
    param_goal_position = [SCS_LOBYTE(scs_goal_position[index]), SCS_HIBYTE(scs_goal_position[index])]

    # Add SCServo#1 goal position value to the Syncwrite parameter storage
    scs_addparam_result = groupSyncWrite.addParam(SCS1_ID, param_goal_position)
    if scs_addparam_result != True:
        print("[ID:%03d] groupSyncWrite addparam failed" % SCS1_ID)
        quit()

    # Add SCServo#2 goal position value to the Syncwrite parameter storage
    scs_addparam_result = groupSyncWrite.addParam(SCS2_ID, param_goal_position)
    if scs_addparam_result != True:
        print("[ID:%03d] groupSyncWrite addparam failed" % SCS2_ID)
        quit()

    # Syncwrite goal position
    scs_comm_result = groupSyncWrite.txPacket()
    if scs_comm_result != COMM_SUCCESS:
        print("%s" % packetHandler.getTxRxResult(scs_comm_result))

    # Clear syncwrite parameter storage
    groupSyncWrite.clearParam()

    while 1:
        # Syncread present position
        scs_comm_result = groupSyncRead.txRxPacket()
        if scs_comm_result != COMM_SUCCESS:
            print("%s" % packetHandler.getTxRxResult(scs_comm_result))

        # Check if groupsyncread data of SCServo#1 is available
        scs_getdata_result = groupSyncRead.isAvailable(SCS1_ID, ADDR_STS_PRESENT_POSITION, 4)
        scs1_present_position_speed = 0
        scs2_present_position_speed = 0
        if scs_getdata_result == True:
            # Get SCServo#1 present position value
            scs1_present_position_speed = groupSyncRead.getData(SCS1_ID, ADDR_STS_PRESENT_POSITION, 4)
        else:
            print("[ID:%03d] groupSyncRead getdata failed" % SCS1_ID)

        # Check if groupsyncread data of SCServo#2 is available
        scs_getdata_result = groupSyncRead.isAvailable(SCS2_ID, ADDR_STS_PRESENT_POSITION, 4)
        if scs_getdata_result == True:
            # Get SCServo#2 present position value
            scs2_present_position_speed = groupSyncRead.getData(SCS2_ID, ADDR_STS_PRESENT_POSITION, 4)
        else:
            print("[ID:%03d] groupSyncRead getdata failed" % SCS2_ID)

        scs1_present_position = SCS_LOWORD(scs1_present_position_speed)
        scs1_present_speed = SCS_HIWORD(scs1_present_position_speed)
        scs2_present_position = SCS_LOWORD(scs2_present_position_speed)
        scs2_present_speed = SCS_HIWORD(scs2_present_position_speed)
        print("[ID:%03d] GoalPos:%03d PresPos:%03d PresSpd:%03d\t[ID:%03d] GoalPos:%03d PresPos:%03d PresSpd:%03d" 
              % (SCS1_ID, scs_goal_position[index], scs1_present_position, SCS_TOHOST(scs1_present_speed, 15), 
                 SCS2_ID, scs_goal_position[index], scs2_present_position, SCS_TOHOST(scs2_present_speed, 15)))

        if not ((abs(scs_goal_position[index] - scs1_present_position_speed) > SCS_MOVING_STATUS_THRESHOLD) and (abs(scs_goal_position[index] - scs2_present_position_speed) > SCS_MOVING_STATUS_THRESHOLD)):
            break

    # Change goal position
    if index == 0:
        index = 1
    else:
        index = 0

# Clear syncread parameter storage
groupSyncRead.clearParam()

# SCServo#1 torque
scs_comm_result, scs_error = packetHandler.write1ByteTxRx(portHandler, SCS1_ID, ADDR_SCS_TORQUE_ENABLE, 0)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# SCServo#2 torque
scs_comm_result, scs_error = packetHandler.write1ByteTxRx(portHandler, SCS2_ID, ADDR_SCS_TORQUE_ENABLE, 0)
if scs_comm_result != COMM_SUCCESS:
    print("%s" % packetHandler.getTxRxResult(scs_comm_result))
elif scs_error != 0:
    print("%s" % packetHandler.getRxPacketError(scs_error))

# Close port
portHandler.closePort()