import express from 'express';
import admin from 'firebase-admin';
import { db } from '../server.js';

const router = express.Router();


// POST - Verificar token do Firebase
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Token não fornecido' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
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
        photoURL: userData.photoURL
      }
    });
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    res.status(401).json({ success: false, error: 'Token inválido' });
  }
});

// GET - Buscar dados do usuário
router.get('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    const userData = userDoc.data();
    delete userData.cart; // Não enviar carrinho completo
    
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Atualizar perfil do usuário
router.put('/user/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName, photoURL, phone, addresses } = req.body;
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (phone) updateData.phone = phone;
    if (addresses) updateData.addresses = addresses;
    
    await db.collection('users').doc(uid).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
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
    }
    
    await db.collection('users').doc(uid).update(updateData);
    
    res.json({ 
      success: true, 
      message: 'Lista de desejos atualizada'
    });
  } catch (error) {
    console.error('Erro ao atualizar wishlist:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
