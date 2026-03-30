const express = require("express");
const { register, login, adminLogin, me } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, me);
router.post("/register", register);
router.post("/login", login);
router.post("/admin/login", adminLogin);

module.exports = router;
