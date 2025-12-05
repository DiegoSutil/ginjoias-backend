// /app/config/firebase.js (CORRIGIDO)

// 1. CORREÇÃO PRINCIPAL: Importa todo o módulo 'firebase-admin' como 'admin'
import * as admin from 'firebase-admin'; 
import dotenv from 'dotenv';

// Garante que as variáveis de ambiente sejam carregadas.
dotenv.config();

// Inicializar Firebase Admin
// 2. AJUSTE: Usando os nomes exatos das variáveis de ambiente que você forneceu.
const serviceAccount = {
  type: process.env.type || "service_account",
  project_id: process.env.project_id || "sansei-d3cf6",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  
  // ⚠️ IMPORTANTE: Usando process.env.private_key (minúsculo)
  // O .replace() converte as quebras de linha codificadas em quebras de linha reais, essencial para a chave.
  private_key: process.env.private_key?.replace(/\\n/g, '\n'), 
  
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain: process.env.universe_domain,
};

// 3. O 'admin' agora está definido, e o código pode verificar 'admin.apps.length'
if (admin.apps.length === 0) {
    if (process.env.private_key && process.env.client_email) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin inicializado com sucesso.');
      } catch (e) {
        console.error('❌ Erro durante initializeApp:', e.message);
        throw e;
      }
    } else {
      console.warn('⚠️  Firebase Admin não inicializado. Variáveis de ambiente faltando.');
    }
}

// Exporta o objeto 'admin' e a instância do Firestore 'db' e Auth 'auth' já inicializados.
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;
