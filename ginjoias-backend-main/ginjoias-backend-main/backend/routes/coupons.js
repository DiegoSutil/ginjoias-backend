import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();
const db = admin.firestore();

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
      return res.status(404).json({ success: false, error: 'Cupom não encontrado' });
    }
    
    const couponDoc = snapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() };
    
    // Validações
    if (!coupon.active) {
      return res.status(400).json({ success: false, error: 'Cupom inativo' });
    }
    
    if (coupon.expiresAt && coupon.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ success: false, error: 'Cupom expirado' });
    }
    
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, error: 'Cupom esgotado' });
    }
    
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return res.status(400).json({ 
        success: false, 
        error: `Valor mínimo de compra: R$ ${coupon.minPurchase.toFixed(2)}` 
      });
    }
    
    // Calcular desconto
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = subtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === 'fixed') {
      discountAmount = coupon.discountValue;
    }
    
    res.json({ 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount
      },
      discountAmount
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Criar cupom
router.post('/', async (req, res) => {
  try {
    const {
      code,
      description,
      discountType, // 'percentage' ou 'fixed'
      discountValue,
      minPurchase,
      maxDiscount,
      usageLimit,
      expiresAt,
      active = true
    } = req.body;
    
    // Validações
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dados obrigatórios faltando' 
      });
    }
    
    // Verificar se código já existe
    const existingCoupon = await db.collection('coupons')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get();
    
    if (!existingCoupon.empty) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código de cupom já existe' 
      });
    }
    
    const couponData = {
      code: code.toUpperCase(),
      description: description || '',
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchase: minPurchase ? parseFloat(minPurchase) : null,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
      usageLimit: usageLimit ? parseInt(usageLimit) : null,
      usageCount: 0,
      expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(new Date(expiresAt)) : null,
      active,
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
      message: 'Uso do cupom registrado'
    });
  } catch (error) {
    console.error('Erro ao registrar uso:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
