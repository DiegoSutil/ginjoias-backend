// /app/config/firebase.js

import * as admin from 'firebase-admin'; // CORREÇÃO: Garante que 'admin' não é undefined
import dotenv from 'dotenv';

// Garante que as variáveis de ambiente sejam carregadas.
dotenv.config();

// Inicializar Firebase Admin
// Usamos os nomes EXATOS das variáveis de ambiente que você forneceu.
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
  
  // Variáveis com nome MAIÚSCULO
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  
  // A chave privada: USAMOS process.env.private_key (minúsculo)
  // O .replace() é mantido para converter '\n' literais em quebras de linha reais.
  private_key: process.env.private_key?.replace(/\\n/g, '\n'), 
};

// Se a chave privada ou email de cliente estiverem faltando, 
// o processo de inicialização será ignorado, evitando crashes.
if (admin.apps.length === 0) { // Linha 31 (agora corrigida)
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
