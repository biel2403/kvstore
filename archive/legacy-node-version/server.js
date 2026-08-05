const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_FILE = path.join(ROOT, "data", "store.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function readStore() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": MIME_TYPES[".json"] });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload muito grande."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function normalizeProduct(product) {
  return {
    id: product.id || product.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: String(product.name || "").trim(),
    category: String(product.category || "Outros").trim(),
    price: Number(product.price || 0),
    description: String(product.description || "").trim(),
    image: String(product.image || "").trim(),
    colors: Array.isArray(product.colors) ? product.colors.map(String) : [],
    sizes: Array.isArray(product.sizes) ? product.sizes.map(String) : [],
    stock: product.stock && typeof product.stock === "object" ? product.stock : {},
    featured: Boolean(product.featured)
  };
}

function validateOrder(store, order) {
  if (!order.customer || !order.customer.name || !order.customer.phone) {
    return "Informe nome e telefone.";
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return "O carrinho esta vazio.";
  }

  for (const item of order.items) {
    const product = store.products.find(entry => entry.id === item.productId);
    if (!product) return `Produto nao encontrado: ${item.productId}`;
    const key = `${item.color}|${item.size}`;
    const available = Number(product.stock[key] || 0);
    if (available < item.quantity) {
      return `Estoque insuficiente para ${product.name} (${item.color}, ${item.size}).`;
    }
  }

  return null;
}

function calculateOrder(store, order) {
  const items = order.items.map(item => {
    const product = store.products.find(entry => entry.id === item.productId);
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      productId: product.id,
      name: product.name,
      color: String(item.color),
      size: String(item.size),
      quantity,
      unitPrice: product.price,
      total: Number((product.price * quantity).toFixed(2))
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const shipping = subtotal >= 299 ? 0 : 19.9;
  const total = Number((subtotal + shipping).toFixed(2));

  return { items, subtotal: Number(subtotal.toFixed(2)), shipping, total };
}

async function handleApi(req, res, url) {
  const store = readStore();

  if (req.method === "GET" && url.pathname === "/api/products") {
    return sendJson(res, 200, store.products);
  }

  if (req.method === "GET" && url.pathname === "/api/orders") {
    return sendJson(res, 200, store.orders);
  }

  if (req.method === "POST" && url.pathname === "/api/products") {
    const product = normalizeProduct(await parseBody(req));
    if (!product.name || !product.price) return sendJson(res, 400, { error: "Nome e preco sao obrigatorios." });
    const existingIndex = store.products.findIndex(entry => entry.id === product.id);
    if (existingIndex >= 0) store.products[existingIndex] = product;
    else store.products.push(product);
    writeStore(store);
    return sendJson(res, 201, product);
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/products/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/products/", ""));
    const nextProducts = store.products.filter(product => product.id !== id);
    if (nextProducts.length === store.products.length) return sendJson(res, 404, { error: "Produto nao encontrado." });
    store.products = nextProducts;
    writeStore(store);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const payload = await parseBody(req);
    const error = validateOrder(store, payload);
    if (error) return sendJson(res, 400, { error });

    const totals = calculateOrder(store, payload);
    for (const item of totals.items) {
      const product = store.products.find(entry => entry.id === item.productId);
      product.stock[`${item.color}|${item.size}`] -= item.quantity;
    }

    const order = {
      id: `PED-${Date.now()}`,
      createdAt: new Date().toISOString(),
      customer: payload.customer,
      paymentMethod: payload.paymentMethod || "Pix",
      deliveryMethod: payload.deliveryMethod || "Entrega",
      status: "Novo pedido",
      ...totals
    };

    store.orders.unshift(order);
    writeStore(store);
    return sendJson(res, 201, order);
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/orders/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/orders/", ""));
    const payload = await parseBody(req);
    const order = store.orders.find(entry => entry.id === id);
    if (!order) return sendJson(res, 404, { error: "Pedido nao encontrado." });
    order.status = String(payload.status || order.status);
    writeStore(store);
    return sendJson(res, 200, order);
  }

  return sendJson(res, 404, { error: "Rota nao encontrada." });
}

function serveStatic(req, res, url) {
  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Acesso negado.");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) return sendText(res, 404, "Arquivo nao encontrado.");
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Erro interno." });
  }
});

server.listen(PORT, () => {
  console.log(`Loja online rodando em http://localhost:${PORT}`);
});
