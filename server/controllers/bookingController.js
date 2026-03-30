const { getProvider, query } = require("../config/db");

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

async function createBooking(req, res, next) {
  try {
    const { name, email, therapistName, date, time, notes } = req.body || {};
    if (!name || !email || !therapistName || !date || !time) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const provider = getProvider();
    const userId = req.user
      ? provider === "postgres" || provider === "supabase"
        ? String(req.user.id)
        : Number(req.user.id)
      : null;

    const result = await query(
      `INSERT INTO bookings (user_id, name, email, therapist_name, session_date, session_time, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        String(name),
        String(email),
        String(therapistName),
        String(date),
        String(time),
        notes ? String(notes) : null,
        "requested",
      ]
    );

    return res.status(201).json({ id: result.insertId });
  } catch (err) {
    return next(err);
  }
}

async function getMyBookings(req, res, next) {
  try {
    const provider = getProvider();
    const userId =
      provider === "postgres" || provider === "supabase"
        ? String(req.user.id)
        : Number(req.user.id);
    const rows = await query(
      `SELECT id, therapist_name, session_date, session_time, notes, status, created_at, updated_at
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

async function cancelBooking(req, res, next) {
  try {
    const provider = getProvider();
    const userId =
      provider === "postgres" || provider === "supabase"
        ? String(req.user.id)
        : Number(req.user.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });

    const rows = await query(
      "SELECT id, status FROM bookings WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: "not_found" });

    const status = normalizeStatus(booking.status);
    if (status === "cancelled" || status === "canceled") {
      return res.status(409).json({ error: "already_cancelled" });
    }

    await query("UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?", [
      "cancelled",
      id,
      userId,
    ]);

    return res.json({ ok: true, id, status: "cancelled" });
  } catch (err) {
    return next(err);
  }
}

async function rescheduleBooking(req, res, next) {
  try {
    const provider = getProvider();
    const userId =
      provider === "postgres" || provider === "supabase"
        ? String(req.user.id)
        : Number(req.user.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });

    const { date, time } = req.body || {};
    if (!date || !time) return res.status(400).json({ error: "missing_fields" });

    const rows = await query(
      "SELECT id, status FROM bookings WHERE id = ? AND user_id = ? LIMIT 1",
      [id, userId]
    );
    const booking = rows[0];
    if (!booking) return res.status(404).json({ error: "not_found" });

    const status = normalizeStatus(booking.status);
    if (status === "cancelled" || status === "canceled") {
      return res.status(409).json({ error: "booking_cancelled" });
    }

    await query(
      "UPDATE bookings SET session_date = ?, session_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [String(date), String(time), "rescheduled", id, userId]
    );

    return res.json({ ok: true, id, status: "rescheduled" });
  } catch (err) {
    return next(err);
  }
}

async function adminListBookings(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, user_id, name, email, therapist_name, session_date, session_time, notes, status, created_at, updated_at
       FROM bookings
       ORDER BY created_at DESC`
    );
    return res.json({ bookings: rows });
  } catch (err) {
    return next(err);
  }
}

async function adminUpdateBooking(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid_id" });

    const { status, therapistName, date, time } = req.body || {};
    const nextStatus = status != null ? normalizeStatus(status) : null;

    const allowedStatuses = new Set([
      "requested",
      "confirmed",
      "rescheduled",
      "completed",
      "cancelled",
      "canceled",
    ]);

    if (nextStatus && !allowedStatuses.has(nextStatus)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    const rows = await query("SELECT id FROM bookings WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "not_found" });

    const updates = [];
    const params = [];

    if (therapistName != null) {
      updates.push("therapist_name = ?");
      params.push(String(therapistName));
    }
    if (date != null) {
      updates.push("session_date = ?");
      params.push(String(date));
    }
    if (time != null) {
      updates.push("session_time = ?");
      params.push(String(time));
    }
    if (nextStatus) {
      const normalized = nextStatus === "canceled" ? "cancelled" : nextStatus;
      updates.push("status = ?");
      params.push(normalized);
    }

    if (!updates.length) return res.status(400).json({ error: "no_updates" });

    updates.push("updated_at = CURRENT_TIMESTAMP");
    await query(`UPDATE bookings SET ${updates.join(", ")} WHERE id = ?`, [...params, id]);
    return res.json({ ok: true, id });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  adminListBookings,
  adminUpdateBooking,
};
