import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

export class UserManager {
  constructor() {
    // Create default admin user if not exists
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
    if (!admin) {
      const hashedPassword = bcrypt.hashSync('Admin', 10);
      db.prepare('INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)')
        .run(Math.random().toString(36).substring(2, 10), 'admin', hashedPassword, 'admin@example.com');
    } else {
      // Ensure the password is 'Admin' as requested
      const hashedPassword = bcrypt.hashSync('Admin', 10);
      db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, 'admin');
    }
  }

  async login(username: string, password: string) {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    // If 2FA is enabled, return a partial result to prompt for code
    if (user.two_factor_enabled) {
      return { requires2FA: true, userId: user.id };
    }

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    return { token, user: { id: user.id, username: user.username } };
  }

  async verify2FA(userId: string, code: string) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.two_factor_secret) return null;

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) return null;

    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
    return { token, user: { id: user.id, username: user.username } };
  }

  async generate2FA(userId: string) {
    const secret = speakeasy.generateSecret({ name: `BotEngine:${userId}` });
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
    
    db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?')
      .run(secret.base32, userId);

    return { secret: secret.base32, qrCodeUrl };
  }

  async enable2FA(userId: string, code: string) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.two_factor_secret) return false;

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code
    });

    if (verified) {
      db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(userId);
      return true;
    }
    return false;
  }

  async disable2FA(userId: string) {
    db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(userId);
    return true;
  }

  async requestOTP(email: string) {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) return false;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?')
      .run(otp, expiry, email);

    // In a real app, send email here
    console.log(`[SIMULATED EMAIL] OTP for ${email}: ${otp}`);
    return true;
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND reset_token = ?').get(email, otp) as any;
    if (!user) return false;

    const expiry = new Date(user.reset_token_expiry).getTime();
    if (Date.now() > expiry) return false;

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?')
      .run(hashedPassword, email);

    return true;
  }

  async retrieveUsername(email: string) {
    const user = db.prepare('SELECT username FROM users WHERE email = ?').get(email) as any;
    if (!user) return null;

    // In a real app, send email here
    console.log(`[SIMULATED EMAIL] Username for ${email}: ${user.username}`);
    return user.username;
  }

  verifyToken(token: string) {
    try {
      return jwt.verify(token, SECRET_KEY);
    } catch (error) {
      return null;
    }
  }
}
