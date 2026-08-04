/*
  COMO PERSONALIZAR A LOJA
  - Nome da loja: altere no index.html.
  - Produtos: edite assets/js/catalog.js.
  - Precos: use numeros, exemplo 129.90.
  - Imagens: troque a propriedade image por URLs das fotos reais.
  - Categorias usadas nos filtros: Feminina e Calcados.
*/

let products = window.getStoreProducts ? window.getStoreProducts() : window.STORE_PRODUCTS || [];
const productGrid = document.querySelector("#productGrid");
const saleGrid = document.querySelector("#saleGrid");
const categoryFilter = document.querySelector("#categoryFilter");
const priceFilter = document.querySelector("#priceFilter");
const searchButton = document.querySelector("#searchButton");
const searchPanel = document.querySelector("#searchPanel");
const searchInput = document.querySelector("#searchInput");
const openCart = document.querySelector("#openCart");
const closeCart = document.querySelector("#closeCart");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");
const menuToggle = document.querySelector(".menu-toggle");
const newsletterForm = document.querySelector("#newsletterForm");
const newsletterMessage = document.querySelector("#newsletterMessage");
const backToTop = document.querySelector("#backToTop");

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let cart = JSON.parse(localStorage.getItem("fashionCart")) || [];

function saveCart() {
  localStorage.setItem("fashionCart", JSON.stringify(cart));
}

function categoryLabel(category) {
  return category === "Calcados" ? "Cal\u00e7ados" : category;
}

function productTemplate(product) {
  return `
    <article class="product-card fade-in">
      ${product.sale ? '<span class="sale-badge">SALE</span>' : ""}
      <a href="pages/produto.html?id=${product.id}" aria-label="Abrir produto ${product.name}">
        <img class="product-image" src="${product.image}" alt="${product.name}">
      </a>
      <div class="product-info">
        <a href="pages/produto.html?id=${product.id}">
          <h3>${product.name}</h3>
          <span class="product-category">${categoryLabel(product.category)}</span>
        </a>
        <div class="product-meta">
          <span>
            <strong class="price">${money.format(product.price)}</strong>
            ${product.oldPrice ? `<span class="old-price">${money.format(product.oldPrice)}</span>` : ""}
          </span>
        </div>
        <button class="add-btn" type="button" data-add="${product.id}">Adicionar ao carrinho</button>
      </div>
    </article>
  `;
}

function getFilteredProducts() {
  const selectedCategory = categoryFilter.value;
  const selectedPrice = priceFilter.value;
  const term = searchInput.value.trim().toLowerCase();

  return products.filter(product => {
    const categoryMatches = selectedCategory === "Todos" || product.category === selectedCategory;
    const searchMatches = !term || `${product.name} ${product.category}`.toLowerCase().includes(term);

    let priceMatches = true;
    if (selectedPrice !== "Todos") {
      const [min, max] = selectedPrice.split("-").map(Number);
      priceMatches = product.price >= min && product.price <= max;
    }

    return categoryMatches && priceMatches && searchMatches;
  });
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();
  productGrid.innerHTML = filteredProducts.length
    ? filteredProducts.map(productTemplate).join("")
    : '<p class="empty-state">Nenhum produto encontrado com esses filtros.</p>';
}

function renderSaleProducts() {
  saleGrid.innerHTML = products
    .filter(product => product.sale)
    .map(productTemplate)
    .join("");
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  renderCart();
  openCartSidebar();
}

function changeQuantity(productId, direction) {
  const item = cart.find(product => product.id === Number(productId));
  if (!item) return;

  item.quantity += direction;
  if (item.quantity <= 0) {
    cart = cart.filter(product => product.id !== Number(productId));
  }

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(product => product.id !== Number(productId));
  saveCart();
  renderCart();
}

function renderCart() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = money.format(total);

  cartItems.innerHTML = cart.length
    ? cart.map(item => `
      <article class="cart-item">
        <img src="${item.image}" alt="${item.name}">
        <div>
          <h3>${item.name}</h3>
          <span>${money.format(item.price)}</span>
          <div class="cart-controls">
            <div class="qty-controls" aria-label="Quantidade">
              <button type="button" data-decrease="${item.id}">-</button>
              <strong>${item.quantity}</strong>
              <button type="button" data-increase="${item.id}">+</button>
            </div>
            <button class="remove-btn" type="button" data-remove="${item.id}">Remover</button>
          </div>
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Seu carrinho est&aacute; vazio.</p>';
}

function openCartSidebar() {
  document.body.classList.add("cart-open");
  document.querySelector("#cartSidebar").setAttribute("aria-hidden", "false");
}

function closeCartSidebar() {
  document.body.classList.remove("cart-open");
  document.querySelector("#cartSidebar").setAttribute("aria-hidden", "true");
}

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  const increaseButton = event.target.closest("[data-increase]");
  const decreaseButton = event.target.closest("[data-decrease]");
  const removeButton = event.target.closest("[data-remove]");

  if (addButton) addToCart(addButton.dataset.add);
  if (increaseButton) changeQuantity(increaseButton.dataset.increase, 1);
  if (decreaseButton) changeQuantity(decreaseButton.dataset.decrease, -1);
  if (removeButton) removeFromCart(removeButton.dataset.remove);
});

categoryFilter.addEventListener("change", renderProducts);
priceFilter.addEventListener("change", renderProducts);
searchInput.addEventListener("input", renderProducts);

searchButton.addEventListener("click", () => {
  searchPanel.classList.toggle("active");
  if (searchPanel.classList.contains("active")) searchInput.focus();
});

openCart.addEventListener("click", openCartSidebar);
closeCart.addEventListener("click", closeCartSidebar);
overlay.addEventListener("click", closeCartSidebar);

menuToggle.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", closeMobileMenu);
});

newsletterForm.addEventListener("submit", event => {
  event.preventDefault();
  newsletterMessage.textContent = "Cadastro realizado com sucesso!";
  newsletterForm.reset();
});

window.addEventListener("scroll", () => {
  backToTop.classList.toggle("visible", window.scrollY > 500);
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

async function bootStorefront() {
  products = window.loadStoreProducts ? await window.loadStoreProducts() : products;
  renderProducts();
  renderSaleProducts();
  renderCart();
}

bootStorefront();
