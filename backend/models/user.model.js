import pool from '../src/db.js';

// User schema descriptor — mirrors the 'users' table
export const userSchema = {
  tableName: 'users',
  fields: {
    id:            { type: 'INT', primaryKey: true, autoIncrement: true },
    name:          { type: 'VARCHAR(120)', required: true, maxLength: 120 },
    email:         { type: 'VARCHAR(255)', required: true, unique: true, maxLength: 255 },
    password_hash: { type: 'TEXT', required: true },
    role:          { type: 'VARCHAR(20)', enum: ['user', 'admin'], default: 'user' },
    avatar_url:    { type: 'TEXT', required: false, default: null },
    created_at:    { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP' },
  },
};

export default userSchema;
