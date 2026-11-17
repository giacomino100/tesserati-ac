/**
 * Configurazione web del progetto Firebase "tesseramento-ac".
 * L'apiKey di una web app Firebase non è un segreto: la sicurezza dei dati è affidata
 * alle regole di Firestore/Auth. Da usare solo nell'app (mai in packages/fees).
 * Analytics non è collegato: si aggiunge solo se serve.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyDnaOS4d14MoJleFrt7ZVMc0iCbCekpNHw',
  authDomain: 'tesseramento-ac.firebaseapp.com',
  projectId: 'tesseramento-ac',
  storageBucket: 'tesseramento-ac.firebasestorage.app',
  messagingSenderId: '913525785778',
  appId: '1:913525785778:web:effba1b5eaeb11e0adb5ab',
  measurementId: 'G-D7NMWZMV5S',
} as const;
