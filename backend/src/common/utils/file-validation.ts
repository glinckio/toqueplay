import { fromBuffer } from 'file-type';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

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

  const detected = await fromBuffer(file.buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new BadRequestException(
      `Tipo de arquivo inválido. Permitidos: ${Array.from(ALLOWED_MIME).join(', ')}`,
    );
  }

  // Sync the file.mimetype with the detected value so downstream storage uses truth
  file.mimetype = detected.mime;
}
