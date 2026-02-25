import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fetch from "node-fetch";

async function testAuth() {
    console.log("Generating keypair...");
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();

    const nonce = crypto.getRandomValues(new Uint8Array(32));
    const timestamp = Date.now();
    const message = `InstinctFi auth\nWallet: ${publicKey}\nNonce: ${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}\nTimestamp: ${timestamp}`;

    console.log("Signing message...");
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    const signatureBase64 = Buffer.from(signature).toString("base64");

    console.log("Calling /api/auth/verify...");
    try {
        const res = await fetch("http://localhost:3000/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                walletAddress: publicKey,
                signature: signatureBase64,
                message,
            }),
        });

        const data = await res.json();
        console.log("Response:", data);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testAuth();
