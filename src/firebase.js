import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBb_LJ6HXFj7oR0Z3gHbSPuGbaxhHK_og8",
  authDomain: "pran-sanjeevani.firebaseapp.com",
  projectId: "pran-sanjeevani",
  storageBucket: "pran-sanjeevani.firebasestorage.app",
  messagingSenderId: "624061983307",
  appId: "1:624061983307:web:49c2a7fd536ca63b7cbbce",
  measurementId: "G-L4D2X11YCB"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
