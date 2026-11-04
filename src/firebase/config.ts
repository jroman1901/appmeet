import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// TEMPORAL: hardcodeado para descartar que sea un problema de variables de
// entorno de Vercel. Revertir a variables de entorno una vez descartado.
const firebaseConfig = {
  apiKey: 'AIzaSyDK_K_vDZMP45lU0A6JZhADuymkRnrOKXE',
  authDomain: 'appmeet-a99e7.firebaseapp.com',
  projectId: 'appmeet-a99e7',
  storageBucket: 'appmeet-a99e7.firebasestorage.app',
  messagingSenderId: '192865921382',
  appId: '1:192865921382:web:63571df42b61ef0b9400a7',
  measurementId: 'G-897MMB8RGS'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Algunas redes/proxies bloquean o degradan el canal de streaming que usa
// Firestore por defecto (WebChannel), causando errores de "client is offline"
// solo en producción. Forzar long-polling evita ese transporte y es la
// solución recomendada por Firebase para este síntoma.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});
export default app;
