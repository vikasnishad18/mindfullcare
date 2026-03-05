const { query } = require("../config/db");

async function createBooking(req, res, next) {
  try {
    const { name, email, therapistName, date, time, notes } = req.body || {};
    if (!name || !email || !therapistName || !date || !time) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const userId = req.user ? Number(req.user.id) : null;

    const result = await query(
      `INSERT INTO bookings (user_id, name, email, therapist_name, session_date, session_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        String(name),
        String(email),
        String(therapistName),
        String(date),
        String(time),
        notes ? String(notes) : null,
      ]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const userId = Number(req.user.id);
    const rows = await query(
      `SELECT id, therapist_name, session_date, session_time, notes, status, created_at
       FROM bookings
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ bookings: rows });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createBooking, getMyBookings };
