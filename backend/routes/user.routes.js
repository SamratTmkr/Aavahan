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
                `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, 
                        COUNT(r.id) AS total_rsvps
                 FROM users u 
                 LEFT JOIN rsvps r ON u.id = r.user_id
                 WHERE u.name LIKE ? OR u.email LIKE ? 
                 GROUP BY u.id
                 ORDER BY u.created_at DESC`,
                [term, term]
            );
        } else {
            [rows] = await pool.execute(
                `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.created_at, 
                        COUNT(r.id) AS total_rsvps
                 FROM users u 
                 LEFT JOIN rsvps r ON u.id = r.user_id
                 GROUP BY u.id
                 ORDER BY u.created_at DESC`
            );
        }
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
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
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});


export default userRouter;

