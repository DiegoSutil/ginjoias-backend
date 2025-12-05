import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

// Garante que as variáveis de ambiente sejam carregadas, se for rodar este módulo diretamente
dotenv.config();

// Inicializar Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "sansei-d3cf6",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  // IMPORTANTE: Trata a chave privada para quebras de linha reais
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CERT_URL
};

// Inicializar Firebase apenas se não estiver inicializado e as credenciais estiverem disponíveis
if (admin.apps.length === 0) {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin inicializado (via config/firebase.js)');
    } else {
      console.warn('⚠️  Firebase Admin não inicializado. Verifique as variáveis de ambiente.');
    }
}

// Exporta o objeto 'admin' e a instância do Firestore 'db' já inicializados.
// Isso garante que qualquer arquivo que importe este módulo, inicialize o Admin SDK primeiro.
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
