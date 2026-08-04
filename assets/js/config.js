/*
  CONFIGURACOES RAPIDAS DA LOJA
  - Troque o numero abaixo pelo WhatsApp da proprietaria.
  - Use o formato internacional, somente numeros:
    Brasil: 55 + DDD + numero. Exemplo: 5511999999999
*/
window.KV_STORE_CONFIG = {
  storeName: "Vasconcelos",
  whatsappNumber: "5515991280671",
  apiBaseUrl: ""
};

window.kvApiBaseUrl = function kvApiBaseUrl() {
  return String(window.KV_STORE_CONFIG.apiBaseUrl || "").replace(/\/$/, "");
};

window.kvApiUrl = function kvApiUrl(path) {
  const baseUrl = window.kvApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
};

window.kvHasBackend = function kvHasBackend() {
  const host = window.location.hostname;
  return Boolean(window.kvApiBaseUrl()) || host === "localhost" || host === "127.0.0.1";
};
