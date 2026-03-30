const express = require("express");
const {
  createBooking,
  getMyBookings,
  cancelBooking,
  rescheduleBooking,
  adminListBookings,
  adminUpdateBooking,
} = require("../controllers/bookingController");
const { optionalAuth, requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/", optionalAuth, createBooking);
router.get("/mine", requireAuth, getMyBookings);
router.patch("/:id/cancel", requireAuth, cancelBooking);
router.patch("/:id/reschedule", requireAuth, rescheduleBooking);
router.get("/", requireAdmin, adminListBookings);
router.patch("/:id", requireAdmin, adminUpdateBooking);

module.exports = router;
