import { createGroup, getAllGroups, getGroupById, updateGroup, deleteGroup } from '../models/group.model.js';
import pool from '../src/db.js';

// GET /api/v1/groups — returns all groups, optional ?city= filter
export const getGroups = async (req, res) => {
    try {
        const groups = await getAllGroups(req.query.city || null);
        return res.json({ success: true, data: groups });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/groups/:id — returns a single group
export const getGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.json({ success: false, message: 'Group not found' });
        return res.json({ success: true, data: group });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// POST /api/v1/groups — creates a new group (protected)
export const createNewGroup = async (req, res) => {
    const { name, city } = req.body;

    if (!name || !city) {
        return res.json({ success: false, message: 'Name and city are required' });
    }

    try {
        const id = await createGroup({ ...req.body, organizer_id: req.user.id });
        return res.json({ success: true, message: 'Group created', data: { id } });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// PUT /api/v1/groups/:id — updates a group (protected, must be organizer)
export const updateExistingGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.json({ success: false, message: 'Group not found' });

        if (group.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.json({ success: false, message: 'Not authorised' });
        }

        await updateGroup(req.params.id, req.body);
        return res.json({ success: true, message: 'Group updated' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// DELETE /api/v1/groups/:id — deletes a group (protected, must be organizer)
export const deleteExistingGroup = async (req, res) => {
    try {
        const group = await getGroupById(req.params.id);
        if (!group) return res.json({ success: false, message: 'Group not found' });

        if (group.organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.json({ success: false, message: 'Not authorised' });
        }

        await deleteGroup(req.params.id);
        return res.json({ success: true, message: 'Group deleted' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// GET /api/v1/groups/organizer/mine — returns groups owned by the logged-in user
export const getMyOrganizerGroups = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM `groups` WHERE organizer_id = ? ORDER BY created_at DESC', [req.user.id]);
        return res.json({ success: true, data: rows });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

