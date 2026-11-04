/**
 * Reasigna el campo `createdBy` de reuniones y tareas de un UID de Firebase
 * Auth viejo a uno nuevo. Útil cuando una cuenta se volvió a crear (con el
 * mismo email) y quedó con un UID distinto al que generó los datos.
 *
 * Requiere una Service Account Key:
 *   Firebase Console > Configuración del proyecto > Cuentas de servicio
 *   > Generar nueva clave privada (descarga un .json)
 *
 * Uso:
 *   npm install --no-save firebase-admin
 *   node scripts/migrate-created-by.js \
 *     --key ./serviceAccountKey.json \
 *     --old <UID_VIEJO> \
 *     --new <UID_NUEVO>
 *
 * Por defecto corre en modo "dry run" (solo muestra qué cambiaría).
 * Agrega --apply para ejecutar los cambios de verdad.
 */

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { apply: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') {
      result.apply = true;
    } else if (arg === '--key') {
      result.key = args[++i];
    } else if (arg === '--old') {
      result.oldUid = args[++i];
    } else if (arg === '--new') {
      result.newUid = args[++i];
    }
  }

  return result;
}

async function main() {
  const { key, oldUid, newUid, apply } = parseArgs();

  if (!key || !oldUid || !newUid) {
    console.error('Uso: node scripts/migrate-created-by.js --key <ruta-service-account.json> --old <UID_VIEJO> --new <UID_NUEVO> [--apply]');
    process.exit(1);
  }

  if (oldUid === newUid) {
    console.error('El UID viejo y el nuevo son iguales, no hay nada que migrar.');
    process.exit(1);
  }

  const keyPath = path.resolve(process.cwd(), key);
  if (!fs.existsSync(keyPath)) {
    console.error(`No se encontró el archivo de credenciales en: ${keyPath}`);
    process.exit(1);
  }

  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();

  console.log(`Modo: ${apply ? 'APLICANDO CAMBIOS' : 'DRY RUN (solo lectura)'}`);
  console.log(`De createdBy = ${oldUid}`);
  console.log(`A   createdBy = ${newUid}`);
  console.log('');

  for (const collectionName of ['meetings', 'tasks']) {
    const snapshot = await db.collection(collectionName).where('createdBy', '==', oldUid).get();

    console.log(`${collectionName}: ${snapshot.size} documento(s) encontrados con createdBy = ${oldUid}`);

    if (snapshot.empty) continue;

    if (!apply) {
      snapshot.docs.forEach(doc => {
        const title = doc.data().title || '(sin título)';
        console.log(`  - [dry-run] ${collectionName}/${doc.id}  "${title}"`);
      });
      continue;
    }

    const batchSize = 400;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach(doc => {
        batch.update(doc.ref, { createdBy: newUid });
      });

      await batch.commit();
      console.log(`  Actualizados ${chunk.length} documento(s) de ${collectionName} (lote ${i / batchSize + 1})`);
    }
  }

  console.log('');
  console.log(apply ? 'Migración completada.' : 'Dry run completado. Vuelve a correr con --apply para aplicar los cambios de verdad.');
}

main().catch(error => {
  console.error('Error ejecutando la migración:', error);
  process.exit(1);
});
