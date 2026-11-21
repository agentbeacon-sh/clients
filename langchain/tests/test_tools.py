import json
from uuid import UUID

import pytest
from amessage_sdk import AMessage
from pydantic import ValidationError

from langchain_tests.unit_tests import ToolsUnitTests

from langchain_amessage import AgentChat, SearchBeacons, ReadBeacon, amessage_tools


class FakeClient:
    """Stands in for amessage_sdk.AMessage and records what the tools ask it."""

    def __init__(self):
        self.calls = []

    def __getattr__(self, name):
        def record(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return {"ok": True}

        return record

    def search(self, query, location=None, cursor=None):
        self.calls.append(("search", query, location, cursor))
        return {"data":[], "next_cursor":"page/2"}

    def read(self, beacon_id):
        self.calls.append(("read", beacon_id))
        return {"id": beacon_id}


def test_find_passes_the_query_place_and_page():
    client = FakeClient()
    out = SearchBeacons(client=client).invoke({"query": "plumber free tomorrow", "location": "78704"})
    assert json.loads(out) == {"data":[], "next_cursor":"page/2"}
    assert client.calls == [("search", "plumber free tomorrow", "78704", None)]


def test_the_find_input_has_no_category_and_no_side():
    tool = SearchBeacons(client=FakeClient())
    assert set(tool.args) == {"query", "location", "cursor"}
    for bad in ({"query": ""}, {"query": "movers", "cursor": 110}):
        try:
            tool.invoke(bad)
        except Exception:
            continue
        raise AssertionError(f"{bad} was accepted")


def test_reading_a_beacon_asks_for_it_by_id():
    client = FakeClient()
    assert json.loads(ReadBeacon(client=client).invoke({"beacon_id":"abc"})) == {"id":"abc"}
    assert client.calls == [("read", "abc")]


def test_only_the_read_tools_unless_asked_for_write_and_then_the_ten():
    assert [t.name for t in amessage_tools(client=FakeClient())] == ["search_beacons", "read_beacon"]
    assert [t.name for t in amessage_tools(client=FakeClient(), write=True)] == [
        "search_beacons",
        "read_beacon",
        "agent_chat",
        "message_beacon",
        "read_conversations",
        "reply",
        "mark_outcome",
        "report_conversation",
        "create_beacon",
        "renew_beacon",
        "update_beacon",
        "delete_beacon",
        "my_beacons",
    ]


def test_the_write_tools_share_one_client_and_call_the_matching_method():
    client = FakeClient()
    tools = {t.name: t for t in amessage_tools(client=client, write=True)}
    cases = [
        ("agent_chat", {"command":{"action":"events","cursor":"page/2"}}, ("chat", ({"action":"events","cursor":"page/2"},), {})),
        ("message_beacon", {"beacon_id":"b","text":"Hi","key":"write"}, ("message",("b","Hi"),{"key":"write"})),
        ("read_conversations", {"cursor":"page"}, ("conversations",(),{"cursor":"page"})),
        ("read_conversations", {"conversation_id":"c","cursor":"page"}, ("read_conversation",("c",),{"cursor":"page"})),
        ("reply", {"conversation_id":"c","text":"Yes","reply_to_message_id":"m","key":"write"}, ("reply",("c","Yes"),{"reply_to_message_id":"m","key":"write"})),
        ("mark_outcome", {"message_id":"m","outcome":"booked"}, ("mark_outcome",("m","booked"),{})),
        ("report_conversation", {"conversation_id":"c","reason":"spam"}, ("report_conversation",("c","spam"),{"key":None,"block":True})),
        ("create_beacon", {"text":"Open","welcome_chat":False}, ("create",("Open",),{"location":None,"idempotency_key":None,"welcome_chat":False})),
        ("renew_beacon", {"beacon_id":"b","key":"write"}, ("renew",("b",),{"key":"write"})),
        ("renew_beacon", {"beacon_id":"b","location":None}, ("renew",("b",),{"location":None,"key":None})),
        ("update_beacon", {"beacon_id":"b","etag":'"a"',"text":"Free"}, ("update",("b",),{"etag":'"a"',"text":"Free"})),
        ("update_beacon", {"beacon_id":"b","etag":'"a"',"location":None}, ("update",("b",),{"etag":'"a"',"location":None})),
        ("delete_beacon", {"beacon_id":"b","etag":'"a"'}, ("delete",("b",'"a"'),{})),
        ("my_beacons", {"cursor":"page"}, ("my_beacons",(),{"cursor":"page"})),
    ]
    for name, args, expected in cases:
        assert json.loads(tools[name].invoke(args)) == {"ok":True}
        assert client.calls[-1] == expected, name


def test_private_chat_schema_requires_one_destination_and_sms_sender():
    tool = next(t for t in amessage_tools(client=FakeClient(), write=True) if t.name == "agent_chat")
    ident = "132d7d23-7a6a-45ad-a684-d18905e79671"
    assert json.loads(tool.invoke({"command":{"action":"invite","id":ident,"channel":"sms","sender_name":"Morgan"}})) == {"ok":True}
    for command in (
        {"action":"invoke"},
        {"action":"invite","id":ident,"channel":"sms"},
        {"action":"send","to":{"phone":"+14155550100","email":"alex@example.com"},"text":"hi"},
    ):
        with pytest.raises(ValidationError):
            tool.invoke({"command":command})


@pytest.mark.parametrize("key", [None, "6df06aee-f738-44e2-ba1f-23ce8b53f07f"])
def test_send_draft_uses_original_message_id_and_only_the_internal_route(key):
    message_id = "132d7d23-7a6a-45ad-a684-d18905e79671"
    draft = {"id": message_id, "state": "draft", "invitation_available": False}
    calls = []

    def send(method, url, headers, body):
        calls.append((method, url, headers["Idempotency-Key"], json.loads(body)))
        return 200, {}, json.dumps(draft)

    client = AMessage(api_url="https://example.invalid", token="test", send=send)
    tool = AgentChat(client=client)
    command = {"action": "send_draft", "id": message_id}
    if key is not None:
        command["key"] = key
    assert json.loads(tool.invoke({"command": command})) == draft
    assert len(calls) == 1
    method, url, used_key, body = calls[0]
    assert (method, url, body) == ("POST", "https://example.invalid/v1/messages", {"draft_message_id": message_id})
    assert str(UUID(used_key)) == (key or used_key)


def test_send_draft_rejects_missing_id_and_extraneous_fields_before_dispatch():
    client = FakeClient()
    tool = AgentChat(client=client)
    ident = "132d7d23-7a6a-45ad-a684-d18905e79671"
    for fields in ({}, {"request_id": ident}, {"id": "malformed"}, {"id": ident, "key": "malformed"},
                   {"id": ident, "text": "new text"}, {"id": ident, "channel": "sms"}):
        with pytest.raises(ValidationError):
            tool.invoke({"command": {"action": "send_draft", **fields}})
    assert client.calls == []


class TestSearchBeaconsStandard(ToolsUnitTests):
    """LangChain's own checks for a tool."""

    @property
    def tool_constructor(self):
        return SearchBeacons

    @property
    def tool_constructor_params(self):
        return {"client": FakeClient()}

    @property
    def tool_invoke_params_example(self):
        return {"query": "plumber free tomorrow near 78704"}
