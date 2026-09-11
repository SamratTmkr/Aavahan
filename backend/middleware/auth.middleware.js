import jwt from 'jsonwebtoken';
import pool from '../src/db.js';

// Protect routes — verifies JWT cookie or Bearer token and attaches user to req
const userAuth = async (req, res, next) => {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await pool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User not found. Please log in again.' });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    }
};

// Admin-only guard — must be used after userAuth
const adminAuth = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

export { userAuth, adminAuth };
