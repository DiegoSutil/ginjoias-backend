import express from 'express';
// ❌ REMOVA: import admin from 'firebase-admin';

// ✅ NOVO: Importa o Admin e o db (firestore) JÁ inicializados do seu módulo de configuração
import admin, { db } from '../config/firebase.js'; 

const router = express.Router();
// ❌ REMOVA: const db = admin.firestore(); // 'db' já foi importado acima

// GET - Listar todos os produtos
router.get('/', async (req, res) => {
// ... (o restante do código permanece o mesmo, usando 'db' e 'admin') ...
  try {
    const { category, minPrice, maxPrice, search, limit = 50 } = req.query;
// ...
// Citações no código abaixo referem-se à estrutura original do products.js
// ...
    // Filtrar por categoria
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.limit(parseInt(limit)).get();
    // ...
    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ... O restante do código usa 'db' e 'admin' corretamente agora.
export default router;
