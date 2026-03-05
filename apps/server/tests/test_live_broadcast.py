import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from routers.ws import LIVE_CHANNEL


def test_live_channel_constant():
    assert LIVE_CHANNEL == "__live__"
