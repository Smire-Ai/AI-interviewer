// src/config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// IMPORTANT: Replace these with your project's Firebase credentials
// You can find these in your Firebase project settings -> General tab -> Your apps -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAw31MPU-KUioICb8jvA7c5B3ob_8uk0c",
  authDomain: "movies-and-webseries-rating.firebaseapp.com",
  projectId: "movies-and-webseries-rating",
  storageBucket: "movies-and-webseries-rating.appspot.com",
  messagingSenderId: "318089754834",
  appId: "1:318089754834:web:b16260ed54d7db3159150b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);