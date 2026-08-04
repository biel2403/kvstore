# KV Store / Vasconcelos - Loja Online

Projeto de loja online para roupas e calcados, com frontend em HTML/CSS/JavaScript puro, painel admin, backend em Node.js, PostgreSQL para producao e SQLite como fallback local.

## Estado Atual

O projeto ja tem:

- Home responsiva.
- Identidade visual baseada na logo KV / Vasconcelos.
- Categorias: `Feminina` e `Calcados`.
- Vitrine de produtos.
- Pagina de produto.
- Pagina de categoria.
- Carrinho lateral funcional.
- Persistencia do carrinho no navegador.
- Checkout com dados do cliente.
- Finalizacao de pedido pelo WhatsApp da proprietaria.
- Cadastro de pedidos em banco de dados.
- Tela admin para ver pedidos.
- Alteracao de status de pedido no admin.
- Tela admin para criar anuncio de produto.
- Opcao no admin para ocultar/mostrar anuncios ficticios da vitrine.
- Upload/preview de foto no admin.
- Login no admin.
- Protecao das rotas administrativas no backend.
- Painel de vendas com faturamento, receita paga, ticket medio e pedidos ativos.
- Edicao de produtos criados no admin.
- Campos de estoque, tamanhos e cores para produtos criados no admin.
- Pagina de sucesso do pedido.
- Paginas de contato e trocas/devolucoes.
- Backend Node.js.
- Suporte a PostgreSQL via `DATABASE_URL`.
- Fallback SQLite em `backend/store.sqlite` para testes locais.
- API para listar, criar e remover produtos cadastrados pelo admin.

## Como Rodar Com Backend Local

Use este modo para salvar os produtos do admin no SQLite local.

Na pasta do projeto, rode:

```bash
npm start
```

Depois abra:

```text
http://localhost:3000
```

Admin:

```text
http://localhost:3000/pages/admin.html
```

O link do admin nao aparece no menu da loja. Guarde esse endereco e acesse direto pelo navegador quando precisar gerenciar produtos e pedidos.

Login padrao local:

```text
Usuario: admin
Senha: 1234
```

Para trocar em um ambiente real, use variaveis de ambiente:

```text
ADMIN_USER
ADMIN_PASSWORD
ADMIN_TOKEN
```

## Como Usar PostgreSQL

Em producao, crie um banco PostgreSQL no Render, Supabase ou Neon.

Depois configure a variavel de ambiente no backend:

```text
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco
```

Quando `DATABASE_URL` existe, o backend usa PostgreSQL automaticamente e cria as tabelas do arquivo:

```text
backend/schema.postgres.sql
```

Quando `DATABASE_URL` nao existe, ele continua usando SQLite local:

```text
backend/store.sqlite
```

Se estiver usando PostgreSQL local sem SSL, configure tambem:

```text
PGSSLMODE=disable
```

## Frontend Na Vercel E Backend No Render

Quando o backend estiver publicado no Render, copie a URL dele e coloque em:

```text
assets/js/config.js
```

Campo:

```js
apiBaseUrl: "https://sua-api.onrender.com"
```

Exemplo:

```js
window.KV_STORE_CONFIG = {
  storeName: "Vasconcelos",
  whatsappNumber: "5515991280671",
  apiBaseUrl: "https://kv-store-api.onrender.com"
};
```

Localmente, deixe vazio:

```js
apiBaseUrl: ""
```

## Como Abrir Sem Backend

Tambem da para abrir direto:

```text
index.html
```

Nesse modo, o admin salva os produtos apenas no navegador com `localStorage`.

## Estrutura Das Pastas

```text
Projeto Loj/
|-- index.html
|-- README.md
|-- package.json
|-- assets/
|   |-- css/
|   |   `-- style.css
|   |-- img/
|   |   `-- vasconcelos-logo.png
|   `-- js/
|       |-- admin.js
|       |-- catalog.js
|       |-- checkout.js
|       |-- config.js
|       |-- categoria.js
|       |-- produto.js
|       `-- script.js
|-- backend/
|   |-- db.json
|   |-- schema.sql
|   |-- server.js
|   `-- store.sqlite
|-- pages/
|   |-- admin.html
|   |-- categoria.html
|   |-- contato.html
|   |-- produto.html
|   |-- sucesso.html
|   `-- trocas.html
`-- legacy-node-version/
```

## Onde Personalizar

### Nome Da Loja

Arquivos:

```text
index.html
pages/admin.html
pages/produto.html
pages/categoria.html
```

Procure por:

```text
KV Store
Vasconcelos
```

### Logo

Arquivo:

```text
assets/img/vasconcelos-logo.png
```

Para trocar a logo, substitua esse arquivo mantendo o mesmo nome, ou altere os caminhos dos `<img>` nos HTML.

### Cores, Fontes E Visual

Arquivo:

```text
assets/css/style.css
```

As cores principais ficam no inicio do arquivo:

```css
:root {
  --bg: #f8f1e6;
  --surface: #fffaf2;
  --text: #162b4f;
  --primary: #213f70;
  --accent: #c6a15b;
}
```

### Produtos Fixos Da Loja

Arquivo:

```text
assets/js/catalog.js
```

Formato de produto:

```js
{
  id: 1,
  slug: "vestido-midi-linho",
  name: "Vestido Midi Linho",
  category: "Feminina",
  price: 219.9,
  oldPrice: 299.9,
  description: "Descricao do produto.",
  image: "URL_DA_IMAGEM",
  sale: true
}
```

Categorias atuais:

```text
Feminina
Calcados
```

No site, o valor interno usado nos links e filtros e:

```text
Calcados
```

### Produtos Criados No Admin

Tela:

```text
pages/admin.html
```

Logica:

```text
assets/js/admin.js
```

Com backend ligado, os produtos criados no admin sao salvos em:

```text
PostgreSQL, se DATABASE_URL estiver configurado.
SQLite local em backend/store.sqlite, se DATABASE_URL nao estiver configurado.
```

Sem backend, eles ficam no navegador na chave:

```text
kvAdminProducts
```

### Home

Arquivo:

```text
index.html
```

Contem:

- Header.
- Menu.
- Hero.
- Categorias.
- Vitrine.
- Promocoes.
- Newsletter.
- Footer.

### Pagina Do Produto

Arquivo:

```text
pages/produto.html
```

Logica:

```text
assets/js/produto.js
```

URL:

```text
pages/produto.html?id=1
```

### Pagina Da Categoria

Arquivo:

```text
pages/categoria.html
```

Logica:

```text
assets/js/categoria.js
```

URL:

```text
pages/categoria.html?category=Feminina
pages/categoria.html?category=Calcados
```

### Carrinho

Arquivos:

```text
assets/js/script.js
assets/js/produto.js
assets/js/categoria.js
```

Hoje o carrinho fica no navegador usando:

```text
fashionCart
```

Para limpar durante testes:

```js
localStorage.removeItem("fashionCart");
```

### WhatsApp Da Loja

Arquivo:

```text
assets/js/config.js
```

Troque o numero abaixo pelo WhatsApp real da proprietaria:

```js
whatsappNumber: "5500000000000"
```

Use somente numeros, no formato internacional:

```text
55 + DDD + numero
```

Exemplo:

```js
whatsappNumber: "5511999999999"
```

Quando o cliente clicar em `Finalizar pelo WhatsApp`, o site:

- cria o pedido no backend, se o site estiver rodando em `http://localhost:3000`;
- salva o pedido no navegador, se abrir direto pelo `index.html`;
- monta uma mensagem com produtos, quantidades, total e dados do cliente;
- abre o WhatsApp da proprietaria com a mensagem pronta.

## Backend

Arquivo principal:

```text
backend/server.js
```

Schema do banco:

```text
backend/schema.sql
backend/schema.postgres.sql
```

Banco local:

```text
backend/store.sqlite
```

SQLite local usado:

```text
C:\sqlite\sqlite3.exe
```

Banco de producao:

```text
PostgreSQL via DATABASE_URL
```

Rotas atuais:

```text
POST   /api/auth/login
GET    /api/products
GET    /api/admin-products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
DELETE /api/admin-products
GET    /api/orders
POST   /api/orders
PATCH  /api/orders/:id
GET    /api/sales-summary
GET    /api/settings
PATCH  /api/settings
```

As rotas administrativas exigem token de login.

## Arquivos Antigos

A pasta abaixo guarda uma versao anterior do projeto:

```text
legacy-node-version/
```

Ela pode ser mantida como referencia. A versao principal agora usa:

```text
index.html
assets/
pages/
backend/
package.json
README.md
```

## O Que Falta Para Virar Loja Completa

### Essencial

- Calculo real de frete.
- Baixa automatica e rigorosa de estoque apos pedido.
- Variacoes avancadas por combinacao, exemplo: Scarpin nude 35 = 2 unidades.
- Melhor validacao dos dados do cliente.

### Pagamento

- Integracao com Mercado Pago, Stripe, PagSeguro ou outro gateway.
- Pagamento via Pix.
- Confirmacao automatica de pagamento.
- Webhook para atualizar pedido quando o pagamento for aprovado.

Isso ficou como etapa futura porque agora a loja finaliza pelo WhatsApp. Para pagamento automatico dentro do site, depende de criar conta no gateway escolhido e configurar chaves de API.

### Banco E Backend

- Criar tabelas SQL para clientes e estoque.
- Validar dados recebidos pela API.
- Evitar produtos duplicados.
- Salvar imagens de forma mais adequada.
- Remover dependencias de `localStorage` para dados importantes.
- Criar migrations do banco.

### Admin

- Remover produto com confirmacao.
- Relatorio por periodo.
- Buscar e filtrar pedidos.

### Loja

- Busca mais completa.
- Filtros por tamanho, preco, cor e promocao.
- Melhor tratamento de fotos.

### Producao

- Hospedar o site e backend.
- Usar HTTPS.
- Configurar dominio.
- Backup do banco.
- Variaveis de ambiente.
- Logs de erro.
- Migrar para PostgreSQL se a loja crescer muito.
