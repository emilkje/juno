import { randomBytes } from 'crypto';
import { promisify } from 'util';

// the length of the nonce string
const NONCE_LENGTH = 32;

/**
 * Generates a valid nonce used to ensure correct csp policy in script elements
 * @returns {Promise<string>} This returns a promise that resolves a valid nonce
 */
export async function getNonce(): Promise<string> {
  try {
    // wrap randonBytes in async/await promise api
    const randomBytesAsync = promisify(randomBytes);

    // generate the nonce based on base64 encoding of a set of random bytes, 
    // making sure it is url safe by removing illegal characters
    const buffer:Buffer = await randomBytesAsync(NONCE_LENGTH);
    const nonce:string = buffer
      .toString('base64')
      .replace(/\+/g, '-') // Convert '+' to '-'
      .replace(/\//g, '_') // Convert '/' to '_'
      .replace(/=+$/, '_'); // Convert '=' to '_'
  
    return nonce;
  } catch (err) {
    throw new Error(`Failed to generate nonce: ${err}`);
  }
}