const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const rateLimiter = require("../../middleware/rateLimiter");

router.post("/login", rateLimiter, authController.login);
router.post("/forgot-password", rateLimiter, authController.forgotPassword);

module.exports = router;
