/**
 * Script de Teste da API
 * Testa todos os endpoints principais
 */

const API_BASE = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Iniciando testes da API...\n');
  
  let testsPass = 0;
  let testsFail = 0;
  
  // Teste 1: Health Check
  try {
    console.log('1️⃣  Testando health check...');
    const response = await fetch('http://localhost:3000');
    const data = await response.json();
    if (data.status === 'online') {
      console.log('   ✅ API online\n');
      testsPass++;
    } else {
      throw new Error('API não está online');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 2: Listar Produtos
  try {
    console.log('2️⃣  Testando listagem de produtos...');
    const response = await fetch(`${API_BASE}/products`);
    const data = await response.json();
    if (data.success && data.products.length > 0) {
      console.log(`   ✅ ${data.count} produtos encontrados\n`);
      testsPass++;
    } else {
      throw new Error('Nenhum produto encontrado');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 3: Buscar Produto por ID
  try {
    console.log('3️⃣  Testando busca de produto...');
    const listResponse = await fetch(`${API_BASE}/products`);
    const listData = await listResponse.json();
    
    if (listData.products.length > 0) {
      const productId = listData.products[0].id;
      const response = await fetch(`${API_BASE}/products/${productId}`);
      const data = await response.json();
      
      if (data.success && data.product) {
        console.log(`   ✅ Produto "${data.product.name}" encontrado\n`);
        testsPass++;
      } else {
        throw new Error('Produto não encontrado');
      }
    } else {
      throw new Error('Sem produtos para testar');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 4: Validar Cupom
  try {
    console.log('4️⃣  Testando validação de cupom...');
    const response = await fetch(`${API_BASE}/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'BEMVINDO10', subtotal: 150 })
    });
    const data = await response.json();
    
    if (data.success && data.discountAmount > 0) {
      console.log(`   ✅ Cupom válido - Desconto: R$ ${data.discountAmount.toFixed(2)}\n`);
      testsPass++;
    } else {
      throw new Error('Cupom inválido');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 5: Calcular Frete
  try {
    console.log('5️⃣  Testando cálculo de frete...');
    const response = await fetch(`${API_BASE}/shipping/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cepDestino: '01310100', subtotal: 100 })
    });
    const data = await response.json();
    
    if (data.success && data.shippingOptions.length > 0) {
      console.log(`   ✅ ${data.shippingOptions.length} opções de frete disponíveis\n`);
      testsPass++;
    } else {
      throw new Error('Nenhuma opção de frete');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 6: Buscar CEP
  try {
    console.log('6️⃣  Testando busca de CEP...');
    const response = await fetch(`${API_BASE}/shipping/cep/01310100`);
    const data = await response.json();
    
    if (data.success && data.address) {
      console.log(`   ✅ CEP encontrado: ${data.address.city}, ${data.address.state}\n`);
      testsPass++;
    } else {
      throw new Error('CEP não encontrado');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 7: Listar Cupons
  try {
    console.log('7️⃣  Testando listagem de cupons...');
    const response = await fetch(`${API_BASE}/coupons?active=true`);
    const data = await response.json();
    
    if (data.success && data.coupons.length > 0) {
      console.log(`   ✅ ${data.count} cupons ativos encontrados\n`);
      testsPass++;
    } else {
      throw new Error('Nenhum cupom encontrado');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Teste 8: Filtrar Produtos por Categoria
  try {
    console.log('8️⃣  Testando filtro de produtos por categoria...');
    const response = await fetch(`${API_BASE}/products?category=correntes`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`   ✅ ${data.count} produtos na categoria "correntes"\n`);
      testsPass++;
    } else {
      throw new Error('Erro ao filtrar produtos');
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message, '\n');
    testsFail++;
  }
  
  // Resumo
  console.log('━'.repeat(50));
  console.log(`\n📊 Resumo dos Testes:`);
  console.log(`   ✅ Passou: ${testsPass}`);
  console.log(`   ❌ Falhou: ${testsFail}`);
  console.log(`   📈 Total: ${testsPass + testsFail}`);
  
  if (testsFail === 0) {
    console.log('\n🎉 Todos os testes passaram!\n');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique os erros acima.\n');
  }
}

// Executar testes
testAPI().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
