// Brotli 압축 유틸리티
import brotliPromise from "brotli-wasm";

let brotli: Awaited<typeof brotliPromise> | null = null;

async function getBrotli() {
  if (!brotli) {
    brotli = await brotliPromise;
  }
  return brotli;
}

export async function compress(data: string): Promise<string> {
  const brotliInstance = await getBrotli();
  const encoder = new TextEncoder();
  const input = encoder.encode(data);
  const compressed = brotliInstance.compress(input, { quality: 11 });
  return uint8ArrayToBase64(compressed);
}

export async function decompress(base64: string): Promise<string> {
  const brotliInstance = await getBrotli();
  const compressed = base64ToUint8Array(base64);
  const decompressed = brotliInstance.decompress(compressed);
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
