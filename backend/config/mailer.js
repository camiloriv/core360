require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Verificación
transporter.verify()
    .then(() => console.log("✅ SMTP OK"))
    .catch(err => console.error("❌ SMTP ERROR:", err.message));

module.exports = transporter;
