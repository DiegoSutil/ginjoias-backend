import express from 'express';
import axios from 'axios';

const router = express.Router();

// POST - Calcular frete pelos Correios
router.post('/calculate', async (req, res) => {
  try {
    const { cepDestino, peso = 0.3, comprimento = 20, altura = 10, largura = 15 } = req.body;
    
    if (!cepDestino) {
      return res.status(400).json({ success: false, error: 'CEP de destino é obrigatório' });
    }
    
    // CEP de origem (exemplo - alterar para o CEP da sua loja)
    const cepOrigem = '01310100'; // Av. Paulista, SP
    
    // Simular cálculo de frete (em produção, usar API dos Correios ou Melhor Envio)
    const opcoesFrete = [
      {
        id: 'pac',
        name: 'PAC',
        price: 15.90,
        deliveryTime: 10,
        description: 'Entrega econômica em até 10 dias úteis'
      },
      {
        id: 'sedex',
        name: 'SEDEX',
        price: 25.90,
        deliveryTime: 5,
        description: 'Entrega rápida em até 5 dias úteis'
      },
      {
        id: 'express',
        name: 'Expresso',
        price: 35.90,
        deliveryTime: 2,
        description: 'Entrega expressa em até 2 dias úteis'
      }
    ];
    
    // Frete grátis para compras acima de R$ 200
    const { subtotal } = req.body;
    if (subtotal && parseFloat(subtotal) >= 200) {
      opcoesFrete.push({
        id: 'free',
        name: 'Frete Grátis',
        price: 0,
        deliveryTime: 10,
        description: 'Frete grátis para compras acima de R$ 200'
      });
    }
    
    res.json({ 
      success: true, 
      shippingOptions: opcoesFrete,
      cepOrigem,
      cepDestino
    });
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Buscar endereço por CEP
router.get('/cep/:cep', async (req, res) => {
  try {
    const { cep } = req.params;
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      return res.status(400).json({ success: false, error: 'CEP inválido' });
    }
    
    // Usar API ViaCEP
    const response = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    
    if (response.data.erro) {
      return res.status(404).json({ success: false, error: 'CEP não encontrado' });
    }
    
    res.json({ 
      success: true, 
      address: {
        cep: response.data.cep,
        street: response.data.logradouro,
        neighborhood: response.data.bairro,
        city: response.data.localidade,
        state: response.data.uf,
        complement: response.data.complemento
      }
    });
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar CEP' });
  }
});

// POST - Calcular frete com Melhor Envio (alternativa)
router.post('/melhor-envio', async (req, res) => {
  try {
    const { cepDestino, produtos } = req.body;
    
    // Configuração do Melhor Envio
    const melhorEnvioToken = process.env.MELHOR_ENVIO_TOKEN;
    
    if (!melhorEnvioToken) {
      return res.status(500).json({ 
        success: false, 
        error: 'Token do Melhor Envio não configurado' 
      });
    }
    
    // Calcular dimensões e peso total
    let pesoTotal = 0;
    produtos.forEach(p => {
      pesoTotal += (p.peso || 0.3) * p.quantity;
    });
    
    const requestData = {
      from: {
        postal_code: "01310100"
      },
      to: {
        postal_code: cepDestino
      },
      package: {
        height: 10,
        width: 15,
        length: 20,
        weight: pesoTotal
      },
      options: {
        insurance_value: req.body.subtotal || 100,
        receipt: false,
        own_hand: false
      },
      services: "1,2,3" // PAC, SEDEX, etc
    };
    
    const response = await axios.post(
      'https://melhorenvio.com.br/api/v2/me/shipment/calculate',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${melhorEnvioToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    res.json({ 
      success: true, 
      shippingOptions: response.data 
    });
  } catch (error) {
    console.error('Erro ao calcular frete Melhor Envio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
