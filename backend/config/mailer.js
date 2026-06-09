require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");

let transporter;

if (process.env.RESEND_API_KEY) {
    console.log("📨 Mailer configured to use Resend HTTP API");
    
    // Wrapper object that mimics nodemailer's transporter
    transporter = {
        verify: async () => {
            if (!process.env.RESEND_API_KEY.startsWith("re_")) {
                throw new Error("Invalid Resend API Key format (must start with re_)");
            }
            return true;
        },
        sendMail: async (options) => {
            const { from, to, cc, bcc, subject, html, attachments = [] } = options;
            
            // Format attachments to Resend API format (Base64)
            const formattedAttachments = attachments.map(attachment => {
                const formatted = {
                    filename: attachment.filename
                };
                
                if (attachment.cid) {
                    formatted.contentId = attachment.cid;
                }
                
                if (attachment.contentType) {
                    formatted.contentType = attachment.contentType;
                }
                
                if (attachment.content) {
                    if (Buffer.isBuffer(attachment.content)) {
                        formatted.content = attachment.content.toString("base64");
                    } else if (typeof attachment.content === "string") {
                        const isBase64 = attachment.content.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/);
                        if (isBase64) {
                            formatted.content = attachment.content;
                        } else {
                            formatted.content = Buffer.from(attachment.content).toString("base64");
                        }
                    }
                } else if (attachment.path) {
                    if (fs.existsSync(attachment.path)) {
                        const fileBuffer = fs.readFileSync(attachment.path);
                        formatted.content = fileBuffer.toString("base64");
                    } else {
                        formatted.path = attachment.path;
                    }
                }
                
                return formatted;
            });
            
            // Standardize recipients to arrays
            const toArray = Array.isArray(to) ? to : [to];
            const ccArray = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
            const bccArray = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
            
            const payload = {
                from: from || `"Sistema" <onboarding@resend.dev>`,
                to: toArray,
                ...(ccArray && ccArray.length > 0 && { cc: ccArray }),
                ...(bccArray && bccArray.length > 0 && { bcc: bccArray }),
                subject,
                html,
                ...(formattedAttachments.length > 0 && { attachments: formattedAttachments })
            };
            
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Resend API Error (Status ${response.status}): ${errorText}`);
            }
            
            const responseData = await response.json();
            return {
                messageId: responseData.id || "resend-msg-id"
            };
        }
    };
} else {
    console.log("🔌 Mailer configured to use standard SMTP");
    
    const smtpTransporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
    
    transporter = {
        verify: () => smtpTransporter.verify(),
        sendMail: (options) => smtpTransporter.sendMail(options)
    };
    
    // Non-blocking verification check on startup
    smtpTransporter.verify()
        .then(() => console.log("✅ SMTP OK"))
        .catch(err => console.error("❌ SMTP ERROR:", err.message));
}

module.exports = transporter;
