import express from 'express';
// ❌ ANTES: import admin from 'firebase-admin';
import admin, { db } from '../config/firebase.js'; // 🟢 NOVO: Importa instâncias prontas

const router = express.Router();
// ❌ REMOVIDO: const db = admin.firestore();

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
  // O ideal é usar uma transaction para garantir a atomicidade (atualizar estoque e criar pedido)
  const t = db.runTransaction(async (transaction) => {
    try {
      const { userId, items, shippingAddress, paymentMethod, shippingCost, subtotal, total, couponCode } = req.body;
      
      const orderData = {
        userId,
        items,
        shippingAddress,
        paymentMethod,
        shippingCost: parseFloat(shippingCost) || 0,
        subtotal: parseFloat(subtotal),
        total: parseFloat(total),
        couponCode: couponCode || null,
        status: 'pending', // pending, processing, shipped, delivered, cancelled
        paymentStatus: 'pending', // pending, approved, rejected
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // 1. Verificar e decrementar estoque
      for (const item of items) {
        const productRef = db.collection('products').doc(item.productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error(`Produto não encontrado: ${item.productId}`);
        }
        
        const currentStock = productDoc.data().stock;
        const requiredQuantity = item.quantity;
        
        if (currentStock < requiredQuantity) {
          throw new Error(`Estoque insuficiente para ${productDoc.data().name}. Disponível: ${currentStock}`);
        }
        
        // Decrementar estoque dentro da transação
        transaction.update(productRef, {
          stock: currentStock - requiredQuantity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // 2. Criar o pedido
      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, orderData);
      
      return { orderId: orderRef.id, ...orderData };
    } catch (error) {
      // Rejeita a transação
      throw error;
    }
  });
  
  try {
    const order = await t;
    res.status(201).json({ 
      success: true, 
      message: 'Pedido criado com sucesso',
      orderId: order.orderId,
      order: order
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    // Erros da transação são capturados aqui
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar status do pedido (Geralmente usado por Admin/Webhooks de Pagamento)
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (status) {
      updateData.status = status;
    }
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    
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
  // Usar transaction para garantir que o estoque seja devolvido
  const t = db.runTransaction(async (transaction) => {
    try {
      const { id } = req.params;
      const orderRef = db.collection('orders').doc(id);
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new Error('Pedido não encontrado');
      }
      
      const order = orderDoc.data();
      
      // Só permite cancelar se estiver pendente ou processando (depende da sua regra de negócio)
      if (order.status !== 'pending') {
        throw new Error('Apenas pedidos pendentes podem ser cancelados');
      }
      
      // Devolver estoque
      for (const item of order.items) {
        const productRef = db.collection('products').doc(item.productId);
        // Incrementar estoque dentro da transação
        transaction.update(productRef, {
          stock: admin.firestore.FieldValue.increment(item.quantity)
        });
      }
      
      // Atualizar status para cancelado
      transaction.update(orderRef, {
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { message: 'Pedido cancelado com sucesso', orderId: id };

    } catch (error) {
      throw error;
    }
  });

  try {
    const result = await t;
    res.json({ 
      success: true, 
      message: result.message,
      orderId: result.orderId
    });
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
