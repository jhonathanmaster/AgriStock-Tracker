/**
 * Exports every Firestore collection (and subcollection) to firebase-backup.json.
 *
 * Runs on your own machine with a service-account key you downloaded from the
 * Firebase console (firebase-key.json in the project folder). The key is only read
 * locally and never printed. Firebase is only read, never modified.
 *
 * Usage (Docker, see "Exportar Firebase.command"):
 *   node scripts/firestore-export.cjs [keyFile] [outFile]
 * Env: FIRESTORE_DATABASE_ID to read a database other than "(default)".
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getFirestore, Timestamp, GeoPoint, DocumentReference } = require('firebase-admin/firestore');

const KEY_FILE = path.resolve(process.argv[2] || 'firebase-key.json');
const OUT_FILE = path.resolve(process.argv[3] || 'firebase-backup.json');
const EXPECTED_PROJECT = 'studio-7807631118-f734e';

function fail(msg) {
  console.error(`\n[export] ERROR: ${msg}`);
  process.exit(1);
}

/** Converts Firestore values into plain JSON, tagging special types so they can be restored. */
function toJson(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Timestamp) return { __type: 'timestamp', value: value.toDate().toISOString() };
  if (value instanceof GeoPoint) return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { __type: 'reference', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __type: 'bytes', base64: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(toJson);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toJson(v);
    return out;
  }
  return value;
}

async function exportCollection(colRef, stats, prefix) {
  const docs = [];
  // listDocuments() also returns "phantom" parents that only hold subcollections.
  const refs = await colRef.listDocuments();
  for (const ref of refs) {
    const snap = await ref.get();
    const entry = { id: ref.id, exists: snap.exists, data: snap.exists ? toJson(snap.data()) : null };
    const subs = await ref.listCollections();
    if (subs.length > 0) {
      entry.subcollections = {};
      for (const sub of subs) {
        entry.subcollections[sub.id] = await exportCollection(sub, stats, `${prefix}${colRef.id}/${ref.id}/`);
      }
    }
    docs.push(entry);
  }
  const key = `${prefix}${colRef.id}`;
  stats[key] = (stats[key] || 0) + docs.filter((d) => d.exists).length;
  return docs;
}

async function main() {
  if (!fs.existsSync(KEY_FILE)) fail(`No encuentro ${path.basename(KEY_FILE)} en la carpeta del proyecto.`);
  let key;
  try {
    key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  } catch {
    fail(`${path.basename(KEY_FILE)} no es un JSON válido.`);
  }
  if (key.type !== 'service_account' || !key.project_id || !key.private_key || !key.client_email) {
    fail(`${path.basename(KEY_FILE)} no parece una clave de cuenta de servicio (service account key).`);
  }
  if (key.project_id !== EXPECTED_PROJECT) {
    console.log(`[export] Aviso: la clave es del proyecto "${key.project_id}" (GeiaTienda usaba "${EXPECTED_PROJECT}"). Continúo de todos modos.`);
  }

  const app = admin.initializeApp({ credential: admin.credential.cert(key), projectId: key.project_id });
  const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  const db = dbId === '(default)' ? getFirestore(app) : getFirestore(app, dbId);

  console.log(`[export] proyecto: ${key.project_id}  base de datos: ${dbId}`);
  let collections;
  try {
    collections = await db.listCollections();
  } catch (err) {
    if (String(err.message || '').includes('PERMISSION_DENIED') || err.code === 7) {
      fail('La clave no tiene permiso para leer Firestore. Revisa que sea del proyecto correcto.');
    }
    fail(`No pude abrir Firestore: ${err.message}`);
  }
  console.log(`[export] colecciones encontradas: ${collections.map((c) => c.id).join(', ') || '(ninguna)'}`);

  const stats = {};
  const result = {};
  for (const col of collections) {
    process.stdout.write(`[export] leyendo ${col.id}... `);
    result[col.id] = await exportCollection(col, stats, '');
    console.log(`${stats[col.id] || 0} documentos`);
  }

  const backup = {
    format: 'geiatienda-firestore-backup/v1',
    exportedAt: new Date().toISOString(),
    projectId: key.project_id,
    databaseId: dbId,
    counts: stats,
    collections: result,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(backup, null, 2));
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log(`\n[export] listo: ${total} documentos guardados en ${path.basename(OUT_FILE)}`);
  await app.delete();
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));
