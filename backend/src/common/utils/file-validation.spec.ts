import { assertImageFile } from './file-validation';

// Minimum PNG: 8-byte signature + 25-byte IHDR chunk + 1-byte IDAT marker
// Generated once, then reused. file-type@16 needs more than the bare signature
// because it walks the chunk header to disambiguate from fakes.
function makeMinimalPng(): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrData = Buffer.alloc(13); // 1x1 8-bit grayscale
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 0; // color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrCrc = Buffer.alloc(4); // zero crc is fine for detection
  return Buffer.concat([sig, ihdrLength, ihdrType, ihdrData, ihdrCrc]);
}

function makeMinimalJpeg(): Buffer {
  // JPEG SOI + APP0 JFIF marker (enough for file-type to recognise)
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, // SOI + APP0
    0x00, 0x10, // length 16
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version
    0x00, // units
    0x00, 0x01, 0x00, 0x01, // density
    0x00, 0x00, // thumb
  ]);
}

function makeMinimalWebp(): Buffer {
  // RIFF header + "WEBP" + minimal VP8 chunk header (12 + 18 bytes)
  return Buffer.from([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x1a, 0x00, 0x00, 0x00, // file size (dummy)
    0x57, 0x45, 0x42, 0x50, // "WEBP"
    0x56, 0x50, 0x38, 0x20, // "VP8 "
    0x0e, 0x00, 0x00, 0x00, // chunk size
    ...Array(14).fill(0),
  ]);
}

const GIF_SIGNATURE = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x01, 0x00, 0x01, 0x80, 0x00, 0x00]);

function makeFile(buffer: Buffer, mimetype = 'image/png'): Express.Multer.File {
  return {
    buffer,
    mimetype,
    originalname: 'test',
    encoding: '7bit',
    fieldname: 'file',
    size: buffer.length,
    stream: null as any,
    destination: '',
    filename: 'test',
    path: '',
  } as unknown as Express.Multer.File;
}

describe('assertImageFile', () => {
  it('accepts a valid PNG buffer', async () => {
    const file = makeFile(makeMinimalPng(), 'image/png');
    await expect(assertImageFile(file)).resolves.toBeUndefined();
    expect(file.mimetype).toBe('image/png');
  });

  it('accepts a valid JPEG buffer', async () => {
    const file = makeFile(makeMinimalJpeg(), 'image/jpeg');
    await expect(assertImageFile(file)).resolves.toBeUndefined();
  });

  it('accepts a valid WebP buffer', async () => {
    const file = makeFile(makeMinimalWebp(), 'image/webp');
    await expect(assertImageFile(file)).resolves.toBeUndefined();
  });

  it('rejects GIF even if mimetype claims image/png', async () => {
    const file = makeFile(GIF_SIGNATURE, 'image/png');
    await expect(assertImageFile(file)).rejects.toThrow();
  });

  it('syncs detected mimetype when client lied', async () => {
    const png = makeMinimalPng();
    const file = makeFile(png, 'image/jpeg');
    await assertImageFile(file);
    expect(file.mimetype).toBe('image/png');
  });

  it('rejects empty buffer', async () => {
    await expect(assertImageFile(makeFile(Buffer.alloc(0)))).rejects.toThrow('vazio');
  });

  it('rejects oversize buffer', async () => {
    const big = Buffer.alloc(11 * 1024 * 1024, 0x89);
    await expect(assertImageFile(makeFile(big), 10 * 1024 * 1024)).rejects.toThrow('tamanho máximo');
  });
});
