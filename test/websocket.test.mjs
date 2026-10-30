import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { acceptWebSocket } from "../src/websocket.mjs";

class MockSocket extends EventEmitter {
  writable = true;
  writes = [];
  write(data) { this.writes.push(Buffer.from(data)); return true; }
  end(data) { if (data) this.write(data); this.writable = false; }
  destroy() { this.writable = false; }
}

function maskedTextFrame(text) {
  const payload = Buffer.from(text);
  const mask = Buffer.from([1, 2, 3, 4]);
  const frame = Buffer.alloc(6 + payload.length);
  frame[0] = 0x81;
  frame[1] = 0x80 | payload.length;
  mask.copy(frame, 2);
  payload.forEach((value, index) => { frame[6 + index] = value ^ mask[index % 4]; });
  return frame;
}

test("accepts a WebSocket and forwards masked terminal input", () => {
  const socket = new MockSocket();
  let received;
  const connection = acceptWebSocket({
    headers: { upgrade: "websocket", "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==" }
  }, socket, Buffer.alloc(0), {
    onData: (payload) => { received = payload.toString("utf8"); }
  });

  assert.match(socket.writes[0].toString("utf8"), /101 Switching Protocols/);
  socket.emit("data", maskedTextFrame("whoami\n"));
  assert.equal(received, "whoami\n");

  connection.send(Buffer.from("remote-output"));
  const outputFrame = socket.writes.at(-1);
  assert.equal(outputFrame[0], 0x82);
  assert.equal(outputFrame.subarray(2).toString("utf8"), "remote-output");
});
