// /app/config/firebase.js

// 🟢 ESSENCIAL: Garante que 'admin' não é undefined ao usar módulos ES
import * as admin from 'firebase-admin'; 
import dotenv from 'dotenv';

dotenv.config();

let db;
let auth;

const serviceAccount = {
  type: process.env.type || "service_account",
  project_id: process.env.project_id || "sansei-d3cf6",
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.private_key?.replace(/\\n/g, '\n'), 
};

// 1. Inicialização do Firebase Admin
function initializeFirebase() {
    // Agora, 'admin' deve estar corretamente definido por causa da Linha 4.
    if (admin.apps.length === 0) {
        if (process.env.private_key && process.env.client_email) {
          try {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
            console.log('✅ Firebase Admin inicializado com sucesso.');
          } catch (e) {
            console.error('❌ Erro durante initializeApp. Verifique a chave privada:', e.message);
            throw e;
          }
        } else {
          console.warn('⚠️  Firebase Admin não inicializado. Variáveis de ambiente faltando.');
        }
    }

    // 2. Definir as instâncias após a inicialização bem-sucedida
    db = admin.firestore();
    auth = admin.auth();
}

// 3. Chamar a função imediatamente para inicializar
initializeFirebase();

// 4. Exportar as instâncias
export { db, auth };
export default admin; // Exporta admin para uso de FieldValue.serverTimestamp()
