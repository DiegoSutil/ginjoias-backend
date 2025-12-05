import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// ❌ REMOVIDO: import admin from 'firebase-admin';

// 🟢 NOVO: A importação desta linha força a inicialização do Firebase Admin SDK.
import admin, { db } from './config/firebase.js'; 

// Importar rotas
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import authRouter from './routes/auth.js';
import paymentsRouter from './routes/payments.js';
import shippingRouter from './routes/shipping.js';
import couponsRouter from './routes/coupons.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ❌ REMOVIDO: O bloco de inicialização do Firebase Admin foi movido para config/firebase.js

// Rotas
app.get('/', (req, res) => {
  res.json({ 
    message: 'API GinJoias - E-commerce Backend',
    version: '1.0.0',
    status: 'online'
  });
});

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/coupons', couponsRouter);

// Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Erro interno do servidor'
  });
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`Acesse a API em: http://localhost:${PORT}` );
});
