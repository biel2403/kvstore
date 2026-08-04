const form = document.querySelector("#adminProductForm");
const loginPanel = document.querySelector("#loginPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const adminApp = document.querySelector("#adminApp");
const logoutButton = document.querySelector("#logoutButton");
const imageFile = document.querySelector("#adminImageFile");
const imageUrl = document.querySelector("#adminImageUrl");
const imagePreview = document.querySelector("#imagePreview");
const adminMessage = document.querySelector("#adminMessage");
const productsList = document.querySelector("#adminProductsList");
const productCount = document.querySelector("#adminProductCount");
const ordersList = document.querySelector("#adminOrdersList");
const orderCount = document.querySelector("#adminOrderCount");
const clearButton = document.querySelector("#clearAdminProducts");
const toggleDemoProductsButton = document.querySelector("#toggleDemoProducts");
const editingProductId = document.querySelector("#editingProductId");
const productSubmitButton = document.querySelector("#productSubmitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const dashboardRevenue = document.querySelector("#dashboardRevenue");
const dashboardPaidRevenue = document.querySelector("#dashboardPaidRevenue");
const dashboardAverageTicket = document.querySelector("#dashboardAverageTicket");
const dashboardActiveOrders = document.querySelector("#dashboardActiveOrders");
const statusSummary = document.querySelector("#statusSummary");
const adminTabs = document.querySelectorAll("[data-admin-tab]");
const adminPanels = {
  create: document.querySelector("#adminPanelCreate"),
  ads: document.querySelector("#adminPanelAds"),
  orders: document.querySelector("#adminPanelOrders")
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

let selectedImage = "";
let storeSettings = { hideDemoProducts: false };

function getDemoProducts() {
  return window.DEMO_PRODUCTS || [];
}

function getToken() {
  return localStorage.getItem("kvAdminToken") || "";
}

function authHeaders(extra = {}) {
  return hasBackend() ? { ...extra, Authorization: `Bearer ${getToken()}` } : extra;
}

function showAdmin() {
  loginPanel.classList.add("is-hidden");
  adminApp.classList.remove("is-hidden");
}

function showLogin() {
  loginPanel.classList.remove("is-hidden");
  adminApp.classList.add("is-hidden");
}

function hasBackend() {
  return window.kvHasBackend ? window.kvHasBackend() : window.location.protocol.startsWith("http");
}

async function loadAdminProducts() {
  if (!hasBackend()) return window.getAdminProducts();
  const response = await fetch(window.kvApiUrl("/api/admin-products"), { headers: authHeaders() });
  if (!response.ok) throw new Error("Nao foi possivel carregar os anuncios.");
  return response.json();
}

async function createAdminProduct(product) {
  if (!hasBackend()) {
    const products = window.getAdminProducts();
    products.unshift(product);
    window.saveAdminProducts(products);
    return product;
  }

  const response = await fetch(window.kvApiUrl("/api/products"), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(product)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel criar o anuncio.");
  return data;
}

async function updateAdminProduct(id, product) {
  if (!hasBackend()) {
    const products = window.getAdminProducts();
    const index = products.findIndex(item => Number(item.id) === Number(id));
    if (index >= 0) products[index] = { ...product, id: Number(id) };
    window.saveAdminProducts(products);
    return products[index];
  }

  const response = await fetch(window.kvApiUrl(`/api/products/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(product)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel editar o anuncio.");
  return data;
}

async function deleteAdminProduct(id) {
  if (!hasBackend()) {
    const products = window.getAdminProducts().filter(product => product.id !== Number(id));
    window.saveAdminProducts(products);
    return;
  }

  await fetch(window.kvApiUrl(`/api/products/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: authHeaders()
  });
}

async function clearAdminProductList() {
  if (!hasBackend()) {
    window.saveAdminProducts([]);
    return;
  }

  await fetch(window.kvApiUrl("/api/admin-products"), { method: "DELETE", headers: authHeaders() });
}

async function loadStoreSettings() {
  if (!hasBackend()) {
    return {
      hideDemoProducts: localStorage.getItem("kvHideDemoProducts") === "true"
    };
  }

  const response = await fetch(window.kvApiUrl("/api/settings"), { headers: authHeaders() });
  if (!response.ok) throw new Error("Nao foi possivel carregar as configuracoes.");
  return response.json();
}

async function saveStoreSettings(settings) {
  if (!hasBackend()) {
    localStorage.setItem("kvHideDemoProducts", String(Boolean(settings.hideDemoProducts)));
    return settings;
  }

  const response = await fetch(window.kvApiUrl("/api/settings"), {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(settings)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar as configuracoes.");
  return data;
}

async function loadOrders() {
  if (!hasBackend()) {
    return JSON.parse(localStorage.getItem("kvOrders") || "[]");
  }

  const response = await fetch(window.kvApiUrl("/api/orders"), { headers: authHeaders() });
  if (!response.ok) throw new Error("Nao foi possivel carregar os pedidos.");
  return response.json();
}

async function updateOrderStatus(id, status) {
  if (!hasBackend()) {
    const orders = JSON.parse(localStorage.getItem("kvOrders") || "[]");
    const order = orders.find(item => item.id === id);
    if (order) order.status = status;
    localStorage.setItem("kvOrders", JSON.stringify(orders));
    return;
  }

  await fetch(window.kvApiUrl(`/api/orders/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ status })
  });
}

async function loadSalesSummary() {
  if (!hasBackend()) {
    const orders = JSON.parse(localStorage.getItem("kvOrders") || "[]");
    const activeOrders = orders.filter(order => order.status !== "Cancelado");
    const paidOrders = orders.filter(order => ["Pago", "Separando", "Enviado", "Entregue"].includes(order.status));
    const revenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const paidRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      activeOrders: activeOrders.length,
      revenue,
      paidRevenue,
      averageTicket: activeOrders.length ? revenue / activeOrders.length : 0,
      statusCounts: orders.reduce((acc, order) => {
        acc[order.status || "Novo pedido"] = (acc[order.status || "Novo pedido"] || 0) + 1;
        return acc;
      }, {})
    };
  }

  const response = await fetch(window.kvApiUrl("/api/sales-summary"), { headers: authHeaders() });
  if (!response.ok) throw new Error("Nao foi possivel carregar o painel.");
  return response.json();
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryLabel(category) {
  return category === "Calcados" ? "Cal\u00e7ados" : category;
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setPreview(src) {
  selectedImage = src || "";
  imagePreview.innerHTML = selectedImage
    ? `<img src="${selectedImage}" alt="Preview do produto">`
    : "<span>Preview da foto</span>";
}

function resetProductForm() {
  form.reset();
  editingProductId.value = "";
  productSubmitButton.textContent = "Criar anuncio";
  cancelEditButton.classList.add("is-hidden");
  setPreview("");
}

function getFallbackImage(category) {
  return category === "Calcados"
    ? "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80"
    : "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80";
}

async function renderActiveAds() {
  const adminProducts = await loadAdminProducts();
  const demoProducts = getDemoProducts();
  const activeDemoProducts = storeSettings.hideDemoProducts ? [] : demoProducts;
  const activeCount = adminProducts.length + activeDemoProducts.length;
  productCount.textContent = activeCount;

  const demoCards = demoProducts.map(product => `
    <article class="admin-product-item ${storeSettings.hideDemoProducts ? "is-inactive-ad" : ""}">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <div class="ad-badges">
          <span class="ad-badge">Demonstracao</span>
          <span class="ad-status ${storeSettings.hideDemoProducts ? "inactive" : "active"}">
            ${storeSettings.hideDemoProducts ? "Inativo" : "Ativo"}
          </span>
        </div>
        <span class="product-category">${categoryLabel(product.category)}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <strong>${money.format(product.price)}</strong>
        ${product.oldPrice ? `<span class="old-price">${money.format(product.oldPrice)}</span>` : ""}
      </div>
      <div class="admin-row-actions">
        <button class="remove-btn" type="button" data-toggle-demo-products>
          ${storeSettings.hideDemoProducts ? "Ativar ficticios" : "Ocultar ficticios"}
        </button>
      </div>
    </article>
  `);

  const adminCards = adminProducts.map(product => `
    <article class="admin-product-item">
      <img src="${product.image}" alt="${product.name}">
      <div>
        <div class="ad-badges">
          <span class="ad-badge real">Anuncio real</span>
          <span class="ad-status active">Ativo</span>
        </div>
        <span class="product-category">${categoryLabel(product.category)}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <p>Estoque: ${product.stock || 0}</p>
        ${(product.sizes || []).length ? `<p>Tamanhos: ${product.sizes.join(", ")}</p>` : ""}
        ${(product.colors || []).length ? `<p>Cores: ${product.colors.join(", ")}</p>` : ""}
        <strong>${money.format(product.price)}</strong>
        ${product.oldPrice ? `<span class="old-price">${money.format(product.oldPrice)}</span>` : ""}
      </div>
      <div class="admin-row-actions">
        <button class="remove-btn" type="button" data-edit-product="${product.id}">Editar</button>
        <button class="remove-btn" type="button" data-delete-product="${product.id}">Remover</button>
      </div>
    </article>
  `);

  productsList.innerHTML = [...adminCards, ...demoCards].length
    ? [...adminCards, ...demoCards].join("")
    : '<p class="empty-state">Nenhum anuncio ativo ainda.</p>';
}

async function renderDashboard() {
  const summary = await loadSalesSummary();
  dashboardRevenue.textContent = money.format(summary.revenue || 0);
  dashboardPaidRevenue.textContent = money.format(summary.paidRevenue || 0);
  dashboardAverageTicket.textContent = money.format(summary.averageTicket || 0);
  dashboardActiveOrders.textContent = summary.activeOrders || 0;
  statusSummary.innerHTML = Object.entries(summary.statusCounts || {})
    .map(([status, count]) => `<span>${status}: <strong>${count}</strong></span>`)
    .join("");
}

function renderStoreSettings() {
  toggleDemoProductsButton.textContent = storeSettings.hideDemoProducts
    ? "Mostrar anuncios ficticios"
    : "Ocultar anuncios ficticios";
}

function showAdminTab(tabName) {
  adminTabs.forEach(tab => {
    tab.classList.toggle("is-active", tab.dataset.adminTab === tabName);
  });
  Object.entries(adminPanels).forEach(([name, panel]) => {
    panel.classList.toggle("is-hidden", name !== tabName);
  });
}

async function toggleDemoProducts() {
  storeSettings = await saveStoreSettings({
    hideDemoProducts: !storeSettings.hideDemoProducts
  });
  renderStoreSettings();
  await renderActiveAds();
  adminMessage.textContent = storeSettings.hideDemoProducts
    ? "Anuncios ficticios ocultados da loja."
    : "Anuncios ficticios voltaram para a loja.";
}

async function renderOrders() {
  const orders = await loadOrders();
  orderCount.textContent = orders.length;

  ordersList.innerHTML = orders.length
    ? orders.map(order => `
      <article class="admin-order-item">
        <div>
          <span class="product-category">${order.id}</span>
          <h3>${order.customer.name} - ${money.format(order.total || 0)}</h3>
          <p>${order.customer.phone}${order.customer.email ? " - " + order.customer.email : ""}</p>
          <p>${order.customer.address || "Retirada ou endereco nao informado"}</p>
          <p>${(order.items || []).map(item => `${item.quantity}x ${item.name}`).join(", ")}</p>
        </div>
        <select data-order-status="${order.id}">
          ${["Novo pedido", "Pago", "Separando", "Enviado", "Entregue", "Cancelado"].map(status => `
            <option ${order.status === status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </article>
    `).join("")
    : '<p class="empty-state">Nenhum pedido recebido ainda.</p>';
}

imageFile.addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  const image = await readImageFile(file);
  imageUrl.value = "";
  setPreview(image);
});

imageUrl.addEventListener("input", event => {
  if (event.target.value.trim()) {
    imageFile.value = "";
    setPreview(event.target.value.trim());
  } else {
    setPreview("");
  }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(form);
  const name = String(formData.get("name")).trim();
  const category = String(formData.get("category"));
  const price = Number(formData.get("price"));
  const oldPrice = Number(formData.get("oldPrice"));
  const description = String(formData.get("description")).trim();
  const image = selectedImage || getFallbackImage(category);

  const product = {
    id: Date.now(),
    slug: slugify(name),
    name,
    category,
    price,
    description,
    image,
    stock: Number(formData.get("stock") || 0),
    sizes: String(formData.get("sizes") || "").split(",").map(item => item.trim()).filter(Boolean),
    colors: String(formData.get("colors") || "").split(",").map(item => item.trim()).filter(Boolean),
    sale: Boolean(formData.get("sale"))
  };

  if (oldPrice > price) {
    product.oldPrice = oldPrice;
    product.sale = true;
  }

  try {
    if (editingProductId.value) {
      await updateAdminProduct(editingProductId.value, product);
      adminMessage.textContent = "Anuncio atualizado com sucesso.";
    } else {
      await createAdminProduct(product);
      adminMessage.textContent = "Anuncio criado com sucesso. Ele ja aparece na loja.";
    }
    resetProductForm();
    await renderActiveAds();
    showAdminTab("ads");
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

productsList.addEventListener("click", async event => {
  const editButton = event.target.closest("[data-edit-product]");
  const button = event.target.closest("[data-delete-product]");
  const demoToggle = event.target.closest("[data-toggle-demo-products]");
  if (demoToggle) {
    await toggleDemoProducts();
    return;
  }
  if (editButton) {
    const products = await loadAdminProducts();
    const product = products.find(item => Number(item.id) === Number(editButton.dataset.editProduct));
    if (!product) return;

    form.elements.name.value = product.name;
    form.elements.category.value = product.category;
    form.elements.price.value = product.price;
    form.elements.oldPrice.value = product.oldPrice || "";
    form.elements.stock.value = product.stock || 0;
    form.elements.sizes.value = (product.sizes || []).join(", ");
    form.elements.colors.value = (product.colors || []).join(", ");
    form.elements.sale.checked = Boolean(product.sale);
    form.elements.description.value = product.description;
    form.elements.imageUrl.value = product.image.startsWith("data:") ? "" : product.image;
    editingProductId.value = product.id;
    productSubmitButton.textContent = "Salvar alteracoes";
    cancelEditButton.classList.remove("is-hidden");
    setPreview(product.image);
    showAdminTab("create");
    window.scrollTo({ top: form.offsetTop - 90, behavior: "smooth" });
    return;
  }
  if (!button) return;

  if (!confirm("Remover este anuncio?")) return;
  await deleteAdminProduct(button.dataset.deleteProduct);
  await renderActiveAds();
});

cancelEditButton.addEventListener("click", resetProductForm);

clearButton.addEventListener("click", async () => {
  await clearAdminProductList();
  await renderActiveAds();
  await renderDashboard();
  adminMessage.textContent = "Anuncios criados foram removidos.";
});

toggleDemoProductsButton.addEventListener("click", async () => {
  try {
    await toggleDemoProducts();
  } catch (error) {
    adminMessage.textContent = error.message;
  }
});

adminTabs.forEach(tab => {
  tab.addEventListener("click", () => showAdminTab(tab.dataset.adminTab));
});

ordersList.addEventListener("change", async event => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  await updateOrderStatus(select.dataset.orderStatus, select.value);
  await renderOrders();
  await renderDashboard();
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  if (!hasBackend()) {
    localStorage.setItem("kvAdminToken", "local-file-mode");
    showAdmin();
    await bootAdmin();
    return;
  }

  const response = await fetch(window.kvApiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(formData.entries()))
  });
  const data = await response.json();
  if (!response.ok) {
    loginMessage.textContent = data.error || "Nao foi possivel entrar.";
    return;
  }

  localStorage.setItem("kvAdminToken", data.token);
  showAdmin();
  await bootAdmin();
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("kvAdminToken");
  showLogin();
});

async function bootAdmin() {
  try {
    storeSettings = await loadStoreSettings();
    renderStoreSettings();
    await renderDashboard();
    await renderActiveAds();
    await renderOrders();
  } catch (error) {
    localStorage.removeItem("kvAdminToken");
    loginMessage.textContent = "Sessao expirada. Entre novamente.";
    showLogin();
  }
}

if (getToken()) {
  showAdmin();
  bootAdmin();
} else {
  showLogin();
}
