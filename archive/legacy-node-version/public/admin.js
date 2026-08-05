const productMetric = document.querySelector("#productMetric");
const orderMetric = document.querySelector("#orderMetric");
const revenueMetric = document.querySelector("#revenueMetric");
const productForm = document.querySelector("#productForm");
const adminProducts = document.querySelector("#adminProducts");
const adminOrders = document.querySelector("#adminOrders");
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let products = [];
let orders = [];

function stockFrom(colors, sizes) {
  const stock = {};
  for (const color of colors) {
    for (const size of sizes) {
      stock[`${color}|${size}`] = 5;
    }
  }
  return stock;
}

function renderMetrics() {
  productMetric.textContent = products.length;
  orderMetric.textContent = orders.length;
  revenueMetric.textContent = currency.format(orders.reduce((sum, order) => sum + order.total, 0));
}

function renderProducts() {
  adminProducts.innerHTML = products.map(product => `
    <article class="admin-item">
      <div>
        <h3>${product.name}</h3>
        <p class="muted">${product.category} - ${currency.format(product.price)}</p>
        <p class="muted">${product.colors.join(", ")} / ${product.sizes.join(", ")}</p>
      </div>
      <button class="small-button" type="button" data-delete="${product.id}">Remover</button>
    </article>
  `).join("") || `<p class="muted">Nenhum produto cadastrado.</p>`;
}

function renderOrders() {
  adminOrders.innerHTML = orders.map(order => `
    <article class="admin-item">
      <div>
        <h3>${order.id} - ${currency.format(order.total)}</h3>
        <p class="muted">${order.customer.name} - ${order.customer.phone}</p>
        <p>${order.items.map(item => `${item.quantity}x ${item.name} (${item.color}/${item.size})`).join(", ")}</p>
      </div>
      <select class="status-select" data-status="${order.id}">
        ${["Novo pedido", "Pago", "Separando", "Enviado", "Entregue", "Cancelado"].map(status => `
          <option ${order.status === status ? "selected" : ""}>${status}</option>
        `).join("")}
      </select>
    </article>
  `).join("") || `<p class="muted">Nenhum pedido recebido.</p>`;
}

async function loadAdmin() {
  const [productResponse, orderResponse] = await Promise.all([
    fetch("/api/products"),
    fetch("/api/orders")
  ]);
  products = await productResponse.json();
  orders = await orderResponse.json();
  renderMetrics();
  renderProducts();
  renderOrders();
}

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(productForm);
  const colors = String(formData.get("colors") || "").split(",").map(item => item.trim()).filter(Boolean);
  const sizes = String(formData.get("sizes") || "").split(",").map(item => item.trim()).filter(Boolean);
  const product = {
    name: formData.get("name"),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    image: formData.get("image") || "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80",
    colors,
    sizes,
    description: formData.get("description"),
    stock: stockFrom(colors, sizes),
    featured: false
  };

  await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
  productForm.reset();
  await loadAdmin();
});

adminProducts.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  await fetch(`/api/products/${encodeURIComponent(button.dataset.delete)}`, { method: "DELETE" });
  await loadAdmin();
});

adminOrders.addEventListener("change", async event => {
  const select = event.target.closest("[data-status]");
  if (!select) return;
  await fetch(`/api/orders/${encodeURIComponent(select.dataset.status)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: select.value })
  });
  await loadAdmin();
});

loadAdmin();
