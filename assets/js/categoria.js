let products = window.getStoreProducts ? window.getStoreProducts() : window.STORE_PRODUCTS || [];
const categoryTitle = document.querySelector("#categoryTitle");
const categorySubtitle = document.querySelector("#categorySubtitle");
const categoryCount = document.querySelector("#categoryCount");
const categoryGrid = document.querySelector("#categoryGrid");
const priceFilter = document.querySelector("#priceFilter");
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

const params = new URLSearchParams(window.location.search);
const selectedCategory = params.get("category") || "Feminina";
let cart = JSON.parse(localStorage.getItem("fashionCart")) || [];

function saveCart() {
  localStorage.setItem("fashionCart", JSON.stringify(cart));
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

function filteredProducts() {
  return products.filter(product => {
    const sameCategory = product.category === selectedCategory;
    const priceValue = priceFilter.value;
    if (priceValue === "Todos") return sameCategory;
    const [min, max] = priceValue.split("-").map(Number);
    return sameCategory && product.price >= min && product.price <= max;
  });
}

function renderCategory() {
  const list = filteredProducts();
  categoryTitle.textContent = categoryLabel(selectedCategory);
  categorySubtitle.textContent = `Produtos selecionados para ${categoryLabel(selectedCategory)}.`;
  categoryCount.textContent = `${list.length} produto${list.length === 1 ? "" : "s"}`;
  document.title = `${categoryLabel(selectedCategory)} | Vasconcelos`;
  categoryGrid.innerHTML = list.length
    ? list.map(productCard).join("")
    : '<p class="empty-state">Nenhum produto encontrado nesta categoria.</p>';
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

priceFilter.addEventListener("change", renderCategory);
openCart.addEventListener("click", openCartSidebar);
closeCart.addEventListener("click", closeCartSidebar);
overlay.addEventListener("click", closeCartSidebar);

async function bootCategoryPage() {
  products = window.loadStoreProducts ? await window.loadStoreProducts() : products;
  renderCategory();
  renderCart();
}

bootCategoryPage();
