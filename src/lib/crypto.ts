// src/lib/crypto.ts

import CryptoJS from 'crypto-js';

const KEY_SIZE = 256 / 32;
const ITERATIONS = 100000;

export function deriveKey(masterPassword: string, salt: string): string {
  const key = CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS
  });
  return key.toString(CryptoJS.enc.Hex);
}

// 修复: 将 data: any 改为 data: unknown
export function encrypt(data: unknown, key: string): string {
  const dataString = JSON.stringify(data);
  const ciphertext = CryptoJS.AES.encrypt(dataString, key).toString();
  return ciphertext;
}

// 修复: 将返回值 any 改为 unknown
export function decrypt(ciphertext: string, key: string): unknown {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decryptedDataString = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedDataString) {
        throw new Error("Decryption failed: Invalid key or corrupted data.");
    }
    return JSON.parse(decryptedDataString);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Could not decrypt data. The master password might be incorrect.");
  }
}

export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
}

// ... 密码生成器函数保持不变 ...
export function generateStrongPassword(
    length: number = 16, 
    options = {
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
    }
): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    let allChars = '';
    let password = '';
    
    if (options.includeUppercase) {
        allChars += upper;
        password += upper[Math.floor(Math.random() * upper.length)];
    }
    if (options.includeLowercase) {
        allChars += lower;
        password += lower[Math.floor(Math.random() * lower.length)];
    }
    if (options.includeNumbers) {
        allChars += numbers;
        password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (options.includeSymbols) {
        allChars += symbols;
        password += symbols[Math.floor(Math.random() * symbols.length)];
    }
    
    if (allChars.length === 0) {
        return "(No character types selected)";
    }

    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    return password.split('').sort(() => 0.5 - Math.random()).join('');
}