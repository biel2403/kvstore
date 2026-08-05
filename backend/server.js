const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const DB_FILE = path.join(__dirname, "store.sqlite");
const LEGACY_DB_FILE = path.join(__dirname, "db.json");
const SCHEMA_FILE = path.join(__dirname, "schema.sql");
const POSTGRES_SCHEMA_FILE = path.join(__dirname, "schema.postgres.sql");
const CATALOG_FILE = path.join(ROOT, "assets", "js", "catalog.js");
const SQLITE_EXE = process.env.SQLITE_EXE || "C:\\sqlite\\sqlite3.exe";
const DATABASE_URL = process.env.DATABASE_URL || "";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "kv-admin-local-token";
const USE_POSTGRES = Boolean(DATABASE_URL);
const pgPool = USE_POSTGRES
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
    })
  : null;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sqlValue(value) {
  if (value === undefined || value === null || value === "") return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlite(input, json = false) {
  const args = json ? ["-json", DB_FILE] : [DB_FILE];
  const result = spawnSync(SQLITE_EXE, args, {
    input,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Erro ao executar SQLite.");
  return result.stdout.trim();
}

function query(sql) {
  const output = sqlite(sql, true);
  return output ? JSON.parse(output) : [];
}

function execute(sql) {
  sqlite(sql, false);
}

async function pgQuery(sql, params = []) {
  const result = await pgPool.query(sql, params);
  return result.rows;
}

async function getSetting(key, defaultValue = "") {
  if (USE_POSTGRES) {
    const rows = await pgQuery("SELECT value FROM store_settings WHERE key = $1;", [key]);
    return rows[0]?.value ?? defaultValue;
  }

  const rows = query(`SELECT value FROM store_settings WHERE key = ${sqlValue(key)};`);
  return rows[0]?.value ?? defaultValue;
}

async function setSetting(key, value) {
  if (USE_POSTGRES) {
    await pgQuery(`
      INSERT INTO store_settings (key, value)
      VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `, [key, String(value)]);
    return;
  }

  execute(`
    INSERT OR REPLACE INTO store_settings (key, value)
    VALUES (${sqlValue(key)}, ${sqlValue(String(value))});
  `);
}

async function readStoreSettings() {
  const hideDemoProducts = (await getSetting("hideDemoProducts", "false")) === "true";
  return { hideDemoProducts };
}

async function updateStoreSettings(payload) {
  const hideDemoProducts = Boolean(payload.hideDemoProducts);
  await setSetting("hideDemoProducts", String(hideDemoProducts));
  return readStoreSettings();
}

function memberFromRow(row) {
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeClubMember(payload) {
  return {
    name: String(payload.name || payload.nome || "").trim(),
    phone: String(payload.phone || payload.whatsapp || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    source: String(payload.source || "Clube KV").trim() || "Clube KV",
    status: String(payload.status || "Ativo").trim() || "Ativo"
  };
}

function validateClubMember(member) {
  if (!member.name) return "Nome e obrigatorio.";
  if (!member.phone) return "WhatsApp e obrigatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) return "Email invalido.";
  return "";
}

async function readClubMembers() {
  const rows = USE_POSTGRES
    ? await pgQuery(`
      SELECT id, name, phone, email, source, status, created_at, updated_at
      FROM club_members
      ORDER BY created_at DESC, id DESC;
    `)
    : query(`
      SELECT id, name, phone, email, source, status, created_at, updated_at
      FROM club_members
      ORDER BY created_at DESC, id DESC;
    `);

  return rows.map(memberFromRow);
}

async function saveClubMember(payload) {
  const member = normalizeClubMember(payload);
  const error = validateClubMember(member);
  if (error) throw new Error(error);

  if (USE_POSTGRES) {
    const rows = await pgQuery(`
      INSERT INTO club_members (name, phone, email, source, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        source = EXCLUDED.source,
        status = 'Ativo',
        updated_at = NOW()
      RETURNING id, name, phone, email, source, status, created_at, updated_at;
    `, [member.name, member.phone, member.email, member.source, member.status]);
    return memberFromRow(rows[0]);
  }

  execute(`
    INSERT INTO club_members (name, phone, email, source, status, updated_at)
    VALUES (
      ${sqlValue(member.name)},
      ${sqlValue(member.phone)},
      ${sqlValue(member.email)},
      ${sqlValue(member.source)},
      ${sqlValue(member.status)},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      phone = excluded.phone,
      source = excluded.source,
      status = 'Ativo',
      updated_at = CURRENT_TIMESTAMP;
  `);

  const rows = query(`
    SELECT id, name, phone, email, source, status, created_at, updated_at
    FROM club_members
    WHERE email = ${sqlValue(member.email)};
  `);
  return memberFromRow(rows[0]);
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(iso, months) {
  const [year, month, day] = String(iso || todayIso()).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const originalDay = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() !== originalDay) date.setDate(0);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function agreementFromRow(row) {
  return {
    id: row.id,
    orderId: row.order_id || "",
    nome: row.customer_name,
    whatsapp: row.customer_phone,
    email: row.customer_email || "",
    produto: row.product_summary || "",
    valorTotal: Number(row.total_value).toFixed(2),
    entrada: Number(row.down_payment || 0).toFixed(2),
    totalParcelas: String(row.total_installments || 1),
    valorParcela: Number(row.installment_value || 0).toFixed(2),
    primeiroVencimento: row.first_due_date,
    formaPagamento: row.payment_method,
    status: row.status,
    obs: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function installmentFromRow(row) {
  return {
    id: row.id,
    clienteId: row.agreement_id,
    numero: String(row.number),
    vencimento: row.due_date,
    valor: Number(row.value).toFixed(2),
    status: row.status,
    pagoEm: row.paid_at || "",
    obs: row.notes || ""
  };
}

async function readPaymentData() {
  const agreementRows = USE_POSTGRES
    ? await pgQuery(`
      SELECT id, order_id, customer_name, customer_phone, customer_email, product_summary,
             total_value, down_payment, total_installments, installment_value, first_due_date,
             payment_method, status, notes, created_at, updated_at
      FROM payment_agreements
      ORDER BY created_at DESC;
    `)
    : query(`
      SELECT id, order_id, customer_name, customer_phone, customer_email, product_summary,
             total_value, down_payment, total_installments, installment_value, first_due_date,
             payment_method, status, notes, created_at, updated_at
      FROM payment_agreements
      ORDER BY created_at DESC;
    `);

  const installmentRows = USE_POSTGRES
    ? await pgQuery(`
      SELECT id, agreement_id, number, due_date, value, status, paid_at, notes
      FROM payment_installments
      ORDER BY agreement_id, number ASC;
    `)
    : query(`
      SELECT id, agreement_id, number, due_date, value, status, paid_at, notes
      FROM payment_installments
      ORDER BY agreement_id, number ASC;
    `);

  return {
    ok: true,
    acordos: agreementRows.map(agreementFromRow),
    parcelas: installmentRows.map(installmentFromRow)
  };
}

function normalizePaymentAgreement(payload) {
  const totalValue = Number(String(payload.valorTotal || payload.totalValue || 0).replace(",", "."));
  const downPayment = Number(String(payload.entrada || payload.downPayment || 0).replace(",", "."));
  const totalInstallments = Math.max(1, Number(payload.totalParcelas || payload.totalInstallments || 1));
  const balance = Math.max(totalValue - downPayment, 0);
  const installmentValue = Number((balance / totalInstallments).toFixed(2));
  const id = String(payload.id || `PAY-${Date.now()}`);
  const firstDueDate = String(payload.primeiroVencimento || payload.firstDueDate || todayIso());

  return {
    id,
    orderId: String(payload.orderId || payload.order_id || ""),
    customerName: String(payload.nome || payload.customerName || "").trim(),
    customerPhone: String(payload.whatsapp || payload.customerPhone || "").trim(),
    customerEmail: String(payload.email || payload.customerEmail || "").trim(),
    productSummary: String(payload.produto || payload.productSummary || "").trim(),
    totalValue,
    downPayment,
    totalInstallments,
    installmentValue,
    firstDueDate,
    paymentMethod: String(payload.formaPagamento || payload.paymentMethod || "Pix"),
    status: String(payload.status || "Ativo"),
    notes: String(payload.obs || payload.notes || "").trim()
  };
}

function generatePaymentInstallments(agreement) {
  return Array.from({ length: agreement.totalInstallments }, (_, index) => ({
    id: `${agreement.id}-${index + 1}`,
    agreementId: agreement.id,
    number: index + 1,
    dueDate: addMonths(agreement.firstDueDate, index),
    value: agreement.installmentValue,
    status: "Aberto",
    paidAt: "",
    notes: ""
  }));
}

async function savePaymentAgreement(payload) {
  const agreement = normalizePaymentAgreement(payload);
  if (!agreement.customerName) throw new Error("Nome da cliente e obrigatorio.");
  if (!agreement.customerPhone) throw new Error("WhatsApp da cliente e obrigatorio.");
  if (!agreement.totalValue) throw new Error("Valor da compra e obrigatorio.");

  const installments = generatePaymentInstallments(agreement);

  if (USE_POSTGRES) {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM payment_installments WHERE agreement_id = $1;", [agreement.id]);
      await client.query(`
        INSERT INTO payment_agreements (
          id, order_id, customer_name, customer_phone, customer_email, product_summary,
          total_value, down_payment, total_installments, installment_value, first_due_date,
          payment_method, status, notes, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          order_id = EXCLUDED.order_id,
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          customer_email = EXCLUDED.customer_email,
          product_summary = EXCLUDED.product_summary,
          total_value = EXCLUDED.total_value,
          down_payment = EXCLUDED.down_payment,
          total_installments = EXCLUDED.total_installments,
          installment_value = EXCLUDED.installment_value,
          first_due_date = EXCLUDED.first_due_date,
          payment_method = EXCLUDED.payment_method,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = NOW();
      `, [
        agreement.id,
        agreement.orderId,
        agreement.customerName,
        agreement.customerPhone,
        agreement.customerEmail,
        agreement.productSummary,
        agreement.totalValue,
        agreement.downPayment,
        agreement.totalInstallments,
        agreement.installmentValue,
        agreement.firstDueDate,
        agreement.paymentMethod,
        agreement.status,
        agreement.notes
      ]);

      for (const installment of installments) {
        await client.query(`
          INSERT INTO payment_installments (id, agreement_id, number, due_date, value, status, paid_at, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [installment.id, installment.agreementId, installment.number, installment.dueDate, installment.value, installment.status, installment.paidAt, installment.notes]);
      }

      await client.query("COMMIT");
      return readPaymentData();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  execute([
    "BEGIN;",
    `DELETE FROM payment_installments WHERE agreement_id = ${sqlValue(agreement.id)};`,
    `INSERT OR REPLACE INTO payment_agreements (
      id, order_id, customer_name, customer_phone, customer_email, product_summary,
      total_value, down_payment, total_installments, installment_value, first_due_date,
      payment_method, status, notes, updated_at
    ) VALUES (
      ${sqlValue(agreement.id)},
      ${sqlValue(agreement.orderId)},
      ${sqlValue(agreement.customerName)},
      ${sqlValue(agreement.customerPhone)},
      ${sqlValue(agreement.customerEmail)},
      ${sqlValue(agreement.productSummary)},
      ${sqlValue(agreement.totalValue)},
      ${sqlValue(agreement.downPayment)},
      ${sqlValue(agreement.totalInstallments)},
      ${sqlValue(agreement.installmentValue)},
      ${sqlValue(agreement.firstDueDate)},
      ${sqlValue(agreement.paymentMethod)},
      ${sqlValue(agreement.status)},
      ${sqlValue(agreement.notes)},
      CURRENT_TIMESTAMP
    );`,
    ...installments.map(installment => `
      INSERT INTO payment_installments (id, agreement_id, number, due_date, value, status, paid_at, notes)
      VALUES (
        ${sqlValue(installment.id)},
        ${sqlValue(installment.agreementId)},
        ${sqlValue(installment.number)},
        ${sqlValue(installment.dueDate)},
        ${sqlValue(installment.value)},
        ${sqlValue(installment.status)},
        ${sqlValue(installment.paidAt)},
        ${sqlValue(installment.notes)}
      );
    `),
    "COMMIT;"
  ].join("\n"));

  return readPaymentData();
}

async function deletePaymentAgreement(id) {
  if (USE_POSTGRES) {
    await pgQuery("DELETE FROM payment_agreements WHERE id = $1;", [id]);
  } else {
    execute(`DELETE FROM payment_agreements WHERE id = ${sqlValue(id)};`);
  }
  return readPaymentData();
}

async function syncPaymentAgreementStatusFromOrder(orderId, orderStatus) {
  const agreementStatus = orderStatus === "Cancelado" ? "Cancelado" : "Ativo";

  if (USE_POSTGRES) {
    await pgQuery(
      "UPDATE payment_agreements SET status = $1, updated_at = NOW() WHERE order_id = $2;",
      [agreementStatus, orderId]
    );
    return;
  }

  execute(`
    UPDATE payment_agreements
    SET status = ${sqlValue(agreementStatus)}, updated_at = CURRENT_TIMESTAMP
    WHERE order_id = ${sqlValue(orderId)};
  `);
}

async function updatePaymentInstallment(payload) {
  const installment = {
    id: String(payload.id || ""),
    status: String(payload.status || "Aberto"),
    paidAt: String(payload.pagoEm || payload.paidAt || ""),
    notes: String(payload.obs || payload.notes || "")
  };

  if (!installment.id) throw new Error("Parcela invalida.");

  if (USE_POSTGRES) {
    await pgQuery(`
      UPDATE payment_installments
      SET status = $1, paid_at = $2, notes = $3
      WHERE id = $4;
    `, [installment.status, installment.paidAt, installment.notes, installment.id]);
  } else {
    execute(`
      UPDATE payment_installments
      SET status = ${sqlValue(installment.status)},
          paid_at = ${sqlValue(installment.paidAt)},
          notes = ${sqlValue(installment.notes)}
      WHERE id = ${sqlValue(installment.id)};
    `);
  }

  return readPaymentData();
}

async function createPaymentAgreementFromOrder(order) {
  const productSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(", ");
  const agreement = {
    id: `PAY-${order.id}`,
    orderId: order.id,
    nome: order.customer.name,
    whatsapp: order.customer.phone,
    email: order.customer.email,
    produto: productSummary || `Pedido ${order.id}`,
    valorTotal: order.total,
    entrada: 0,
    totalParcelas: 1,
    primeiroVencimento: todayIso(),
    formaPagamento: order.paymentMethod,
    status: "Ativo",
    obs: `Criado automaticamente pelo pedido ${order.id}.`
  };

  await savePaymentAgreement(agreement);
}

function productFromRow(row) {
  const product = {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    image: row.image,
    stock: Number(row.stock || 0),
    sizes: row.sizes ? JSON.parse(row.sizes) : [],
    colors: row.colors ? JSON.parse(row.colors) : [],
    sale: Boolean(row.sale)
  };

  if (row.old_price !== null && row.old_price !== undefined) {
    product.oldPrice = Number(row.old_price);
  }

  return product;
}

async function readAdminProducts() {
  const rows = USE_POSTGRES
    ? await pgQuery(`
      SELECT id, slug, name, category, price, old_price, description, image, stock, sizes, colors, sale
      FROM admin_products
      ORDER BY created_at DESC, id DESC;
    `)
    : query(`
    SELECT id, slug, name, category, price, old_price, description, image, stock, sizes, colors, sale
    FROM admin_products
    ORDER BY created_at DESC, id DESC;
  `);

  return rows.map(productFromRow);
}

async function insertAdminProduct(product) {
  if (USE_POSTGRES) {
    await pgQuery(`
      INSERT INTO admin_products (id, slug, name, category, price, old_price, description, image, stock, sizes, colors, sale)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);
    `, [
      product.id,
      product.slug,
      product.name,
      product.category,
      product.price,
      product.oldPrice || null,
      product.description,
      product.image,
      product.stock,
      JSON.stringify(product.sizes || []),
      JSON.stringify(product.colors || []),
      product.sale
    ]);
    return;
  }

  execute(`
    INSERT INTO admin_products (id, slug, name, category, price, old_price, description, image, stock, sizes, colors, sale)
    VALUES (
      ${sqlValue(product.id)},
      ${sqlValue(product.slug)},
      ${sqlValue(product.name)},
      ${sqlValue(product.category)},
      ${sqlValue(product.price)},
      ${sqlValue(product.oldPrice)},
      ${sqlValue(product.description)},
      ${sqlValue(product.image)},
      ${sqlValue(product.stock)},
      ${sqlValue(JSON.stringify(product.sizes || []))},
      ${sqlValue(JSON.stringify(product.colors || []))},
      ${sqlValue(product.sale)}
    );
  `);
}

async function deleteAdminProduct(id) {
  if (USE_POSTGRES) {
    await pgQuery("DELETE FROM admin_products WHERE id = $1;", [Number(id)]);
    return;
  }
  execute(`DELETE FROM admin_products WHERE id = ${sqlValue(Number(id))};`);
}

async function clearAdminProducts() {
  if (USE_POSTGRES) {
    await pgQuery("DELETE FROM admin_products;");
    return;
  }
  execute("DELETE FROM admin_products;");
}

async function updateAdminProduct(id, product) {
  if (USE_POSTGRES) {
    await pgQuery(`
      UPDATE admin_products
      SET slug = $1,
          name = $2,
          category = $3,
          price = $4,
          old_price = $5,
          description = $6,
          image = $7,
          stock = $8,
          sizes = $9,
          colors = $10,
          sale = $11
      WHERE id = $12;
    `, [
      product.slug,
      product.name,
      product.category,
      product.price,
      product.oldPrice || null,
      product.description,
      product.image,
      product.stock,
      JSON.stringify(product.sizes || []),
      JSON.stringify(product.colors || []),
      product.sale,
      Number(id)
    ]);
    return;
  }

  execute(`
    UPDATE admin_products
    SET slug = ${sqlValue(product.slug)},
        name = ${sqlValue(product.name)},
        category = ${sqlValue(product.category)},
        price = ${sqlValue(product.price)},
        old_price = ${sqlValue(product.oldPrice)},
        description = ${sqlValue(product.description)},
        image = ${sqlValue(product.image)},
        stock = ${sqlValue(product.stock)},
        sizes = ${sqlValue(JSON.stringify(product.sizes || []))},
        colors = ${sqlValue(JSON.stringify(product.colors || []))},
        sale = ${sqlValue(product.sale)}
    WHERE id = ${sqlValue(Number(id))};
  `);
}

function orderFromRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email || "",
      address: row.customer_address || ""
    },
    deliveryMethod: row.delivery_method,
    paymentMethod: row.payment_method,
    subtotal: Number(row.subtotal),
    shipping: Number(row.shipping),
    total: Number(row.total),
    items: []
  };
}

async function readOrders() {
  const orderRows = USE_POSTGRES
    ? await pgQuery(`
      SELECT id, customer_name, customer_phone, customer_email, customer_address,
             delivery_method, payment_method, status, subtotal, shipping, total, created_at
      FROM orders
      ORDER BY created_at DESC;
    `)
    : query(`
    SELECT id, customer_name, customer_phone, customer_email, customer_address,
           delivery_method, payment_method, status, subtotal, shipping, total, created_at
    FROM orders
    ORDER BY created_at DESC;
  `);

  const orders = orderRows.map(orderFromRow);

  const items = USE_POSTGRES
    ? await pgQuery(`
      SELECT order_id, product_id, product_name, unit_price, quantity, total
      FROM order_items
      ORDER BY id ASC;
    `)
    : query(`
    SELECT order_id, product_id, product_name, unit_price, quantity, total
    FROM order_items
    ORDER BY id ASC;
  `);
  const ordersById = new Map(orders.map(order => [order.id, order]));

  for (const item of items) {
    const order = ordersById.get(item.order_id);
    if (!order) continue;
    order.items.push({
      productId: Number(item.product_id),
      name: item.product_name,
      unitPrice: Number(item.unit_price),
      quantity: Number(item.quantity),
      total: Number(item.total)
    });
  }

  return orders;
}

async function normalizeOrder(payload) {
  const customer = payload.customer || {};
  const sourceItems = Array.isArray(payload.items) ? payload.items : [];
  const products = await allProducts();

  const items = sourceItems.map(item => {
    const productId = Number(item.productId || item.id);
    const product = products.find(entry => Number(entry.id) === productId);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = product ? Number(product.price) : Number(item.price || 0);
    return {
      productId,
      name: product ? product.name : String(item.name || "Produto"),
      unitPrice,
      quantity,
      total: Number((unitPrice * quantity).toFixed(2))
    };
  }).filter(item => item.productId && item.unitPrice > 0 && item.quantity > 0);

  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const shipping = subtotal > 0 && subtotal < 299 ? 19.9 : 0;

  return {
    id: payload.id || `PED-${Date.now()}`,
    customer: {
      name: String(customer.name || "").trim(),
      phone: String(customer.phone || "").trim(),
      email: String(customer.email || "").trim(),
      address: String(customer.address || "").trim()
    },
    deliveryMethod: String(payload.deliveryMethod || "Entrega"),
    paymentMethod: String(payload.paymentMethod || "Pix"),
    status: "Novo pedido",
    subtotal,
    shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    items
  };
}

function validateOrder(order) {
  if (!order.customer.name) return "Nome do cliente e obrigatorio.";
  if (!order.customer.phone) return "Telefone do cliente e obrigatorio.";
  if (!order.items.length) return "O carrinho esta vazio.";
  if (order.deliveryMethod === "Entrega" && !order.customer.address) return "Endereco e obrigatorio para entrega.";
  return "";
}

async function insertOrder(order) {
  if (USE_POSTGRES) {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        INSERT INTO orders (
          id, customer_name, customer_phone, customer_email, customer_address,
          delivery_method, payment_method, status, subtotal, shipping, total
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [
        order.id,
        order.customer.name,
        order.customer.phone,
        order.customer.email,
        order.customer.address,
        order.deliveryMethod,
        order.paymentMethod,
        order.status,
        order.subtotal,
        order.shipping,
        order.total
      ]);

      for (const item of order.items) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, total)
          VALUES ($1, $2, $3, $4, $5, $6);
        `, [order.id, item.productId, item.name, item.unitPrice, item.quantity, item.total]);
      }

      await client.query("COMMIT");
      return;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const statements = [
    "BEGIN;",
    `INSERT INTO orders (
      id, customer_name, customer_phone, customer_email, customer_address,
      delivery_method, payment_method, status, subtotal, shipping, total
    ) VALUES (
      ${sqlValue(order.id)},
      ${sqlValue(order.customer.name)},
      ${sqlValue(order.customer.phone)},
      ${sqlValue(order.customer.email)},
      ${sqlValue(order.customer.address)},
      ${sqlValue(order.deliveryMethod)},
      ${sqlValue(order.paymentMethod)},
      ${sqlValue(order.status)},
      ${sqlValue(order.subtotal)},
      ${sqlValue(order.shipping)},
      ${sqlValue(order.total)}
    );`,
    ...order.items.map(item => `
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, total)
      VALUES (
        ${sqlValue(order.id)},
        ${sqlValue(item.productId)},
        ${sqlValue(item.name)},
        ${sqlValue(item.unitPrice)},
        ${sqlValue(item.quantity)},
        ${sqlValue(item.total)}
      );
    `),
    "COMMIT;"
  ];

  execute(statements.join("\n"));
}

async function updateOrderStatus(id, status) {
  const allowed = ["Novo pedido", "Pago", "Separando", "Enviado", "Entregue", "Cancelado"];
  const nextStatus = allowed.includes(status) ? status : "Novo pedido";
  if (USE_POSTGRES) {
    await pgQuery("UPDATE orders SET status = $1 WHERE id = $2;", [nextStatus, id]);
  } else {
    execute(`UPDATE orders SET status = ${sqlValue(nextStatus)} WHERE id = ${sqlValue(id)};`);
  }

  await syncPaymentAgreementStatusFromOrder(id, nextStatus);
}

async function salesSummary() {
  const orders = await readOrders();
  const activeOrders = orders.filter(order => order.status !== "Cancelado");
  const paidOrders = orders.filter(order => ["Pago", "Separando", "Enviado", "Entregue"].includes(order.status));
  const revenue = activeOrders.reduce((sum, order) => sum + order.total, 0);
  const paidRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    paidOrders: paidOrders.length,
    revenue: Number(revenue.toFixed(2)),
    paidRevenue: Number(paidRevenue.toFixed(2)),
    averageTicket: activeOrders.length ? Number((revenue / activeOrders.length).toFixed(2)) : 0,
    statusCounts
  };
}

async function initializeDatabase() {
  if (USE_POSTGRES) {
    await pgQuery(fs.readFileSync(POSTGRES_SCHEMA_FILE, "utf8"));
    return;
  }

  execute(fs.readFileSync(SCHEMA_FILE, "utf8"));
  const columns = query("PRAGMA table_info(admin_products);").map(column => column.name);
  if (!columns.includes("stock")) execute("ALTER TABLE admin_products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0;");
  if (!columns.includes("sizes")) execute("ALTER TABLE admin_products ADD COLUMN sizes TEXT;");
  if (!columns.includes("colors")) execute("ALTER TABLE admin_products ADD COLUMN colors TEXT;");

  if (!fs.existsSync(LEGACY_DB_FILE)) return;

  const count = query("SELECT COUNT(*) AS total FROM admin_products;")[0]?.total || 0;
  if (count > 0) return;

  try {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, "utf8"));
    for (const product of legacy.adminProducts || []) {
      await insertAdminProduct(normalizeProduct(product));
    }
  } catch (error) {
    console.warn("Nao foi possivel migrar db.json antigo:", error.message);
  }
}

function readBaseProducts() {
  const source = fs.readFileSync(CATALOG_FILE, "utf8");
  const context = {
    window: {},
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.STORE_PRODUCTS || [];
}

async function allProducts() {
  const settings = await readStoreSettings();
  const baseProducts = settings.hideDemoProducts ? [] : readBaseProducts();
  return [...baseProducts, ...(await readAdminProducts())];
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": MIME_TYPES[".json"],
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(text);
}

function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${ADMIN_TOKEN}`;
}

function requireAdmin(req, res) {
  if (isAuthorized(req)) return true;
  sendJson(res, 401, { error: "Login administrativo necessario." });
  return false;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new Error("Payload muito grande."));
        req.destroy();
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

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeProduct(payload) {
  const price = Number(payload.price);
  const oldPrice = Number(payload.oldPrice);
  const product = {
    id: Number(payload.id) || Date.now(),
    slug: payload.slug || slugify(payload.name),
    name: String(payload.name || "").trim(),
    category: payload.category === "Calcados" ? "Calcados" : "Feminina",
    price,
    description: String(payload.description || "").trim(),
    image: String(payload.image || "").trim(),
    stock: Math.max(0, Number(payload.stock || 0)),
    sizes: Array.isArray(payload.sizes) ? payload.sizes : String(payload.sizes || "").split(",").map(item => item.trim()).filter(Boolean),
    colors: Array.isArray(payload.colors) ? payload.colors : String(payload.colors || "").split(",").map(item => item.trim()).filter(Boolean),
    sale: Boolean(payload.sale)
  };

  if (oldPrice > price) {
    product.oldPrice = oldPrice;
    product.sale = true;
  }

  return product;
}

function validateProduct(product) {
  if (!product.name) return "Nome do produto e obrigatorio.";
  if (!Number.isFinite(product.price) || product.price <= 0) return "Preco invalido.";
  if (!product.description) return "Descricao e obrigatoria.";
  if (!product.image) return "Imagem e obrigatoria.";
  return "";
}

async function catalogScript() {
  const products = await allProducts();
  const adminProducts = await readAdminProducts();
  const demoProducts = readBaseProducts();
  return `window.DEMO_PRODUCTS = ${JSON.stringify(demoProducts, null, 2)};
window.STORE_PRODUCTS = ${JSON.stringify(products, null, 2)};
window.ADMIN_PRODUCTS_KEY = "kvAdminProducts";
window.getAdminProducts = function getAdminProducts() {
  return ${JSON.stringify(adminProducts, null, 2)};
};
window.saveAdminProducts = function saveAdminProducts(products) {
  try { localStorage.setItem(window.ADMIN_PRODUCTS_KEY, JSON.stringify(products)); } catch (error) {}
};
window.getStoreProducts = function getStoreProducts() {
  return window.STORE_PRODUCTS || [];
};
`;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const payload = await parseBody(req);
    if (payload.user === ADMIN_USER && payload.password === ADMIN_PASSWORD) {
      return sendJson(res, 200, { token: ADMIN_TOKEN, user: ADMIN_USER });
    }
    return sendJson(res, 401, { error: "Usuario ou senha invalidos." });
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    return sendJson(res, 200, await allProducts());
  }

  if (req.method === "GET" && url.pathname === "/api/admin-products") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readAdminProducts());
  }

  if (req.method === "GET" && url.pathname === "/api/orders") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readOrders());
  }

  if (req.method === "GET" && url.pathname === "/api/sales-summary") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await salesSummary());
  }

  if (req.method === "GET" && url.pathname === "/api/settings") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readStoreSettings());
  }

  if (req.method === "PATCH" && url.pathname === "/api/settings") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await updateStoreSettings(await parseBody(req)));
  }

  if (req.method === "GET" && url.pathname === "/api/club-members") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readClubMembers());
  }

  if (req.method === "POST" && url.pathname === "/api/club-members") {
    try {
      return sendJson(res, 201, await saveClubMember(await parseBody(req)));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/products") {
    if (!requireAdmin(req, res)) return;
    const product = normalizeProduct(await parseBody(req));
    const error = validateProduct(product);
    if (error) return sendJson(res, 400, { error });

    await insertAdminProduct(product);
    return sendJson(res, 201, product);
  }

  if (req.method === "PUT" && url.pathname.startsWith("/api/products/")) {
    if (!requireAdmin(req, res)) return;
    const id = Number(decodeURIComponent(url.pathname.replace("/api/products/", "")));
    const product = normalizeProduct({ ...(await parseBody(req)), id });
    const error = validateProduct(product);
    if (error) return sendJson(res, 400, { error });

    await updateAdminProduct(id, product);
    return sendJson(res, 200, product);
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const order = await normalizeOrder(await parseBody(req));
    const error = validateOrder(order);
    if (error) return sendJson(res, 400, { error });

    await insertOrder(order);
    await createPaymentAgreementFromOrder(order);
    return sendJson(res, 201, order);
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/orders/")) {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(url.pathname.replace("/api/orders/", ""));
    const payload = await parseBody(req);
    await updateOrderStatus(id, String(payload.status || ""));
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE" && url.pathname === "/api/admin-products") {
    if (!requireAdmin(req, res)) return;
    await clearAdminProducts();
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/products/")) {
    if (!requireAdmin(req, res)) return;
    const id = Number(decodeURIComponent(url.pathname.replace("/api/products/", "")));
    const before = (await readAdminProducts()).length;
    await deleteAdminProduct(id);
    const after = (await readAdminProducts()).length;
    return sendJson(res, before === after ? 404 : 200, { ok: before !== after });
  }

  if (req.method === "GET" && url.pathname === "/api/payment-agreements") {
    if (!requireAdmin(req, res)) return;
    return sendJson(res, 200, await readPaymentData());
  }

  if (req.method === "POST" && url.pathname === "/api/payment-agreements") {
    if (!requireAdmin(req, res)) return;
    try {
      const payload = await parseBody(req);
      return sendJson(res, 200, await savePaymentAgreement(payload.acordo || payload));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/payment-agreements/")) {
    if (!requireAdmin(req, res)) return;
    const id = decodeURIComponent(url.pathname.replace("/api/payment-agreements/", ""));
    return sendJson(res, 200, await deletePaymentAgreement(id));
  }

  if (req.method === "PATCH" && url.pathname === "/api/payment-installments") {
    if (!requireAdmin(req, res)) return;
    try {
      const payload = await parseBody(req);
      return sendJson(res, 200, await updatePaymentInstallment(payload.parcela || payload));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: "Rota nao encontrada." });
}

async function serveStatic(req, res, url) {
  if (url.pathname === "/assets/js/catalog.js") {
    return sendText(res, 200, await catalogScript(), MIME_TYPES[".js"]);
  }

  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(ROOT, requestPath));

  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Acesso negado.");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) return sendText(res, 404, "Arquivo nao encontrado.");
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

async function startServer() {
  await initializeDatabase();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        });
        return res.end();
      }
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      return await serveStatic(req, res, url);
    } catch (error) {
      return sendJson(res, 500, { error: error.message || "Erro interno." });
    }
  });

  server.listen(PORT, () => {
    const databaseName = USE_POSTGRES ? "PostgreSQL" : "SQLite";
    console.log(`KV Store rodando em http://localhost:${PORT} com ${databaseName}`);
  });
}

startServer().catch(error => {
  console.error("Nao foi possivel iniciar o servidor:", error);
  process.exit(1);
});
