// Minimal ZIP writer (stored entries, no compression) for bundling already-compressed
// files such as PDFs. Names are sanitised and de-duplicated by the caller's order.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipFiles(files: { name: string; data: Uint8Array }[]) {
  const seen = new Set<string>();
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    let name = f.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
    for (let i = 2; seen.has(name); i++) name = name.replace(/(\.[^.]*)?$/, `-${i}$1`);
    seen.add(name);
    const nameBytes = Buffer.from(name, "utf8"), crc = crc32(f.data), size = f.data.length;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(0, 8);
    header.writeUInt32LE(0, 10); header.writeUInt32LE(crc, 14); header.writeUInt32LE(size, 18); header.writeUInt32LE(size, 22);
    header.writeUInt16LE(nameBytes.length, 26); header.writeUInt16LE(0, 28);
    local.push(header, nameBytes, Buffer.from(f.data));
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(0, 10);
    dir.writeUInt32LE(0, 12); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(size, 20); dir.writeUInt32LE(size, 24);
    dir.writeUInt16LE(nameBytes.length, 28); dir.writeUInt16LE(0, 30); dir.writeUInt16LE(0, 32); dir.writeUInt16LE(0, 34); dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38); dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBytes);
    offset += header.length + nameBytes.length + size;
  }
  const centralSize = central.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...local, ...central, end]);
}
