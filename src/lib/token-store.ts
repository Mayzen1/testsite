"use client";

import type { TokenData, PurchaseEntry } from "./types";

const KEYS = {
  primary: "app_session_data",
  backup: "user_preferences_cache",
  validation: "session_validation_key",
  metadata: "app_metadata_store",
  email: "user_session_preferences",
  tempSession: "temp_session_state",
};

const SECRET = "fmr2024secure";
const DEFAULT_TOKENS = 10;

// --- Fingerprint ---
function generateFingerprint(): string {
  const parts: string[] = [];
  if (typeof navigator !== "undefined") {
    parts.push(navigator.userAgent || "");
    parts.push(navigator.language || "");
    parts.push(`${screen.width}x${screen.height}`);
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");
    parts.push(String(navigator.hardwareConcurrency || 4));
    // Canvas fingerprint
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("FMR fingerprint", 2, 15);
        parts.push(canvas.toDataURL().slice(-50));
      }
    } catch {
      parts.push("no-canvas");
    }
    try {
      const mem = (navigator as unknown as Record<string, unknown>).deviceMemory;
      if (mem) parts.push(String(mem));
    } catch {
      // ignore
    }
  }
  const raw = parts.join("|") + SECRET + (typeof location !== "undefined" ? location.hostname : "");
  return simpleHash(raw).slice(0, 16);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  // Convert to hex string
  const h = (hash >>> 0).toString(16);
  // Make it longer by hashing again
  let hash2 = 0;
  for (let i = 0; i < str.length; i++) {
    hash2 = ((hash2 << 7) - hash2 + str.charCodeAt(i)) | 0;
  }
  return h + (hash2 >>> 0).toString(16);
}

// --- XOR encrypt/decrypt ---
function xorEncrypt(data: string, key: string): string {
  let result = "";
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  try {
    const decoded = atob(encoded);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return "";
  }
}

// --- Checksum ---
function computeChecksum(t: number, h: PurchaseEntry[], ts: number, fingerprint: string): string {
  const raw = `${t}|${JSON.stringify(h)}|${ts}|${fingerprint}`;
  return simpleHash(raw);
}

function computeTokenHash(t: number): string {
  return simpleHash(`token_${t}_${SECRET}`);
}

// --- Main Token Store class ---
class TokenStore {
  private fingerprint: string;

  constructor() {
    this.fingerprint = typeof window !== "undefined" ? generateFingerprint() : "server";
  }

  private getEncryptionKey(): string {
    return this.fingerprint + SECRET;
  }

  saveTokens(tokens: number, history: PurchaseEntry[] = []): void {
    if (typeof window === "undefined") return;

    const key = this.getEncryptionKey();
    const ts = Date.now();
    const checksum = computeChecksum(tokens, history, ts, this.fingerprint);

    const data: TokenData = {
      t: tokens,
      h: history,
      s: this.fingerprint,
      ts,
      v: 1,
      c: checksum,
    };

    // Primary storage
    const encrypted = xorEncrypt(JSON.stringify(data), key);
    localStorage.setItem(KEYS.primary, encrypted);

    // Backup storage
    const backup = {
      config: { theme: "auto", lang: "en" },
      cache: { tokens },
    };
    const backupEncrypted = xorEncrypt(JSON.stringify(backup), key);
    localStorage.setItem(KEYS.backup, backupEncrypted);

    // Validation storage
    const validation = {
      session: this.fingerprint,
      checksum,
      tokenHash: computeTokenHash(tokens),
    };
    localStorage.setItem(KEYS.validation, btoa(JSON.stringify(validation)));

    // Session state
    try {
      sessionStorage.setItem(KEYS.tempSession, JSON.stringify({ t: tokens, ts }));
    } catch {
      // sessionStorage may be unavailable
    }
  }

  loadTokens(): { tokens: number; history: PurchaseEntry[] } {
    if (typeof window === "undefined") return { tokens: 0, history: [] };

    const key = this.getEncryptionKey();

    // Try primary
    try {
      const raw = localStorage.getItem(KEYS.primary);
      if (raw) {
        const decrypted = xorDecrypt(raw, key);
        const data: TokenData = JSON.parse(decrypted);

        // Verify fingerprint
        if (data.s !== this.fingerprint) throw new Error("fingerprint mismatch");

        // Verify checksum
        const expectedChecksum = computeChecksum(data.t, data.h, data.ts, this.fingerprint);
        if (data.c !== expectedChecksum) throw new Error("checksum mismatch");

        // Cross-check with validation key
        const validationRaw = localStorage.getItem(KEYS.validation);
        if (validationRaw) {
          const validation = JSON.parse(atob(validationRaw));
          if (validation.tokenHash !== computeTokenHash(data.t)) {
            throw new Error("token hash mismatch");
          }
        }

        // Cross-check with session state
        try {
          const tempRaw = sessionStorage.getItem(KEYS.tempSession);
          if (tempRaw) {
            const temp = JSON.parse(tempRaw);
            if (temp.t !== data.t && temp.ts > data.ts) {
              // Session has newer data
              return { tokens: temp.t, history: data.h };
            }
          }
        } catch {
          // ignore session storage issues
        }

        return { tokens: data.t, history: data.h };
      }
    } catch {
      // Primary failed, try backup
    }

    // Try backup
    try {
      const backupRaw = localStorage.getItem(KEYS.backup);
      if (backupRaw) {
        const decrypted = xorDecrypt(backupRaw, key);
        const backup = JSON.parse(decrypted);
        if (backup.cache && typeof backup.cache.tokens === "number") {
          return { tokens: backup.cache.tokens, history: [] };
        }
      }
    } catch {
      // Backup also failed
    }

    return { tokens: 0, history: [] };
  }

  useToken(): boolean {
    const { tokens, history } = this.loadTokens();
    if (tokens <= 0) return false;
    this.saveTokens(tokens - 1, history);
    return true;
  }

  addTokens(count: number): void {
    const { tokens, history } = this.loadTokens();
    const newHistory = [
      ...history,
      { date: new Date().toISOString(), tokens: count, amount: 0 },
    ];
    this.saveTokens(tokens + count, newHistory);
  }

  getTokenCount(): number {
    return this.loadTokens().tokens;
  }

  // Initialize with default tokens if first visit
  initialize(): number {
    const { tokens } = this.loadTokens();
    if (tokens === 0) {
      const validationRaw = localStorage.getItem(KEYS.validation);
      const primaryRaw = localStorage.getItem(KEYS.primary);
      // Only give default tokens if no data exists at all (true first visit)
      if (!validationRaw && !primaryRaw) {
        this.saveTokens(DEFAULT_TOKENS, [
          { date: new Date().toISOString(), tokens: DEFAULT_TOKENS, amount: 0 },
        ]);
        return DEFAULT_TOKENS;
      }
    }
    return tokens;
  }

  // Email linking (mocked)
  saveEmail(email: string): void {
    if (typeof window === "undefined") return;
    const data = { email, isVerified: true };
    localStorage.setItem(KEYS.email, btoa(JSON.stringify(data)));
  }

  getEmail(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEYS.email);
      if (raw) {
        const data = JSON.parse(atob(raw));
        return data.email || null;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

// Singleton
let store: TokenStore | null = null;

export function getTokenStore(): TokenStore {
  if (!store) {
    store = new TokenStore();
  }
  return store;
}
