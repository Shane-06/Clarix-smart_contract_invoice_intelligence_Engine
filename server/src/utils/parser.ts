import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function parsePdf(buffer: Buffer): Promise<string> {
  // The bundled PDF.js reader expects a standalone Uint8Array.
  const data = await pdf(Uint8Array.from(buffer) as unknown as Buffer);
  return data.text;
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return parsePdf(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return parseDocx(buffer);
  } else {
    // If it's a plain text file, we can fall back to reading it directly
    if (mimeType.startsWith('text/')) {
      return buffer.toString('utf-8');
    }
    throw new Error('Unsupported file format. Only PDF and DOCX are supported.');
  }
}
