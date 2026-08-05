# KV Store / Vasconcelos

Loja online moderna para roupas, calcados e vendas pelo WhatsApp, com vitrine responsiva, carrinho, painel administrativo, controle de pedidos e controle de pagamentos parcelados.

O projeto foi pensado para uma loja pequena ou media que quer comecar a vender online de forma simples: o cliente monta o carrinho, informa os dados e finaliza o pedido pelo WhatsApp da proprietaria.

## O Que A Loja Ja Tem

- Home responsiva com identidade visual baseada na logo KV / Vasconcelos.
- Categorias principais: feminina e calcados.
- Pagina individual de produto.
- Pagina de categoria.
- Carrinho lateral com persistencia no navegador.
- Checkout com dados do cliente.
- Finalizacao pelo WhatsApp com mensagem pronta.
- Painel administrativo com login.
- Cadastro, edicao e remocao de anuncios.
- Aba de anuncios ativos, incluindo produtos ficticios e produtos cadastrados.
- Controle de pedidos e status de venda.
- Painel de vendas com resumo financeiro.
- Controle de pagamentos parcelados integrado ao admin.
- Criacao automatica de pagamento quando um pedido e feito.
- Sincronizacao entre pedido cancelado e controle de pagamentos.
- Cadastro VIP do Clube Vasconcelos salvo no banco.
- Aba no admin para visualizar membros VIP e chamar pelo WhatsApp.
- Backend em Node.js.
- Banco local com SQLite e banco de producao com PostgreSQL.

## Links Principais

Loja publicada:

```text
https://kvstore.vercel.app/
```

Backend publicado:

```text
https://kvstore-mtmk.onrender.com
```

Admin:

```text
https://kvstore.vercel.app/pages/admin.html
```

Controle de pagamentos:

```text
https://kvstore.vercel.app/pages/parcelados.html
```

O controle de pagamentos deve ser acessado pelo painel admin.

## Como Rodar Localmente

Na pasta do projeto:

```bash
npm start
```

Depois abra:

```text
http://localhost:3000
```

Admin local:

```text
http://localhost:3000/pages/admin.html
```

Login local padrao:

```text
Usuario: admin
Senha: 1234
```

Em producao, esses dados devem ser configurados por variaveis de ambiente no Render.

## Como Funciona A Venda

1. O cliente escolhe os produtos.
2. O cliente adiciona ao carrinho.
3. O cliente preenche nome, telefone, endereco e forma de entrega.
4. O site cria o pedido no backend.
5. O site abre o WhatsApp da loja com a mensagem pronta.
6. O admin acompanha o pedido pelo painel.
7. O controle de pagamentos recebe automaticamente uma venda relacionada ao pedido.

Se o pedido for cancelado no admin, o pagamento vinculado tambem fica marcado como cancelado.

## Estrutura Do Projeto

```text
Projeto Loj/
|-- index.html
|-- pages/
|-- assets/
|   |-- css/
|   |-- img/
|   `-- js/
|-- backend/
|-- archive/
|-- package.json
`-- README.md
```

Pastas principais:

- `index.html`: pagina inicial da loja.
- `pages/`: paginas internas, como admin, produto, categoria, contato e pagamentos.
- `assets/css/`: estilos visuais.
- `assets/js/`: funcionamento da loja no navegador.
- `assets/img/`: imagens e logo.
- `backend/`: servidor, API e estrutura do banco.
- `archive/`: arquivos antigos guardados como referencia.

## Clube Vasconcelos

O Clube Vasconcelos funciona como uma lista VIP. A cliente informa nome, WhatsApp e e-mail na home, e o cadastro fica salvo no banco.

No painel admin existe uma aba `Clube VIP` para visualizar os membros cadastrados e abrir conversa direto no WhatsApp.

## Personalizacao Rapida

Para trocar nome, visual, produtos, WhatsApp e textos da loja, consulte o arquivo local:

```text
INSTRUCOES_DE_EDICAO_LOCAL.md
```

Esse arquivo fica somente no computador local e nao sobe para o GitHub.

## Deploy

O projeto usa:

- Vercel para o frontend.
- Render para o backend.
- PostgreSQL em producao.
- SQLite apenas para testes locais.

Quando houver mudancas no GitHub, a Vercel e o Render podem atualizar automaticamente, dependendo da configuracao de deploy automatico.

## Proximos Passos Recomendados

- Configurar dominio proprio.
- Revisar fotos e descricoes reais dos produtos.
- Validar estoque com mais detalhe por tamanho/cor.
- Definir politica de entrega, troca e devolucao final.
- Configurar rotina de backup do banco.
- No futuro, integrar pagamento automatico se a loja crescer.

## Observacao

Este projeto atualmente prioriza venda assistida pelo WhatsApp. Isso reduz custo e complexidade no inicio, mantendo a loja pronta para evoluir para pagamento online depois.
