const { query } = require("../config/db");

async function listExperts() {
  return query(
    "SELECT id, name, specialization, experience, image, created_at FROM experts ORDER BY id DESC"
  );
}

async function getExpertById(id) {
  const rows = await query(
    "SELECT id, name, specialization, experience, image, created_at FROM experts WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function createExpert({ name, specialization, experience, image }) {
  const result = await query(
    "INSERT INTO experts (name, specialization, experience, image) VALUES (?, ?, ?, ?)",
    [name, specialization, experience, image || null]
  );
  return getExpertById(result.insertId);
}

async function updateExpert(id, { name, specialization, experience, image }) {
  await query(
    "UPDATE experts SET name = ?, specialization = ?, experience = ?, image = ? WHERE id = ?",
    [name, specialization, experience, image || null, id]
  );
  return getExpertById(id);
}

async function deleteExpert(id) {
  const result = await query("DELETE FROM experts WHERE id = ?", [id]);
  return { affectedRows: result.affectedRows || 0 };
}

module.exports = {
  listExperts,
  getExpertById,
  createExpert,
  updateExpert,
  deleteExpert,
};

