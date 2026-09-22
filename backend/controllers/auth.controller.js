import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../src/db.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/email.js';

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || '7d';

// Same rule as sign-up: at least 6 characters with an upper, a lower and a digit
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Format email consistently
        const emailValidate = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValidate)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Check password complexity (at least 6 characters, uppercase, lowercase, and number)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters and contain uppercase, lowercase, and a number"
            });
        }

        // Check if email already exists
        const [existingUsers] = await pool.execute(
            'SELECT id FROM users WHERE email = ?',
            [emailValidate]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Continue with password hashing
        const hashedPassword = await bcrypt.hash(password, 10);
        const displayName = (name && name.trim()) ? name.trim() : emailValidate.split('@')[0];

        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [displayName, emailValidate, hashedPassword]
        );

        const token = jwt.sign({ id: result.insertId, role: 'user' }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: { id: result.insertId, name: displayName, email: emailValidate, role: 'user' }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const emailValidate = email.trim().toLowerCase();

    try {
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [emailValidate]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User does not exist' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.json({
            success: true,
            message: 'Logged in successfully',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });

        return res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/auth/forgot-password — emails a reset link.
// Always answers the same way, so this cannot be used to discover which
// email addresses have accounts.
export const forgotPassword = async (req, res) => {
    const reply = {
        success: true,
        message: 'If that email has an account, a reset link is on its way.'
    };

    try {
        const email = (req.body.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const [users] = await pool.execute('SELECT id, name, email FROM users WHERE email = ?', [email]);
        if (!users.length) return res.json(reply);

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');

        // Only the hash is stored, so a leaked database cannot be used to reset passwords
        await pool.execute(
            'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
            [user.id, hashToken(token)]
        );

        const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
        sendPasswordResetEmail({
            to: user.email,
            userName: user.name,
            resetUrl: `${base}/pages/reset-password.html?token=${token}`
        }).catch(err => console.error('Password reset email failed:', err.message));

        return res.json(reply);
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/auth/reset-password — sets a new password from a valid token
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: 'Token and new password are required' });
        }
        if (!PASSWORD_RULE.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters and contain uppercase, lowercase, and a number'
            });
        }

        const [rows] = await pool.execute(
            `SELECT id, user_id FROM password_resets
             WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
            [hashToken(token)]
        );

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'That reset link is invalid or has expired' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, rows[0].user_id]);

        // Burn this token, and any other outstanding ones for the same user
        await pool.execute('UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL', [rows[0].user_id]);

        return res.json({ success: true, message: 'Password updated. You can log in now.' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
