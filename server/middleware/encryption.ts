import * as crypto from "crypto";

// CRITICAL: Encryption key MUST be set in environment variables
// Fail fast at startup if not configured
if (!process.env.ENCRYPTION_KEY) {
  console.error("CRITICAL SECURITY ERROR: ENCRYPTION_KEY environment variable is not set!");
  console.error("Application cannot start without a secure encryption key.");
  console.error("Please set ENCRYPTION_KEY to a secure random 32-character string.");
  process.exit(1);
}

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, IV is always 16 bytes
const AUTH_TAG_LENGTH = 16; // GCM auth tag length

// Ensure the key is exactly 32 bytes for AES-256
const getKey = (): Buffer => {
  const key = ENCRYPTION_KEY.padEnd(32, "0").substring(0, 32);
  return Buffer.from(key);
};

// Encrypt sensitive data
export const encrypt = (text: string): string => {
  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get authentication tag for GCM
    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data (all hex encoded)
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
};

// Decrypt sensitive data
export const decrypt = (text: string): string => {
  try {
    // Split the IV, authTag, and encrypted data
    const parts = text.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
};

// Hash passwords securely
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
};

// Verify password against hash
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  try {
    const [salt, hash] = hashedPassword.split(":");
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return hash === verifyHash;
  } catch (error) {
    return false;
  }
};

// Generate secure tokens
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

// Generate CSRF tokens
export const generateCSRFToken = (): string => {
  // Generate as hex to match validation encoding
  return crypto.randomBytes(32).toString("hex");
};

// Validate CSRF tokens
export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  if (!token || !sessionToken) {
    return false;
  }

  try {
    const tokenBuffer = Buffer.from(token);
    const sessionTokenBuffer = Buffer.from(sessionToken);

    // Ensure both buffers are the same length for timingSafeEqual
    if (tokenBuffer.length !== sessionTokenBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, sessionTokenBuffer);
  } catch (error) {
    console.error("CSRF validation error:", error);
    return false;
  }
};

// Secure session data encryption
export const encryptSessionData = (data: any): string => {
  const jsonData = JSON.stringify(data);
  return encrypt(jsonData);
};

// Decrypt session data
export const decryptSessionData = (encryptedData: string): any => {
  const jsonData = decrypt(encryptedData);
  return JSON.parse(jsonData);
};

// Generate API keys
export const generateAPIKey = (): string => {
  const timestamp = Date.now().toString();
  const randomPart = crypto.randomBytes(16).toString("hex");
  return `hive_${timestamp}_${randomPart}`;
};

// Validate API key format
export const validateAPIKey = (apiKey: string): boolean => {
  const pattern = /^hive_\d{13}_[a-f0-9]{32}$/;
  return pattern.test(apiKey);
};
