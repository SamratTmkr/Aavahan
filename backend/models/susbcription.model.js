import pool from '../src/db.js';

// Frequency → days mapping for renewal calculation
export const RENEWAL_PERIODS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

// Pre-save logic: auto-calculates renewal_date and sets status based on dates
export const prepareSubscriptionData = (data) => {
  const prepared = { ...data };

  const startDate = prepared.start_date ? new Date(prepared.start_date) : new Date();
  prepared.start_date = startDate.toISOString().split('T')[0];

  // Auto-calculate renewal_date if missing
  if (!prepared.renewal_date) {
    const daysToAdd = RENEWAL_PERIODS[prepared.frequency] || 30;
    const calculatedRenewal = new Date(startDate);
    calculatedRenewal.setDate(calculatedRenewal.getDate() + daysToAdd);
    prepared.renewal_date = calculatedRenewal.toISOString().split('T')[0];
  } else {
    prepared.renewal_date = new Date(prepared.renewal_date).toISOString().split('T')[0];
  }

  // Mark as expired if renewal date already passed
  if (new Date(prepared.renewal_date) < new Date()) {
    prepared.status = 'expired';
  } else if (!prepared.status) {
    prepared.status = 'active';
  }

  return prepared;
};

// Subscription schema descriptor — mirrors the 'subscriptions' table
export const subscriptionSchema = {
  tableName: 'subscriptions',
  fields: {
    id:             { type: 'INT', primaryKey: true, autoIncrement: true },
    user_id:        { type: 'INT', required: true },
    name:           { type: 'VARCHAR(150)', required: true },
    price:          { type: 'DECIMAL(10,2)', required: true },
    currency:       { type: 'VARCHAR(10)', enum: ['NPR', 'USD', 'EUR', 'INR'], default: 'NPR' },
    frequency:      { type: 'VARCHAR(20)', enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly' },
    payment_method: { type: 'VARCHAR(50)', required: true },
    status:         { type: 'VARCHAR(20)', enum: ['active', 'cancelled', 'expired'], default: 'active' },
    start_date:     { type: 'DATE', required: true },
    renewal_date:   { type: 'DATE', required: true },
    created_at:     { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP' },
    updated_at:     { type: 'TIMESTAMP', readOnly: true, default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
  },
};

// SQL model — runs queries with pre-save calculations applied
const Subscription = {
  // Insert a new subscription with auto-calculated renewal_date
  async create(data) {
    const prepared = prepareSubscriptionData(data);
    const [result] = await pool.execute(
      `INSERT INTO subscriptions
       (user_id, name, price, currency, frequency, payment_method, status, start_date, renewal_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [prepared.user_id, prepared.name, prepared.price, prepared.currency || 'NPR',
       prepared.frequency || 'monthly', prepared.payment_method, prepared.status,
       prepared.start_date, prepared.renewal_date]
    );
    return { id: result.insertId, ...prepared };
  },

  // Find by primary key
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM subscriptions WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Find all subscriptions belonging to a user
  async findByUserId(userId) {
    const [rows] = await pool.execute('SELECT * FROM subscriptions WHERE user_id = ?', [userId]);
    return rows;
  },

  // Get every subscription ordered by newest first
  async findAll() {
    const [rows] = await pool.execute('SELECT * FROM subscriptions ORDER BY created_at DESC');
    return rows;
  },
};

export default Subscription;
