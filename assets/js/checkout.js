const checkoutForm = document.querySelector("#checkoutForm");
const checkoutMessage = document.querySelector("#checkoutMessage");
const paymentMethodSelect = document.querySelector("#paymentMethod");
const installmentsField = document.querySelector("#installmentsField");
const installmentsSelect = document.querySelector("#installmentsSelect");
const installmentsHint = document.querySelector("#installmentsHint");
const checkoutConfig = window.KV_STORE_CONFIG || {};
const storeWhatsappNumber = checkoutConfig.whatsappNumber || "5500000000000";
const storeName = checkoutConfig.storeName || "Vasconcelos";
const MIN_INSTALLMENT_TOTAL = 200;

function checkoutHasBackend() {
  return window.kvHasBackend ? window.kvHasBackend() : window.location.protocol.startsWith("http");
}

function readCheckoutCart() {
  try {
    return JSON.parse(localStorage.getItem("fashionCart")) || [];
  } catch (error) {
    return [];
  }
}

function saveLocalOrder(order) {
  const orders = JSON.parse(localStorage.getItem("kvOrders") || "[]");
  orders.unshift(order);
  localStorage.setItem("kvOrders", JSON.stringify(orders));
}

function enrichLocalOrder(order) {
  const items = order.items.map(item => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number(item.price || item.unitPrice || 0);
    return {
      ...item,
      quantity,
      unitPrice,
      total: Number((unitPrice * quantity).toFixed(2))
    };
  });
  const subtotal = Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
  const shipping = subtotal > 0 && subtotal < 299 ? 19.9 : 0;
  return {
    ...order,
    status: "Novo pedido",
    subtotal,
    shipping,
    total: Number((subtotal + shipping).toFixed(2)),
    installments: normalizeInstallments(order.paymentMethod, order.installments, Number((subtotal + shipping).toFixed(2))),
    items
  };
}

function calculateCheckoutTotal() {
  const cart = readCheckoutCart();
  const subtotal = cart.reduce((sum, item) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    return sum + Number(item.price || item.unitPrice || 0) * quantity;
  }, 0);
  const shipping = subtotal > 0 && subtotal < 299 ? 19.9 : 0;
  return Number((subtotal + shipping).toFixed(2));
}

function normalizeInstallments(paymentMethod, installments, total) {
  const isCard = String(paymentMethod || "") === "Cartao";
  const canInstall = isCard && Number(total || 0) >= MIN_INSTALLMENT_TOTAL;
  if (!canInstall) return 1;
  const selected = Number(installments || 0);
  return Math.min(6, Math.max(2, selected || 2));
}

function updateInstallmentsVisibility() {
  if (!paymentMethodSelect || !installmentsField || !installmentsSelect) return;
  const total = calculateCheckoutTotal();
  const isCard = paymentMethodSelect.value === "Cartao";
  const canInstall = isCard && total >= MIN_INSTALLMENT_TOTAL;

  installmentsField.classList.toggle("is-hidden", !isCard);
  installmentsSelect.required = canInstall;
  installmentsSelect.disabled = !canInstall;
  if (!canInstall) installmentsSelect.value = "";

  if (installmentsHint) {
    installmentsHint.textContent = isCard && total < MIN_INSTALLMENT_TOTAL
      ? `Parcelamento disponivel a partir de ${checkoutMoney(MIN_INSTALLMENT_TOTAL)}.`
      : `Disponivel para compras acima de ${checkoutMoney(MIN_INSTALLMENT_TOTAL)}.`;
  }
}

function checkoutMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function buildWhatsappMessage(order) {
  const itemLines = order.items.map(item => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const unitPrice = Number(item.unitPrice || item.price || 0);
    const total = Number(item.total || unitPrice * quantity);
    const details = [item.size, item.color].filter(Boolean).join(" / ");
    return `- ${quantity}x ${item.name}${details ? ` (${details})` : ""} - ${checkoutMoney(total)}`;
  });

  return [
    `Ola, ${storeName}! Quero finalizar meu pedido.`,
    "",
    `Pedido: ${order.id}`,
    "",
    "Itens:",
    ...itemLines,
    "",
    `Subtotal: ${checkoutMoney(order.subtotal)}`,
    `Frete/entrega: ${checkoutMoney(order.shipping)}`,
    `Total: ${checkoutMoney(order.total)}`,
    "",
    "Dados do cliente:",
    `Nome: ${order.customer.name}`,
    `WhatsApp: ${order.customer.phone}`,
    order.customer.email ? `Email: ${order.customer.email}` : null,
    `Entrega: ${order.deliveryMethod}`,
    order.customer.address ? `Endereco: ${order.customer.address}` : null,
    `Pagamento desejado: ${order.paymentMethod}${Number(order.installments || 1) > 1 ? ` em ${order.installments}x` : ""}`
  ].filter(Boolean).join("\n");
}

function buildWhatsappUrl(order) {
  const message = encodeURIComponent(buildWhatsappMessage(order));
  return `https://wa.me/${storeWhatsappNumber}?text=${message}`;
}

async function createOrder(order) {
  if (!checkoutHasBackend()) {
    const localOrder = enrichLocalOrder(order);
    saveLocalOrder(localOrder);
    return localOrder;
  }

  const response = await fetch(window.kvApiUrl("/api/orders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Nao foi possivel criar o pedido.");
  return data;
}

if (checkoutForm) {
  checkoutForm.addEventListener("submit", async event => {
    event.preventDefault();
    const cart = readCheckoutCart();

    if (!cart.length) {
      checkoutMessage.textContent = "Adicione produtos ao carrinho antes de finalizar.";
      return;
    }

    const formData = new FormData(checkoutForm);
    const order = {
      id: `PED-${Date.now()}`,
      customer: Object.fromEntries(formData.entries()),
      deliveryMethod: formData.get("deliveryMethod"),
      paymentMethod: formData.get("paymentMethod"),
      installments: normalizeInstallments(formData.get("paymentMethod"), formData.get("installments"), calculateCheckoutTotal()),
      items: cart
    };

    checkoutMessage.textContent = "Enviando pedido...";
    const whatsappWindow = window.open("about:blank", "_blank");
    if (whatsappWindow) whatsappWindow.opener = null;

    try {
      const created = await createOrder(order);
      localStorage.removeItem("fashionCart");
      checkoutForm.reset();
      updateInstallmentsVisibility();
      checkoutMessage.textContent = `Pedido ${created.id} criado. Abrindo WhatsApp...`;
      const whatsappUrl = buildWhatsappUrl(created);
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
        return;
      }
      const successPath = window.location.pathname.includes("/pages/")
        ? `sucesso.html?pedido=${encodeURIComponent(created.id)}`
        : `pages/sucesso.html?pedido=${encodeURIComponent(created.id)}`;
      setTimeout(() => window.location.href = successPath, 900);
    } catch (error) {
      if (whatsappWindow) whatsappWindow.close();
      checkoutMessage.textContent = error.message;
    }
  });

  paymentMethodSelect?.addEventListener("change", updateInstallmentsVisibility);
  installmentsSelect?.addEventListener("change", updateInstallmentsVisibility);
  document.addEventListener("cart:updated", updateInstallmentsVisibility);
  window.addEventListener("storage", updateInstallmentsVisibility);
  updateInstallmentsVisibility();
}
