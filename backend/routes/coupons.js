import express from 'express';
// ❌ ANTES: import admin from 'firebase-admin';
import admin, { db } from '../config/firebase.js'; // 🟢 NOVO: Importa instâncias prontas

const router = express.Router();
// ❌ REMOVIDO: const db = admin.firestore();

// GET - Listar todos os cupons
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    
    let query = db.collection('coupons');
    
    if (active === 'true') {
      query = query.where('active', '==', true);
    }
    
    const snapshot = await query.get();
    
    const coupons = [];
    snapshot.forEach(doc => {
      coupons.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ success: true, coupons, count: coupons.length });
  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Validar cupom
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, error: 'Código do cupom é obrigatório' });
    }
    
    // Buscar cupom pelo código
    const snapshot = await db.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: 'Cupom não encontrado ou inválido' });
    }
    
    const couponDoc = snapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() };
    
    // 1. Verificar se está ativo
    if (!coupon.active) {
      return res.status(400).json({ success: false, error: 'Cupom inativo' });
    }
    
    // 2. Verificar data de expiração
    if (coupon.expirationDate && new Date(coupon.expirationDate.toDate()) < new Date()) {
        return res.status(400).json({ success: false, error: 'Cupom expirado' });
    }

    // 3. Verificar valor mínimo de compra
    if (coupon.minPurchase && parseFloat(subtotal) < coupon.minPurchase) {
      return res.status(400).json({ success: false, error: `Valor mínimo de compra de R$ ${coupon.minPurchase.toFixed(2)} não atingido` });
    }

    // 4. Calcular desconto
    let discount = 0;
    if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discount = parseFloat(subtotal) * (coupon.value / 100);
    }
    
    // 5. Aplicar limite máximo de desconto (se houver)
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
    
    res.json({ 
      success: true, 
      coupon,
      discount: parseFloat(discount.toFixed(2)) 
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar novo cupom
router.post('/', async (req, res) => {
  try {
    const { code, type, value, minPurchase, maxDiscount, expirationDate, active = true } = req.body;
    
    const couponData = {
      code: code.toUpperCase(),
      type: type, // 'fixed' ou 'percentage'
      value: parseFloat(value),
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscount: parseFloat(maxDiscount) || null,
      expirationDate: expirationDate ? admin.firestore.Timestamp.fromDate(new Date(expirationDate)) : null,
      active: active,
      usageCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('coupons').add(couponData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Cupom criado com sucesso',
      couponId: docRef.id,
      coupon: { id: docRef.id, ...couponData }
    });
  } catch (error) {
    console.error('Erro ao criar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar cupom
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Converte a data se for fornecida
    if (updateData.expirationDate) {
        updateData.expirationDate = admin.firestore.Timestamp.fromDate(new Date(updateData.expirationDate));
    }

    // Garante que o código seja uppercase se for alterado
    if (updateData.code) {
        updateData.code = updateData.code.toUpperCase();
    }
    
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.usageCount;
    
    await db.collection('coupons').doc(id).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Cupom atualizado com sucesso',
      couponId: id
    });
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Deletar cupom
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('coupons').doc(id).delete();
    
    res.json({ 
      success: true, 
      message: 'Cupom deletado com sucesso',
      couponId: id
    });
  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH - Incrementar uso do cupom
router.patch('/:id/use', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.collection('coupons').doc(id).update({
      usageCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Contagem de uso do cupom atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar uso do cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
