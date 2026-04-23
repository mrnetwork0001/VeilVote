// =============================================================================
// API Route: /api/encrypt-vote
// Runs server-side where @arcium-hq/client Node.js APIs are available
// Encrypts vote using Arcium x25519 + RescueCipher
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { randomBytes, createHash } from 'crypto';
import {
  x25519,
  RescueCipher,
  deserializeLE,
  getMXEPublicKey,
  getArciumProgram,
  getMXEAccAddress,
} from '@arcium-hq/client';

export async function POST(request: NextRequest) {
  try {
    const { vote, programId, rpcUrl } = await request.json();

    if (typeof vote !== 'boolean' || !programId || !rpcUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: vote, programId, rpcUrl' },
        { status: 400 }
      );
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const programPubkey = new PublicKey(programId);

    // Create a read-only provider (no wallet needed for reading MXE key)
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    } as anchor.Wallet;

    const provider = new anchor.AnchorProvider(connection, dummyWallet, {
      commitment: 'confirmed',
    });

    // 1. Fetch MXE public key
    const mxePublicKey = await getMXEPublicKey(provider, programPubkey);
    if (!mxePublicKey) {
      return NextResponse.json({ error: 'Failed to fetch MXE public key' }, { status: 500 });
    }

    // 2. Generate ephemeral x25519 keypair
    const privateKey = randomBytes(32);
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;
    const publicKey = x25519.getPublicKey(privateKey);

    // 3. Derive shared secret and encrypt
    const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
    const cipher = new RescueCipher(sharedSecret);
    const nonce = randomBytes(16);
    const plaintext = [BigInt(vote ? 1 : 0)];
    const ciphertext = cipher.encrypt(plaintext, nonce);

    // 4. Return encrypted data
    return NextResponse.json({
      ciphertext: Array.from(ciphertext[0]),
      publicKey: Array.from(publicKey),
      nonce: deserializeLE(nonce).toString(),
    });
  } catch (error: any) {
    console.error('Encryption error:', error);
    return NextResponse.json(
      { error: error?.message || 'Encryption failed' },
      { status: 500 }
    );
  }
}
