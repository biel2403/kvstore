CREATE TABLE IF NOT EXISTS admin_products (
  id BIGINT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Feminina', 'Calcados')),
  price NUMERIC(10, 2) NOT NULL,
  old_price NUMERIC(10, 2),
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  sizes TEXT,
  colors TEXT,
  sale BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  delivery_method TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Novo pedido',
  subtotal NUMERIC(10, 2) NOT NULL,
  shipping NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  total NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS club_members (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'Clube Vasconcelos',
  status TEXT NOT NULL DEFAULT 'Ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_agreements (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  product_summary TEXT,
  total_value NUMERIC(10, 2) NOT NULL,
  down_payment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_installments INTEGER NOT NULL DEFAULT 1,
  installment_value NUMERIC(10, 2) NOT NULL,
  first_due_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_installments (
  id TEXT PRIMARY KEY,
  agreement_id TEXT NOT NULL REFERENCES payment_agreements(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aberto',
  paid_at TEXT,
  notes TEXT
);
