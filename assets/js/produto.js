let products = window.getStoreProducts ? window.getStoreProducts() : window.STORE_PRODUCTS || [];
const productDetail = document.querySelector("#productDetail");
const relatedProducts = document.querySelector("#relatedProducts");
const openCart = document.querySelector("#openCart");
const closeCart = document.querySelector("#closeCart");
const overlay = document.querySelector("#overlay");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const cartTotal = document.querySelector("#cartTotal");

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let cart = JSON.parse(localStorage.getItem("fashionCart")) || [];

function saveCart() {
  localStorage.setItem("fashionCart", JSON.stringify(cart));
}

function findProductFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id"));
  const slug = params.get("slug");
  return products.find(product => product.id === id || product.slug === slug);
}

function categoryLabel(category) {
  return category === "Calcados" ? "Cal\u00e7ados" : category;
}

function productCard(product) {
  return `
    <article class="product-card fade-in">
      ${product.sale ? '<span class="sale-badge">SALE</span>' : ""}
      <a href="produto.html?id=${product.id}" aria-label="Abrir produto ${product.name}">
        <img class="product-image" src="${product.image}" alt="${product.name}">
      </a>
      <div class="product-info">
        <a href="produto.html?id=${product.id}">
          <h3>${product.name}</h3>
          <span class="product-category">${categoryLabel(product.category)}</span>
        </a>
        <strong class="price">${money.format(product.price)}</strong>
        <button class="add-btn" type="button" data-add="${product.id}">Adicionar ao carrinho</button>
      </div>
    </article>
  `;
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  const existingItem = cart.find(item => item.id === product.id);

  if (existingItem) existingItem.quantity += 1;
  else cart.push({ ...product, quantity: 1 });

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
            <div class="qty-controls">
              <button type="button" data-decrease="${item.id}">-</button>
              <strong>${item.quantity}</strong>
              <button type="button" data-increase="${item.id}">+</button>
            </div>
            <button class="remove-btn" type="button" data-remove="${item.id}">Remover</button>
          </div>
        </div>
      </article>
    `).join("")
    : '<p class="empty-state">Seu carrinho esta vazio.</p>';
}

function openCartSidebar() {
  document.body.classList.add("cart-open");
  document.querySelector("#cartSidebar").setAttribute("aria-hidden", "false");
}

function closeCartSidebar() {
  document.body.classList.remove("cart-open");
  document.querySelector("#cartSidebar").setAttribute("aria-hidden", "true");
}

function renderProductPage() {
  const product = findProductFromUrl();

  if (!product) {
    productDetail.innerHTML = `
      <div class="detail-copy">
        <p class="eyebrow">Produto</p>
        <h1>Produto nao encontrado</h1>
        <p>Volte para a vitrine e escolha outro item.</p>
        <a class="btn btn-primary" href="../index.html#produtos">Ver produtos</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} | Vasconcelos`;
  productDetail.innerHTML = `
    <img class="detail-image" src="${product.image}" alt="${product.name}">
    <div class="detail-copy">
      <a class="breadcrumb" href="categoria.html?category=${encodeURIComponent(product.category)}">${categoryLabel(product.category)}</a>
      <h1>${product.name}</h1>
      <p>${product.description}</p>
      <div class="detail-price">
        <strong>${money.format(product.price)}</strong>
        ${product.oldPrice ? `<span>${money.format(product.oldPrice)}</span>` : ""}
      </div>
      <div class="product-options-detail">
        ${product.stock !== undefined ? `<p><strong>Estoque:</strong> ${product.stock}</p>` : ""}
        ${(product.sizes || []).length ? `<p><strong>Tamanhos:</strong> ${product.sizes.join(", ")}</p>` : ""}
        ${(product.colors || []).length ? `<p><strong>Cores:</strong> ${product.colors.join(", ")}</p>` : ""}
      </div>
      ${product.sale ? '<span class="sale-pill">SALE</span>' : ""}
      <button class="btn btn-primary" type="button" data-add="${product.id}">Adicionar ao carrinho</button>
    </div>
  `;

  relatedProducts.innerHTML = products
    .filter(item => item.category === product.category && item.id !== product.id)
    .slice(0, 4)
    .map(productCard)
    .join("");
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

openCart.addEventListener("click", openCartSidebar);
closeCart.addEventListener("click", closeCartSidebar);
overlay.addEventListener("click", closeCartSidebar);

async function bootProductPage() {
  products = window.loadStoreProducts ? await window.loadStoreProducts() : products;
  renderProductPage();
  renderCart();
}

bootProductPage();
