import express from 'express';
import admin from 'firebase-admin';
import { db } from '../server.js';

const router = express.Router();


// GET - Listar todos os pedidos (com filtros opcionais)
router.get('/', async (req, res) => {
  try {
    const { userId, status, limit = 50 } = req.query;
    
    let query = db.collection('orders');
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc').limit(parseInt(limit));
    
    const snapshot = await query.get();
    
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, orders, count: orders.length });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar pedido por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('orders').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    }
    
    res.json({ success: true, order: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo pedido
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      userEmail,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      discount,
      total,
      couponCode
    } = req.body;
    
    // Validar dados obrigatórios
    if (!userId || !items || items.length === 0 || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios faltando' 
      });
    }
    
    // Verificar estoque dos produtos
    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(400).json({ 
          success: false, 
          error: `Produto ${item.productId} não encontrado` 
        });
      }
      
      const product = productDoc.data();
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Estoque insuficiente para ${product.name}` 
        });
      }
    }
    
    const orderData = {
      userId,
      userEmail,
      items,
      shippingAddress,
      paymentMethod,
      subtotal: parseFloat(subtotal),
      shippingCost: parseFloat(shippingCost) || 0,
      discount: parseFloat(discount) || 0,
      total: parseFloat(total),
      couponCode: couponCode || null,
      status: 'pending', // pending, processing, shipped, delivered, cancelled
      paymentStatus: 'pending', // pending, paid, failed, refunded
      trackingCode: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('orders').add(orderData);
    
    // Atualizar estoque dos produtos
    for (const item of items) {
      const productRef = db.collection('products').doc(item.productId);
      await productRef.update({
        stock: admin.firestore.FieldValue.increment(-item.quantity)
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Pedido criado com sucesso',
      orderId: docRef.id,
      order: { id: docRef.id, ...orderData }
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH - Atualizar status do pedido
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingCode } = req.body;
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingCode) updateData.trackingCode = trackingCode;
    
    await db.collection('orders').doc(id).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Status do pedido atualizado com sucesso',
      orderId: id
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Cancelar pedido
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const orderDoc = await db.collection('orders').doc(id).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    }
    
    const order = orderDoc.data();
    
    // Só permite cancelar se estiver pendente
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Apenas pedidos pendentes podem ser cancelados' 
      });
    }
    
    // Devolver estoque
    for (const item of order.items) {
      const productRef = db.collection('products').doc(item.productId);
      await productRef.update({
        stock: admin.firestore.FieldValue.increment(item.quantity)
      });
    }
    
    // Atualizar status para cancelado
    await db.collection('orders').doc(id).update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Pedido cancelado com sucesso',
      orderId: id
    });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
