import express from 'express';
// ❌ ANTES: import admin from 'firebase-admin';
import admin, { db, auth } from '../config/firebase.js'; // 🟢 NOVO: Importa instâncias prontas (incluindo auth)

const router = express.Router();
// ❌ REMOVIDO: const db = admin.firestore();

// POST - Verificar token do Firebase
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Token não fornecido' });
    }
    
    // 🟢 Usa 'auth' importado do módulo de configuração
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Buscar ou criar dados do usuário no Firestore
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    let userData;
    if (!userDoc.exists) {
      // Criar novo usuário no Firestore
      userData = {
        uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        photoURL: decodedToken.picture || null,
        role: 'customer', // customer ou admin
        cart: [],
        wishlist: [],
        addresses: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data();
    }
    
    res.json({ 
      success: true, 
      user: {
        uid,
        email: decodedToken.email,
        displayName: userData.displayName,
        role: userData.role,
        cart: userData.cart || [],
        wishlist: userData.wishlist || [],
        addresses: userData.addresses || [],
        photoURL: userData.photoURL || null
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    // Firebase auth errors
    if (error.code && error.code.startsWith('auth/')) {
        return res.status(401).json({ success: false, error: 'Token inválido ou expirado' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Adicionar endereço
router.post('/user/:uid/address', async (req, res) => {
  try {
    const { uid } = req.params;
    const address = req.body;
    
    await db.collection('users').doc(uid).update({
      addresses: admin.firestore.FieldValue.arrayUnion(address),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Endereço adicionado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar endereço:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar wishlist
router.put('/user/:uid/wishlist', async (req, res) => {
  try {
    const { uid } = req.params;
    const { productId, action } = req.body; // action: 'add' ou 'remove'
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (action === 'add') {
      updateData.wishlist = admin.firestore.FieldValue.arrayUnion(productId);
    } else if (action === 'remove') {
      updateData.wishlist = admin.firestore.FieldValue.arrayRemove(productId);
    } else {
      return res.status(400).json({ success: false, error: 'Ação inválida para wishlist' });
    }
    
    await db.collection('users').doc(uid).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Wishlist atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar wishlist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
