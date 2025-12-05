import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Produtos de exemplo para joalheria
const produtosExemplo = [
  {
    name: "Corrente Grumet Italiana 925",
    description: "Corrente em prata italiana 925 com elo grumet. Acabamento polido e design clássico. Perfeita para uso diário.",
    price: 189.90,
    category: "correntes",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=500&fit=crop",
    stock: 15,
    rating: 4.5,
    reviews: []
  },
  {
    name: "Pulseira Veneziana Prata 925",
    description: "Pulseira veneziana em prata 925 com fecho de segurança. Design delicado e elegante.",
    price: 149.90,
    category: "pulseiras",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=500&fit=crop",
    stock: 20,
    rating: 4.8,
    reviews: []
  },
  {
    name: "Conjunto Coração Zircônia",
    description: "Conjunto completo com colar e brincos em prata 925 com zircônias. Design romântico.",
    price: 299.90,
    category: "conjuntos",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=500&fit=crop",
    stock: 10,
    rating: 5.0,
    reviews: []
  },
  {
    name: "Anel Solitário Zircônia",
    description: "Anel solitário em prata 925 com zircônia de 6mm. Perfeito para ocasiões especiais.",
    price: 179.90,
    category: "aneis",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=500&fit=crop",
    stock: 25,
    rating: 4.7,
    reviews: []
  },
  {
    name: "Brinco Argola Trabalhada",
    description: "Brinco argola em prata 925 com detalhes trabalhados. Design moderno e versátil.",
    price: 129.90,
    category: "brincos",
    image: "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=400&h=500&fit=crop",
    stock: 30,
    rating: 4.6,
    reviews: []
  },
  {
    name: "Pingente Infinito Prata 925",
    description: "Pingente em formato de infinito em prata 925. Simboliza amor eterno.",
    price: 89.90,
    category: "pingentes",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=500&fit=crop",
    stock: 40,
    rating: 4.9,
    reviews: []
  },
  {
    name: "Corrente Cartier Masculina",
    description: "Corrente cartier grossa em prata 925. Design robusto e masculino.",
    price: 249.90,
    category: "correntes",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=500&fit=crop",
    stock: 12,
    rating: 4.8,
    reviews: []
  },
  {
    name: "Pulseira Riviera Zircônias",
    description: "Pulseira riviera com zircônias cravadas em prata 925. Luxo e sofisticação.",
    price: 349.90,
    category: "pulseiras",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=500&fit=crop",
    stock: 8,
    rating: 5.0,
    reviews: []
  },
  {
    name: "Anel Aparador Cravejado",
    description: "Anel aparador com micro zircônias em prata 925. Complemento perfeito.",
    price: 139.90,
    category: "aneis",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=500&fit=crop",
    stock: 18,
    rating: 4.5,
    reviews: []
  },
  {
    name: "Brinco Ponto de Luz 6mm",
    description: "Brinco ponto de luz com zircônia de 6mm em prata 925. Clássico e elegante.",
    price: 99.90,
    category: "brincos",
    image: "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?w=400&h=500&fit=crop",
    stock: 35,
    rating: 4.9,
    reviews: []
  },
  {
    name: "Conjunto Gota Esmeralda",
    description: "Conjunto com colar e brincos em formato de gota com zircônia verde esmeralda.",
    price: 399.90,
    category: "conjuntos",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=500&fit=crop",
    stock: 6,
    rating: 5.0,
    reviews: []
  },
  {
    name: "Pingente Cruz Cravejada",
    description: "Pingente cruz com zircônias cravadas em prata 925. Símbolo de fé.",
    price: 119.90,
    category: "pingentes",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=500&fit=crop",
    stock: 22,
    rating: 4.7,
    reviews: []
  }
];

// Cupons de exemplo
const cuponsExemplo = [
  {
    code: "BEMVINDO10",
    description: "10% de desconto para novos clientes",
    discountType: "percentage",
    discountValue: 10,
    minPurchase: 100,
    maxDiscount: 50,
    usageLimit: 100,
    usageCount: 0,
    active: true,
    expiresAt: null
  },
  {
    code: "FRETEGRATIS",
    description: "Frete grátis para compras acima de R$ 200",
    discountType: "fixed",
    discountValue: 0,
    minPurchase: 200,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    active: true,
    expiresAt: null
  },
  {
    code: "BLACK40",
    description: "40% OFF - Black Friday",
    discountType: "percentage",
    discountValue: 40,
    minPurchase: 150,
    maxDiscount: 200,
    usageLimit: 50,
    usageCount: 0,
    active: true,
    expiresAt: null
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');
    
    // Inicializar Firebase Admin
    const serviceAccount = {
      type: "service_account",
      project_id: "sansei-d3cf6",
      // Adicione suas credenciais aqui ou use variáveis de ambiente
    };
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    
    const db = admin.firestore();
    
    // Popular produtos
    console.log('📦 Adicionando produtos...');
    for (const produto of produtosExemplo) {
      await db.collection('products').add({
        ...produto,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Produto adicionado: ${produto.name}`);
    }
    
    // Popular cupons
    console.log('🎟️  Adicionando cupons...');
    for (const cupom of cuponsExemplo) {
      await db.collection('coupons').add({
        ...cupom,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Cupom adicionado: ${cupom.code}`);
    }
    
    console.log('✨ Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
    process.exit(1);
  }
}

// Executar seed
seedDatabase();
