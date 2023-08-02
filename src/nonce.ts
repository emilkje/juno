import { randomBytes } from 'crypto';
import { promisify } from 'util';

const NONCE_LENGTH = 32;

export async function getNonce(): Promise<string> {

  const randomBytesAsync = promisify(randomBytes);

  try {
    const buffer = await randomBytesAsync(NONCE_LENGTH);
    const nonce = buffer
      .toString('base64')
      .replace(/\+/g, '-') // Convert '+' to '-'
      .replace(/\//g, '_') // Convert '/' to '_'
      .replace(/=+$/, '_'); // Convert '=' to '_'
  
    return nonce;
  } catch (err) {
    throw new Error('Failed to generate nonce');
  }
}