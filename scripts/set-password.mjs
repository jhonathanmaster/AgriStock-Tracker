/**
 * Assigns a new password to an account (for example the administrator after importing from
 * Firebase, where everyone used Google). Prints the generated password once.
 *
 *   node scripts/set-password.mjs [email]
 * Without an email it uses the first address in SUPER_ADMIN_EMAILS.
 * If the account doesn't exist and the email is an owner (SUPER_ADMIN_EMAILS), it is created.
 */
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const req = createRequire(path.join(process.env.NODE_PATH || process.cwd(), 'noop.js'));
const load = (m) => {
  try {
    return req(m);
  } catch {
    return createRequire(import.meta.url)(m);
  }
};
const pg = load('pg');
const bcrypt = load('bcryptjs');

const owners = (process.env.SUPER_ADMIN_EMAILS || 'jhonathanmaster@gmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const email = (process.argv[2] || owners[0] || '').trim().toLowerCase();
if (!email.includes('@')) {
  console.error('Uso: node scripts/set-password.mjs correo@ejemplo.com');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL no está definido.');
  process.exit(1);
}

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const password = Array.from(crypto.randomBytes(16), (b) => alphabet[b % alphabet.length]).join('');
const hash = await bcrypt.hash(password, 12);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
try {
  const { rowCount } = await pool.query('update users set password_hash = $1, updated_at = now() where email = $2', [hash, email]);
  if (rowCount) {
    // Sign out every device that had the old credentials.
    await pool.query('delete from sessions where user_id = (select id from users where email = $1)', [email]);
  } else if (owners.includes(email)) {
    await pool.query(
      `insert into users (email, display_name, password_hash, enabled, role) values ($1, $2, $3, true, 'admin')`,
      [email, email.split('@')[0], hash],
    );
    console.log(`Se creó la cuenta de administrador ${email}.`);
  } else {
    console.error(`No existe una cuenta con ${email}. Invítala desde Usuarios, o agrega el correo a SUPER_ADMIN_EMAILS.`);
    process.exit(1);
  }
  console.log(`\nCorreo:     ${email}\nContraseña: ${password}\n\nGuárdala ahora; no se volverá a mostrar. Puedes cambiarla desde la app (menú de tu usuario).`);
} catch (err) {
  console.error(`No se pudo asignar la contraseña: ${err.message}`);
  process.exit(1);
} finally {
  await pool.end();
}
