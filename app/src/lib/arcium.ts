// =============================================================================
// VeilVote — Arcium SDK Wrapper
// Handles vote encryption simulation for the frontend demo.
// Real encryption uses @arcium-hq/client in the test/CLI environment.
// =============================================================================

/**
 * Encrypts a vote for submission.
 * 
 * In the frontend, this simulates the encryption process that would normally
 * use RescueCipher from @arcium-hq/client. The actual encryption happens
 * server-side or in the test environment with the real Arcium SDK.
 * 
 * The simulation is realistic: it generates proper-sized ciphertexts and
 * fresh nonces, matching the exact byte layout expected by the Solana program.
 * 
 * @param vote - true for Yes, false for No
 * @returns Encrypted vote data ready for the on-chain instruction
 */
export async function encryptVote(
  vote: boolean
): Promise<{
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}> {
  // Generate a fresh 16-byte nonce (NEVER reuse!)
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);

  // RescueCipher always produces 32 bytes per encrypted scalar
  const ciphertext = new Uint8Array(32);
  crypto.getRandomValues(ciphertext);

  return { ciphertext, nonce };
}

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
 * Simulates the vote encryption delay for UX purposes.
 * In production, this would be the actual x25519 + RescueCipher time.
 */
export async function simulateEncryption(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1200));
}

/**
 * Simulates waiting for MPC computation finalization.
 * In production, this would poll awaitComputationFinalization from @arcium-hq/client.
 */
export async function simulateComputation(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2500));
}
