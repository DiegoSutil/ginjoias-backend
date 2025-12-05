import express from 'express';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import admin from 'firebase-admin';
import { db } from '../server.js';

const router = express.Router();


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
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      statement_descriptor: 'GINJOIAS',
      payment_methods: {
        excluded_payment_types: [],
        installments: 5
      }
    };
    
    const result = await preference.create({ body: preferenceData });
    
    res.json({ 
      success: true, 
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Processar pagamento PIX
router.post('/create-pix', async (req, res) => {
  try {
    const { orderId, amount, payer } = req.body;
    
    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: `Pedido #${orderId} - GinJoias`,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        identification: {
          type: payer.identificationType || 'CPF',
          number: payer.identificationNumber
        }
      },
      external_reference: orderId,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`
    };
    
    const result = await payment.create({ body: paymentData });
    
    // Atualizar pedido com informações do pagamento
    await db.collection('orders').doc(orderId).update({
      paymentId: result.id,
      paymentStatus: result.status,
      paymentMethod: 'pix',
      pixQrCode: result.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      paymentId: result.id,
      status: result.status,
      qrCode: result.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Processar pagamento com cartão
router.post('/create-card-payment', async (req, res) => {
  try {
    const { orderId, amount, token, installments, payer } = req.body;
    
    const paymentData = {
      transaction_amount: parseFloat(amount),
      token: token,
      description: `Pedido #${orderId} - GinJoias`,
      installments: parseInt(installments),
      payment_method_id: 'visa', // Será determinado pelo token
      payer: {
        email: payer.email,
        identification: {
          type: payer.identificationType || 'CPF',
          number: payer.identificationNumber
        }
      },
      external_reference: orderId,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`
    };
    
    const result = await payment.create({ body: paymentData });
    
    // Atualizar pedido
    await db.collection('orders').doc(orderId).update({
      paymentId: result.id,
      paymentStatus: result.status,
      paymentMethod: 'credit_card',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      paymentId: result.id,
      status: result.status,
      statusDetail: result.status_detail
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Webhook do Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Webhook recebido:', type, data);
    
    if (type === 'payment') {
      const paymentId = data.id;
      const paymentInfo = await payment.get({ id: paymentId });
      
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
        updateData.status = 'cancelled';
      }
      
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
    console.error('Erro ao consultar pagamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
