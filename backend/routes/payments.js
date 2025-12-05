import express from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
// ❌ ANTES: import admin from 'firebase-admin';
import admin, { db } from '../config/firebase.js'; // 🟢 NOVO: Importa instâncias prontas

const router = express.Router();
// ❌ REMOVIDO: const db = admin.firestore();

// Configurar Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-YOUR-ACCESS-TOKEN'
});

const payment = new Payment(client);
const preference = new Preference(client);

// POST - Criar preferência de pagamento (Checkout Pro)
router.post('/create-preference', async (req, res) => {
  try {
    const { orderId, items, payer, backUrls } = req.body;
    
    const preferenceData = {
      items: items.map(item => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'BRL'
      })),
      payer: {
        name: payer.name,
        email: payer.email,
        phone: {
          area_code: payer.phone?.areaCode || '',
          number: payer.phone?.number || ''
        },
        address: {
          zip_code: payer.address?.zipCode || '',
          street_name: payer.address?.street || '',
          street_number: payer.address?.number || ''
        }
      },
      back_urls: {
        success: backUrls?.success || `${process.env.FRONTEND_URL}/checkout/success`,
        failure: backUrls?.failure || `${process.env.FRONTEND_URL}/checkout/failure`,
        pending: backUrls?.pending || `${process.env.FRONTEND_URL}/checkout/pending`
      },
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      external_reference: orderId, // Usamos o ID do pedido como referência
      auto_return: 'approved'
    };
    
    const result = await preference.create({ body: preferenceData });
    
    res.json({ 
      success: true, 
      preferenceId: result.id,
      initPoint: result.init_point
    });
  } catch (error) {
    console.error('Erro ao criar preferência de pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Webhook do Mercado Pago (para receber atualizações de status)
router.post('/webhook', async (req, res) => {
  try {
    // Mercado Pago envia o ID do recurso e o tópico via query parameters
    const { data, type } = req.body;
    
    console.log('Webhook recebido. Tipo:', type, 'Data:', data);
    
    // Exemplo para processar o webhook de pagamento (type='payment')
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Busca a informação completa do pagamento
      const paymentInfo = await payment.get({ id: paymentId });
      
      // O external_reference contém o ID do nosso pedido
      const orderId = paymentInfo.external_reference;
      
      // Atualizar status do pedido
      const updateData = {
        paymentStatus: paymentInfo.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Se pagamento aprovado, atualizar status do pedido
      if (paymentInfo.status === 'approved') {
        updateData.status = 'processing';
      } else if (paymentInfo.status === 'rejected') {
        // Se rejeitado, o pedido deve ser cancelado (opcional: depende da regra de negócio)
        updateData.status = 'cancelled';
      }
      
      // Atualiza o pedido no Firestore
      await db.collection('orders').doc(orderId).update(updateData);
      
      console.log(`Pedido ${orderId} atualizado - Status: ${paymentInfo.status}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// GET - Consultar status de pagamento
router.get('/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const paymentInfo = await payment.get({ id: paymentId });
    
    res.json({ 
      success: true, 
      status: paymentInfo.status,
      statusDetail: paymentInfo.status_detail,
      paymentInfo
    });
  } catch (error) {
    console.error('Erro ao consultar status do pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
