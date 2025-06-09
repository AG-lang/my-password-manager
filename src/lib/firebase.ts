// lib/firebase.ts

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZy59ITQEDRyHhwpsRqBIt2ZEyAhEp8qs",
    authDomain: "password-18749.firebaseapp.com",
    projectId: "password-18749",
    storageBucket: "password-18749.firebasestorage.app",
    messagingSenderId: "819084529737",
    appId: "1:819084529737:web:a87877c88460714c0aaf98"
  };
  

// 初始化 Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// 导出你需要的服务
export const auth = getAuth(app);
export const db = getFirestore(app);