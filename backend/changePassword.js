const db = require('./database/connection');
const bcrypt = require('bcrypt');

async function main() {
    const targetEmail = 'crivera@proforma.cl';
    const newPassword = '123';
    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log(`Setting password to '${newPassword}' (hashed: ${hashedPassword}) for ${targetEmail}`);
        
        const [result] = await db.query("UPDATE usuarios SET contrasena = ? WHERE correo = ?", [hashedPassword, targetEmail]);
        console.log("Update result:", result);
        if (result.affectedRows === 0) {
            console.log("No user found with that email!");
        } else {
            console.log("Password updated successfully!");
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}
main();
