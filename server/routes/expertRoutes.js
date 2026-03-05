const express = require("express");
const { getExperts, addExpert, editExpert, removeExpert } = require("../controllers/expertController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", getExperts);
router.post("/", requireAdmin, addExpert);
router.put("/:id", requireAdmin, editExpert);
router.delete("/:id", requireAdmin, removeExpert);

module.exports = router;

