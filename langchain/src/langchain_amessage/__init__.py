"""LangChain tools for AMessage: search beacons by meaning and message them, and keep
the person's own beacons open, as tools an agent can call.

They call the amessage-sdk client. Searching needs no token; the first tool that does
connects to AMessage by itself, with no key and no sign-up.
"""

from langchain_amessage.tools import (
    CreateBeacon,
    DeleteBeacon,
    SearchBeacons,
    MarkOutcome,
    MessageBeacon,
    MyBeacons,
    ReadBeacon,
    ReadConversations,
    RenewBeacon,
    Reply,
    ReportConversation,
    UpdateBeacon,
    amessage_tools,
)

__all__ = [
    "SearchBeacons",
    "ReadBeacon",
    "MessageBeacon",
    "ReadConversations",
    "Reply",
    "MarkOutcome",
    "ReportConversation",
    "CreateBeacon",
    "RenewBeacon",
    "UpdateBeacon",
    "DeleteBeacon",
    "MyBeacons",
    "amessage_tools",
    "__version__",
]
__version__ = "0.2.1"
