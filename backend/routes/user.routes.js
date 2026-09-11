import { Router } from 'express';
import pool from '../src/db.js';
import { userAuth, adminAuth } from '../middleware/auth.middleware.js';

const userRouter = Router();

// GET /api/v1/users â€” admin only: list all users
userRouter.get('/', userAuth, adminAuth, async (req, res) => {
    try {
        const search = req.query.search || null;
        let rows;
        if (search) {
            const term = `%${search}%`;
            [rows] = await pool.execute(
                'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC',
                [term, term]
            );
        } else {
            [rows] = await pool.execute(
                'SELECT id, name, email, role, avatar_url, created_at FROM users ORDER BY created_at DESC'
            );
        }
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

// GET /api/v1/users/:id â€” admin only: get a single user
userRouter.get('/:id', userAuth, adminAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
            [req.params.id]
        );
        if (!rows.length) return res.json({ success: false, message: 'User not found' });
        return res.json({ success: true, data: rows[0] });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

// PATCH /api/v1/users/:id/role â€” admin only: promote or demote a user
userRouter.patch('/:id/role', userAuth, adminAuth, async (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        return res.json({ success: false, message: 'Role must be "user" or "admin"' });
    }
    try {
        await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
        return res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/users/:id â€” admin only: delete a user
userRouter.delete('/:id', userAuth, adminAuth, async (req, res) => {
    try {
        // Prevent self-deletion
        if (parseInt(req.params.id) === req.user.id) {
            return res.json({ success: false, message: 'You cannot delete your own account.' });
        }
        await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        return res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

// GET /api/v1/users/admin/transactions — admin only: list registrations & transactions
userRouter.get('/admin/transactions', userAuth, adminAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.id, r.status, r.created_at, u.name AS buyer, e.title AS event, 
                    CASE WHEN e.is_free = 1 OR e.min_price IS NULL OR e.min_price = 0 THEN 'Free' 
                         ELSE CONCAT('NPR ', FORMAT(e.min_price, 0)) END AS amount,
                    'Direct RSVP' AS gateway
             FROM rsvps r
             JOIN users u ON r.user_id = u.id
             JOIN events e ON r.event_id = e.id
             ORDER BY r.created_at DESC
             LIMIT 50`
        );
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
});

export default userRouter;

