import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDK_K_vDZMP45lU0A6JZhADuymkRnrOKXE",
  authDomain: "appmeet-a99e7.firebaseapp.com",
  projectId: "appmeet-a99e7",
  storageBucket: "appmeet-a99e7.firebasestorage.app",
  messagingSenderId: "192865921382",
  appId: "1:192865921382:web:63571df42b61ef0b9400a7",
  measurementId: "G-897MMB8RGS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;