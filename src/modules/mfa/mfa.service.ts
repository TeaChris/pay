import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../infrastructure/db/client.js';
import { mfaSecrets, users } from '../../infrastructure/db/schema/index.js';
import { encrypt, decrypt, sha256 } from '../../infrastructure/crypto/hash.js';
import { generateRecoveryCodes } from '../../infrastructure/crypto/tokens.js';
import { getEnv } from '../../config/env.js';
import { MFA_RECOVERY_CODE_COUNT, MFA_TOTP_WINDOW } from '../../config/constants.js';
import { NotFoundError } from '../../shared/errors.js';

/**
 * Initiate MFA TOTP setup. Generates a secret, stores encrypted,
 * and returns QR code + recovery codes.
 */
export async function initiateMfaSetup(
  userId: string,
): Promise<{ secret: string; qrCodeDataUrl: string; recoveryCodes: string[] }> {
  const db = getDb();
  const env = getEnv();

  // Clean up any prior unverified setup
  await db
    .delete(mfaSecrets)
    .where(and(eq(mfaSecrets.userId, userId), eq(mfaSecrets.verified, false)));

  // Generate new TOTP secret
  const secret = new OTPAuth.Secret({ size: 20 });

  // Get user email for TOTP label
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new NotFoundError('User');

  const totp = new OTPAuth.TOTP({
    issuer: env.MFA_ISSUER,
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  const uri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(uri);

  // Generate recovery codes
  const rawRecoveryCodes = generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
  const hashedCodes = rawRecoveryCodes.map((code) => sha256(code));

  // Encrypt secret and store
  const encryptedSecret = encrypt(secret.base32, env.MFA_ENCRYPTION_KEY);

  await db.insert(mfaSecrets).values({
    userId,
    secretEncrypted: encryptedSecret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    verified: false,
    recoveryCodes: hashedCodes,
  });

  return {
    secret: secret.base32,
    qrCodeDataUrl,
    recoveryCodes: rawRecoveryCodes,
  };
}

/**
 * Verify TOTP code and enable MFA for the user.
 * This finalizes the MFA setup flow.
 */
export async function verifyAndEnableMfa(
  userId: string,
  code: string,
): Promise<boolean> {
  const db = getDb();
  const env = getEnv();

  // Load unverified MFA secret
  const [mfaRecord] = await db
    .select()
    .from(mfaSecrets)
    .where(and(eq(mfaSecrets.userId, userId), eq(mfaSecrets.verified, false)))
    .limit(1);

  if (!mfaRecord) return false;

  const secretBase32 = decrypt(mfaRecord.secretEncrypted, env.MFA_ENCRYPTION_KEY);

  const totp = new OTPAuth.TOTP({
    algorithm: mfaRecord.algorithm,
    digits: mfaRecord.digits,
    period: mfaRecord.period,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: code, window: MFA_TOTP_WINDOW });
  if (delta === null) return false;

  // Mark MFA as verified and enable on user
  await db.transaction(async (tx) => {
    await tx
      .update(mfaSecrets)
      .set({ verified: true, updatedAt: new Date() })
      .where(eq(mfaSecrets.id, mfaRecord.id));

    await tx
      .update(users)
      .set({ mfaEnabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  });

  return true;
}

/**
 * Verify a TOTP code against a user's verified MFA secret.
 * Used during login MFA challenge.
 */
export async function verifyMfaCode(userId: string, code: string): Promise<boolean> {
  const db = getDb();
  const env = getEnv();

  const [mfaRecord] = await db
    .select()
    .from(mfaSecrets)
    .where(and(eq(mfaSecrets.userId, userId), eq(mfaSecrets.verified, true)))
    .limit(1);

  if (!mfaRecord) return false;

  const secretBase32 = decrypt(mfaRecord.secretEncrypted, env.MFA_ENCRYPTION_KEY);

  const totp = new OTPAuth.TOTP({
    algorithm: mfaRecord.algorithm,
    digits: mfaRecord.digits,
    period: mfaRecord.period,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: code, window: MFA_TOTP_WINDOW });
  return delta !== null;
}

/**
 * Verify a recovery code. Each code is single-use.
 */
export async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  const db = getDb();

  const [mfaRecord] = await db
    .select()
    .from(mfaSecrets)
    .where(and(eq(mfaSecrets.userId, userId), eq(mfaSecrets.verified, true)))
    .limit(1);

  if (!mfaRecord || !mfaRecord.recoveryCodes) return false;

  const codeHash = sha256(code.toLowerCase().replace(/\s/g, ''));
  const idx = mfaRecord.recoveryCodes.indexOf(codeHash);
  if (idx === -1) return false;

  // Remove used code
  const updated = [...mfaRecord.recoveryCodes];
  updated.splice(idx, 1);

  await db
    .update(mfaSecrets)
    .set({ recoveryCodes: updated, updatedAt: new Date() })
    .where(eq(mfaSecrets.id, mfaRecord.id));

  return true;
}

/**
 * Disable MFA for a user. Removes the MFA secret and disables the flag.
 */
export async function disableMfa(userId: string): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    await tx.delete(mfaSecrets).where(eq(mfaSecrets.userId, userId));
    await tx
      .update(users)
      .set({ mfaEnabled: false, updatedAt: new Date() })
      .where(eq(users.id, userId));
  });
}

/**
 * Check if a user has MFA enabled.
 */
export async function hasMfaEnabled(userId: string): Promise<boolean> {
  const db = getDb();
  const [user] = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.mfaEnabled ?? false;
}
