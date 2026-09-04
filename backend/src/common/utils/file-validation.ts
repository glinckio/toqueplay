import { fromBuffer } from 'file-type';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
// file-type <=21.3.0 has a known infinite loop in its ASF-container detector
// on malformed input with a zero-size sub-header (GHSA-5v7r-6r5c-r473) — the
// detector runs on every buffer regardless of the real (allowed) file type, so
// a crafted upload can hang the request. No non-breaking patch exists (17+
// dropped CommonJS entirely); race the detection against a timeout instead.
const DETECTION_TIMEOUT_MS = 3000;

/**
 * Validates an uploaded file by inspecting magic bytes (not the user-controlled mimetype).
 * Throws BadRequestException on invalid type/size.
 */
export async function assertImageFile(
  file: Express.Multer.File,
  maxBytes = DEFAULT_MAX_SIZE,
): Promise<void> {
  if (!file?.buffer || file.buffer.length === 0) {
    throw new BadRequestException('Arquivo vazio');
  }
  if (file.buffer.length > maxBytes) {
    throw new BadRequestException(`Arquivo excede o tamanho máximo de ${maxBytes} bytes`);
  }

  let detected: Awaited<ReturnType<typeof fromBuffer>>;
  let timeoutId: ReturnType<typeof setTimeout>;
  try {
    detected = await Promise.race([
      fromBuffer(file.buffer),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('file-type detection timeout')), DETECTION_TIMEOUT_MS);
      }),
    ]);
  } catch {
    throw new BadRequestException('Não foi possível validar o arquivo enviado');
  } finally {
    clearTimeout(timeoutId!);
  }

  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new BadRequestException(
      `Tipo de arquivo inválido. Permitidos: ${Array.from(ALLOWED_MIME).join(', ')}`,
    );
  }

  // Sync the file.mimetype with the detected value so downstream storage uses truth
  file.mimetype = detected.mime;
}
