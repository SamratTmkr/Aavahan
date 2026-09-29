import { createGroup, getAllGroups, getGroupById, updateGroup, deleteGroup } from '../models/group.model.js';
import pool from '../src/db.js';

// GET /api/v1/groups — returns all groups, optional ?city= filter
export const getGroups = async (req, res) => {
    try {
        const groups = await getAllGroups(req.query.city || null);
        return res.json({ success: true, data: groups });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/groups/:id — returns a single group
export const getGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
        return res.json({ success: true, data: group });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// POST /api/v1/groups — creates a new group (protected)
export const createNewGroup = async (req, res) => {
    const { name, city } = req.body;

    if (!name || !city) {
        return res.status(400).json({ success: false, message: 'Name and city are required' });
    }

    try {
        const id = await createGroup({ ...req.body, organizer_id: req.user.id });
        return res.json({ success: true, message: 'Group created', data: { id } });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/v1/groups/:id — updates a group (protected, must be organizer)
export const updateExistingGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (group.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        // Only these columns can be changed. The keys become column names in the
        // UPDATE, so anything else in the body must never reach the query.
        const editable = ['name', 'description', 'category', 'city', 'avatar_url', 'is_public'];
        const fields = {};
        editable.forEach(key => {
            if (req.body[key] !== undefined) fields[key] = req.body[key];
        });

        if (Object.keys(fields).length === 0) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        await updateGroup(req.params.id, fields);
        return res.json({ success: true, message: 'Group updated' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/v1/groups/:id — deletes a group (protected, must be organizer)
export const deleteExistingGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

        if (group.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorised' });
        }

        await deleteGroup(req.params.id);
        return res.json({ success: true, message: 'Group deleted' });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/v1/groups/organizer/mine — returns groups owned by the logged-in user
export const getMyOrganizerGroups = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM `groups` WHERE organizer_id = ? ORDER BY created_at DESC', [req.user.id]);
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

