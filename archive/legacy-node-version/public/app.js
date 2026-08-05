const productGrid = document.querySelector("#productGrid");
const categoryFilter = document.querySelector("#categoryFilter");
const searchInput = document.querySelector("#searchInput");
const cartItems = document.querySelector("#cartItems");
const cartCount = document.querySelector("#cartCount");
const subtotalEl = document.querySelector("#subtotal");
const shippingEl = document.querySelector("#shipping");
const totalEl = document.querySelector("#total");
const checkoutForm = document.querySelector("#checkoutForm");
const checkoutMessage = document.querySelector("#checkoutMessage");

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let products = [];
let cart = JSON.parse(localStorage.getItem("atelier-cart") || "[]");

function saveCart() {
  localStorage.setItem("atelier-cart", JSON.stringify(cart));
}

function getStock(product, color, size) {
  return Number(product.stock[`${color}|${size}`] || 0);
}

function cartTotal() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 && subtotal < 299 ? 19.9 : 0;
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCategories() {
  const categories = [...new Set(products.map(product => product.category))].sort();
  categoryFilter.innerHTML = `<option value="">Todas</option>${categories.map(category => `<option>${category}</option>`).join("")}`;
}

function renderProducts() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = products.filter(product => {
    const matchesCategory = !category || product.category === category;
    const matchesSearch = !search || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  productGrid.innerHTML = filtered.map(product => {
    const firstColor = product.colors[0] || "";
    const firstSize = product.sizes[0] || "";
    return `
      <article class="product-card">
        <img class="product-image" src="${product.image}" alt="${product.name}">
        <div class="product-body">
          <div class="product-title-row">
            <div>
              <h3>${product.name}</h3>
              <span class="muted">${product.category}</span>
            </div>
            <span class="price">${currency.format(product.price)}</span>
          </div>
          <p class="muted">${product.description}</p>
          <div class="options">
            <select data-color="${product.id}" aria-label="Cor de ${product.name}">
              ${product.colors.map(color => `<option>${color}</option>`).join("")}
            </select>
            <select data-size="${product.id}" aria-label="Tamanho de ${product.name}">
              ${product.sizes.map(size => `<option>${size}</option>`).join("")}
            </select>
          </div>
          <button class="small-button" type="button" data-add="${product.id}" ${getStock(product, firstColor, firstSize) ? "" : "disabled"}>
            Adicionar
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderCart() {
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (!cart.length) {
    cartItems.innerHTML = `<p class="muted">Seu carrinho esta vazio.</p>`;
  } else {
    cartItems.innerHTML = cart.map((item, index) => `
      <div class="cart-line">
        <div>
          <strong>${item.name}</strong>
          <div class="muted">${item.color} / ${item.size} - ${currency.format(item.price)}</div>
        </div>
        <div class="cart-actions">
          <button class="quantity-button" type="button" data-dec="${index}">-</button>
          <strong>${item.quantity}</strong>
          <button class="quantity-button" type="button" data-inc="${index}">+</button>
        </div>
      </div>
    `).join("");
  }

  const totals = cartTotal();
  subtotalEl.textContent = currency.format(totals.subtotal);
  shippingEl.textContent = totals.subtotal === 0 ? currency.format(0) : totals.shipping ? currency.format(totals.shipping) : "Gratis";
  totalEl.textContent = currency.format(totals.total);
  saveCart();
}

function addToCart(productId) {
  const product = products.find(entry => entry.id === productId);
  const color = document.querySelector(`[data-color="${productId}"]`).value;
  const size = document.querySelector(`[data-size="${productId}"]`).value;
  const stock = getStock(product, color, size);
  const existing = cart.find(item => item.productId === productId && item.color === color && item.size === size);
  const quantityInCart = existing ? existing.quantity : 0;

  if (quantityInCart >= stock) {
    checkoutMessage.textContent = "Nao temos mais estoque dessa variacao.";
    return;
  }

  if (existing) existing.quantity += 1;
  else cart.push({ productId, name: product.name, color, size, price: product.price, quantity: 1 });
  checkoutMessage.textContent = "";
  renderCart();
}

productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (button) addToCart(button.dataset.add);
});

cartItems.addEventListener("click", event => {
  const inc = event.target.closest("[data-inc]");
  const dec = event.target.closest("[data-dec]");
  if (inc) cart[Number(inc.dataset.inc)].quantity += 1;
  if (dec) {
    const index = Number(dec.dataset.dec);
    cart[index].quantity -= 1;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
  }
  renderCart();
});

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  checkoutMessage.textContent = "Enviando pedido...";
  const formData = new FormData(checkoutForm);
  const payload = {
    customer: Object.fromEntries(formData.entries()),
    paymentMethod: formData.get("paymentMethod"),
    deliveryMethod: formData.get("deliveryMethod"),
    items: cart
  };

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    checkoutMessage.textContent = data.error || "Nao foi possivel criar o pedido.";
    return;
  }

  cart = [];
  saveCart();
  renderCart();
  checkoutForm.reset();
  checkoutMessage.textContent = `Pedido ${data.id} criado com sucesso.`;
  await loadProducts();
});

async function loadProducts() {
  const response = await fetch("/api/products");
  products = await response.json();
  renderCategories();
  renderProducts();
  renderCart();
}

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
loadProducts();
