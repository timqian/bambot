#!/usr/bin/env python

from .scservo_def import *
from .protocol_packet_handler import *


def PacketHandler(protocol_end):
    # FIXME: float or int-to-float comparison can generate weird behaviour
    SCS_SETEND(protocol_end)
    return protocol_packet_handler()