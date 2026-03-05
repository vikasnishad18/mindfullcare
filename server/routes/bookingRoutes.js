const express = require("express");
const { createBooking, getMyBookings } = require("../controllers/bookingController");
const { optionalAuth, requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", optionalAuth, createBooking);
router.get("/mine", requireAuth, getMyBookings);

module.exports = router;
