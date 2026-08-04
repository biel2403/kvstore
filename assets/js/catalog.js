/*
  CATALOGO DA LOJA
  - Edite este arquivo para alterar produtos, precos, imagens e categorias.
  - Categorias atuais: Feminina e Calcados.
  - As paginas index.html, produto.html e categoria.html usam esta mesma lista.
*/

window.STORE_PRODUCTS = [
  {
    id: 1,
    slug: "vestido-midi-linho",
    name: "Vestido Midi Linho",
    category: "Feminina",
    price: 219.9,
    description: "Vestido midi em linho misto, ideal para uma producao elegante e fresca.",
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    sale: false
  },
  {
    id: 2,
    slug: "blazer-alfaiataria",
    name: "Blazer Alfaiataria",
    category: "Feminina",
    price: 299.9,
    oldPrice: 349.9,
    description: "Blazer de alfaiataria com corte preciso para producoes profissionais ou noturnas.",
    image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=900&q=80",
    sale: true
  },
  {
    id: 3,
    slug: "calca-wide-leg",
    name: "Calca Wide Leg",
    category: "Feminina",
    price: 179.9,
    description: "Calca ampla com cintura confortavel e caimento fluido.",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    sale: false
  },
  {
    id: 4,
    slug: "camisa-satinada",
    name: "Camisa Satinada",
    category: "Feminina",
    price: 149.9,
    oldPrice: 189.9,
    description: "Camisa com toque acetinado, acabamento delicado e caimento sofisticado.",
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80",
    sale: true
  },
  {
    id: 5,
    slug: "scarpin-classic",
    name: "Scarpin Classic",
    category: "Calcados",
    price: 199.9,
    description: "Scarpin elegante com bico fino e salto medio para producoes refinadas.",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80",
    sale: false
  },
  {
    id: 6,
    slug: "sandalia-tiras",
    name: "Sandalia de Tiras",
    category: "Calcados",
    price: 159.9,
    oldPrice: 199.9,
    description: "Sandalia delicada com tiras finas, perfeita para eventos e looks leves.",
    image: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=900&q=80",
    sale: true
  },
  {
    id: 7,
    slug: "tenis-casual",
    name: "Tenis Casual",
    category: "Calcados",
    price: 189.9,
    description: "Tenis confortavel para o dia a dia com visual limpo e versatil.",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80",
    sale: false
  },
  {
    id: 8,
    slug: "bota-cano-curto",
    name: "Bota Cano Curto",
    category: "Calcados",
    price: 259.9,
    oldPrice: 319.9,
    description: "Bota de cano curto com acabamento elegante para composicoes de meia-estacao.",
    image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=900&q=80",
    sale: true
  }
];

window.ADMIN_PRODUCTS_KEY = "kvAdminProducts";

window.getAdminProducts = function getAdminProducts() {
  try {
    return JSON.parse(localStorage.getItem(window.ADMIN_PRODUCTS_KEY)) || [];
  } catch (error) {
    return [];
  }
};

window.saveAdminProducts = function saveAdminProducts(products) {
  localStorage.setItem(window.ADMIN_PRODUCTS_KEY, JSON.stringify(products));
};

window.getStoreProducts = function getStoreProducts() {
  return [...window.STORE_PRODUCTS, ...window.getAdminProducts()];
};

window.loadStoreProducts = async function loadStoreProducts() {
  if (!window.kvHasBackend || !window.kvHasBackend()) return window.getStoreProducts();

  try {
    const response = await fetch(window.kvApiUrl("/api/products"));
    if (!response.ok) throw new Error("Falha ao buscar produtos.");
    const products = await response.json();
    window.STORE_PRODUCTS = products;
    return products;
  } catch (error) {
    return window.getStoreProducts();
  }
};
