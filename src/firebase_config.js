// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDz_u3Yoks5PK9xgCgQOfeNNZYZxd0qzaU",
  authDomain: "messanger-902a6.firebaseapp.com",
  projectId: "messanger-902a6",
  storageBucket: "messanger-902a6.firebasestorage.app",
  messagingSenderId: "963093421473",
  appId: "1:963093421473:web:b34fd4dbe038fbe9ca3fe0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const provider = new GoogleAuthProvider();
export const auth = getAuth(app);
export const db = getFirestore(app);
