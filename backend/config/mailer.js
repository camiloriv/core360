require("dotenv").config();
const fs = require("fs");

let transporter;

if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    console.log("📨 Mailer configured to use Microsoft Graph API (Azure AD)");

    // Token caching
    let graphToken = null;
    let tokenExpiresAt = null;

    const getGraphToken = async () => {
        if (graphToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
            return graphToken;
        }

        const response = await fetch(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: process.env.AZURE_CLIENT_ID,
                client_secret: process.env.AZURE_CLIENT_SECRET,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials"
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error fetching token from Azure AD: ${errText}`);
        }

        const data = await response.json();
        graphToken = data.access_token;
        // token expires_in is in seconds, subtract 5 mins (300s) for buffer
        tokenExpiresAt = new Date(new Date().getTime() + (data.expires_in - 300) * 1000); 
        return graphToken;
    };

    transporter = {
        verify: async () => {
            try {
                await getGraphToken();
                return true;
            } catch (err) {
                console.error("❌ Azure AD Verification Error:", err.message);
                throw err;
            }
        },
        sendMail: async (options) => {
            const { from, to, cc, bcc, subject, html, attachments = [] } = options;
            
            const accessToken = await getGraphToken();

            // Format attachments for Microsoft Graph API
            const formattedAttachments = attachments.map(attachment => {
                const formatted = {
                    "@odata.type": "#microsoft.graph.fileAttachment",
                    name: attachment.filename || "attachment"
                };
                
                if (attachment.cid) {
                    formatted.isInline = true;
                    formatted.contentId = attachment.cid;
                }
                
                if (attachment.contentType) {
                    formatted.contentType = attachment.contentType;
                }
                
                if (attachment.content) {
                    if (Buffer.isBuffer(attachment.content)) {
                        formatted.contentBytes = attachment.content.toString("base64");
                    } else if (typeof attachment.content === "string") {
                        const isBase64 = attachment.content.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/);
                        if (isBase64) {
                            formatted.contentBytes = attachment.content;
                        } else {
                            formatted.contentBytes = Buffer.from(attachment.content).toString("base64");
                        }
                    }
                } else if (attachment.path) {
                    if (fs.existsSync(attachment.path)) {
                        const fileBuffer = fs.readFileSync(attachment.path);
                        formatted.contentBytes = fileBuffer.toString("base64");
                    }
                }
                
                return formatted;
            }).filter(att => att.contentBytes); // Ensure we only send valid attachments
            
            const toArray = Array.isArray(to) ? to : to.split(",").map(e => e.trim());
            
            let mailFrom = process.env.SMTP_USER;
            if (from) {
                // Si el formato es "Nombre <correo@dominio.com>", extraemos el correo
                const emailMatch = from.match(/<(.+)>/);
                mailFrom = emailMatch ? emailMatch[1] : from;
            }


            // Excluir al remitente de las copias (ya que queda en su carpeta de "Elementos enviados")
            const rawCc = cc ? (Array.isArray(cc) ? cc : cc.split(",").map(e => e.trim())) : [];
            const rawBcc = bcc ? (Array.isArray(bcc) ? bcc : bcc.split(",").map(e => e.trim())) : [];
            
            const ccArray = rawCc.filter(e => e && e.toLowerCase() !== mailFrom.toLowerCase());
            const bccArray = rawBcc.filter(e => e && e.toLowerCase() !== mailFrom.toLowerCase());

            const messagePayload = {
                message: {
                    subject: subject,
                    body: {
                        contentType: "HTML",
                        content: html
                    },
                    toRecipients: toArray.map(email => ({ emailAddress: { address: email } })),
                    ...(ccArray.length > 0 && { ccRecipients: ccArray.map(email => ({ emailAddress: { address: email } })) }),
                    ...(bccArray.length > 0 && { bccRecipients: bccArray.map(email => ({ emailAddress: { address: email } })) }),
                    ...(formattedAttachments.length > 0 && { attachments: formattedAttachments })
                },
                saveToSentItems: "true"
            };
            
            // Call Microsoft Graph API using the user specified in SMTP_USER
            const endpoint = `https://graph.microsoft.com/v1.0/users/${mailFrom}/sendMail`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(messagePayload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Microsoft Graph API Error (Status ${response.status}): ${errorText}`);
            }
            
            return {
                messageId: `graph-msg-id-${Date.now()}`
            };
        }
    };
} else {
    console.log("🔌 Mailer configured to use fallback mode (Not Implemented / No Credentials)");
    transporter = {
        verify: async () => false,
        sendMail: async () => { throw new Error("No mailer configured"); }
    };
}

// Initial verification
transporter.verify()
    .then(() => console.log("✅ Mailer Verification OK"))
    .catch(err => console.error("❌ Mailer Verification ERROR:", err.message));

module.exports = transporter;
