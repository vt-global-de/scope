import { createHash } from "node:crypto";

const websocketGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function frame(opcode, payload = Buffer.alloc(0)) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  return Buffer.concat([header, data]);
}

export function acceptWebSocket(request, socket, head, { onData, onClose }) {
  const key = request.headers["sec-websocket-key"];
  if (request.headers.upgrade?.toLowerCase() !== "websocket" || typeof key !== "string") {
    socket.destroy();
    return;
  }

  const accept = createHash("sha1").update(`${key}${websocketGuid}`).digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "\r\n"
  ].join("\r\n"));

  let buffer = Buffer.alloc(0);
  let closed = false;
  const connection = {
    send(data) { if (!closed && socket.writable) socket.write(frame(0x2, data)); },
    sendText(data) { if (!closed && socket.writable) socket.write(frame(0x1, String(data))); },
    close() {
      if (closed) return;
      closed = true;
      if (socket.writable) socket.end(frame(0x8));
    }
  };

  const consume = (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const masked = (buffer[1] & 0x80) !== 0;
      let length = buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        const largeLength = buffer.readBigUInt64BE(2);
        if (largeLength > 1024n * 1024n) return connection.close();
        length = Number(largeLength);
        offset = 10;
      }
      if (!masked || length > 1024 * 1024) return connection.close();
      if (buffer.length < offset + 4 + length) return;

      const opcode = buffer[0] & 0x0f;
      const mask = buffer.subarray(offset, offset + 4);
      const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
      for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      buffer = buffer.subarray(offset + 4 + length);

      if (opcode === 0x8) return connection.close();
      if (opcode === 0x9) socket.write(frame(0xA, payload));
      if (opcode === 0x1 || opcode === 0x2) onData(payload, connection, opcode);
    }
  };

  socket.on("data", consume);
  socket.once("close", () => {
    closed = true;
    onClose?.();
  });
  socket.once("error", () => {
    closed = true;
    onClose?.();
  });
  if (head?.length) consume(head);
  return connection;
}
