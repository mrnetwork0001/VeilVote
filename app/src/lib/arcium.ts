// =============================================================================
// VeilVote - Arcium Client Utilities (Browser-Safe Layer)
//
// NOTE: The actual vote encryption using @arcium-hq/client (x25519 key exchange
// + RescueCipher) runs SERVER-SIDE in /api/build-tx/route.ts. This is because
// @arcium-hq/client has Node.js dependencies that cannot run in the browser.
//
// This file provides browser-safe helper functions and type definitions.
// =============================================================================

/**
 * Deserializes a little-endian byte array to a BigInt.
 * Matches the `deserializeLE` function from @arcium-hq/client.
 */
export function deserializeLE(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Generates a cryptographically secure 16-byte nonce for client-side use.
 * Server-side encryption uses randomBytes(16) from Node.js crypto module.
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Returns the Arcium program ID on Solana Devnet.
 * Address: Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ
 */
export const ARCIUM_PROGRAM_ID = 'Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ';

/**
 * The Arcium cluster offset used by VeilVote (devnet cluster #456).
 * Corresponds to the Arcium Devnet Arx node cluster used for MPC computations.
 */
export const ARCIUM_CLUSTER_OFFSET = 456;