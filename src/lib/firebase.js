// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { listAll, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDmPOF_J6ckarUOmOtkovXH5evbm4wPlDA",
  authDomain: "cmu-build18.firebaseapp.com",
  projectId: "cmu-build18",
  storageBucket: "cmu-build18.appspot.com",
  messagingSenderId: "803530361718",
  appId: "1:803530361718:web:f78d57d7ef2ea728194857",
  measurementId: "G-R0GXBKPJG1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Download all files from a folder in Firebase Storage
export const downloadFiles = async (folder) => {
  const storageRef = ref(storage, folder);
  const files = await listAll(storageRef);
  const urls = [];
  for (const file of files.items) {
    const url = await getDownloadURL(file);
    urls.push(url);
  }
  return urls;
};

// Download the 'contracts/teams' folder
export const downloadTeamContracts = async () => {
  return downloadFiles('contracts/teams');
};

// Download the 'resumes' folder
export const downloadResumes = async () => {
  return downloadFiles('resumes');
};