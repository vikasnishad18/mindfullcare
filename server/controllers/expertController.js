const {
  listExperts,
  createExpert,
  updateExpert,
  deleteExpert,
} = require("../models/expertModel");

async function getExperts(req, res, next) {
  try {
    const experts = await listExperts();
    res.json({ experts });
  } catch (err) {
    next(err);
  }
}

async function addExpert(req, res, next) {
  try {
    const { name, specialization, experience, image } = req.body || {};

    if (!name || !specialization) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const expert = await createExpert({
      name: String(name),
      specialization: String(specialization),
      experience: Number(experience || 0),
      image: image ? String(image) : null,
    });

    res.status(201).json({ expert });
  } catch (err) {
    next(err);
  }
}

async function editExpert(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const { name, specialization, experience, image } = req.body || {};

    if (!name || !specialization) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const expert = await updateExpert(id, {
      name: String(name),
      specialization: String(specialization),
      experience: Number(experience || 0),
      image: image ? String(image) : null,
    });

    if (!expert) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json({ expert });
  } catch (err) {
    next(err);
  }
}

async function removeExpert(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const result = await deleteExpert(id);

    // SQLite returns "changes" instead of affectedRows
    if (!result || result.changes === 0) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getExperts,
  addExpert,
  editExpert,
  removeExpert,
};