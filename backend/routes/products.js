import express from 'express';
// ❌ ANTES: import admin from 'firebase-admin';
// ✅ DEPOIS: Importa o admin e o db já inicializados.
import admin, { db } from '../config/firebase.js'; 

const router = express.Router();
// ❌ REMOVIDO: const db = admin.firestore();

// GET - Listar todos os produtos
router.get('/', async (req, res) => {
// ... (o restante do seu código permanece o mesmo, pois 'db' e 'admin' estão disponíveis) ...
  try {
    const { category, minPrice, maxPrice, search, limit = 50 } = req.query;
    
    let query = db.collection('products');
    
    // Filtrar por categoria
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.limit(parseInt(limit)).get();
    
    let products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    // Filtros adicionais (client-side)
    if (minPrice) {
      products = products.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      products = products.filter(p => p.price <= parseFloat(maxPrice));
    }
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('products').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    }
    
    res.json({ success: true, product: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo produto
router.post('/', async (req, res) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      category: req.body.category,
      image: req.body.image || 'https://placehold.co/400x500/cccccc/ffffff?text=Produto',
      stock: parseInt(req.body.stock) || 0,
      rating: 0,
      reviews: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('products').add(productData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Produto criado com sucesso',
      productId: docRef.id,
      product: { id: docRef.id, ...productData }
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar produto
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Remover campos que não devem ser atualizados diretamente
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.reviews;
    delete updateData.rating;
    
    await db.collection('products').doc(id).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Produto atualizado com sucesso',
      productId: id
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Deletar produto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('products').doc(id).delete();
    
    res.json({ 
      success: true, 
      message: 'Produto deletado com sucesso',
      productId: id
    });
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH - Atualizar estoque
router.patch('/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation = 'set' } = req.body;
    
    const productRef = db.collection('products').doc(id);
    const doc = await productRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    }
    
    let newStock;
    if (operation === 'increment') {
      newStock = doc.data().stock + parseInt(quantity);
    } else if (operation === 'decrement') {
      newStock = Math.max(0, doc.data().stock - parseInt(quantity));
    } else {
      newStock = parseInt(quantity);
    }
    
    await productRef.update({ 
      stock: newStock,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Estoque atualizado com sucesso',
      newStock
    });
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
