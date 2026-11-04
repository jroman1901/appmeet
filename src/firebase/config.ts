import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// .trim() protege contra espacios/tabs invisibles pegados por error al
// guardar la variable en el panel de Vercel (causa real de que Firestore
// fallara solo en producción: REACT_APP_FIREBASE_PROJECT_ID tenía un tab
// al inicio del valor).
const env = (value: string | undefined) => value?.trim();

const firebaseConfig = {
  apiKey: env(process.env.REACT_APP_FIREBASE_API_KEY),
  authDomain: env(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  projectId: env(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  storageBucket: env(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: env(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  appId: env(process.env.REACT_APP_FIREBASE_APP_ID),
  measurementId: env(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID)
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
