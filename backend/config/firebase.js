import * as admin from 'firebase-admin'; // 👈 CORREÇÃO ESSENCIAL: Garante que 'admin' não é undefined
import dotenv from 'dotenv';

dotenv.config();

// Inicializar Firebase Admin. Usamos os nomes EXATOS das variáveis de ambiente.
const serviceAccount = {
  // Variáveis com nome minúsculo
  type: process.env.type || "service_account",
  project_id: process.env.project_id || "sansei-d3cf6",
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain,
  
  // Variável com nome MAIÚSCULO
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  
  // A chave privada: USANDO process.env.private_key (minúsculo). 
  // O .replace() é crucial para formatar a chave corretamente.
  private_key: process.env.private_key?.replace(/\\n/g, '\n'), 
};

// Linha 33 (Local onde o erro estava ocorrendo)
if (admin.apps.length === 0) {
    if (process.env.private_key && process.env.client_email) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin inicializado com sucesso.');
      } catch (e) {
        console.error('❌ Erro durante initializeApp. Verifique a formatação da chave privada (private_key):', e.message);
        throw e;
      }
    } else {
      console.warn('⚠️  Firebase Admin não inicializado. Variáveis de ambiente (private_key ou client_email) faltando.');
    }
}

// Exporta o objeto 'admin' e a instância do Firestore 'db' e Auth 'auth' já inicializados.
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
