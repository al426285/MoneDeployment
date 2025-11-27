// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4b7jx1ZEY2zelN8cRFKf3mm0AVIKnfrI",
  authDomain: "mone-88f8f.firebaseapp.com",
  projectId: "mone-88f8f",
  storageBucket: "mone-88f8f.firebasestorage.app",
  messagingSenderId: "643677146293",
  appId: "1:643677146293:web:ed5b3667b388a37e3602fc",
  measurementId: "G-7CG415B5Y6"
};

// Initialize Firebase
const firebaseApp  = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

// Autenticación
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const db = getFirestore(firebaseApp);

// Exportamos para usar en otros archivos
export { auth, googleProvider, firebaseApp, db};

