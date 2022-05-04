# React Avançado - Won Games API

Essa é a API utilizada pela [Won Games Store](https://curso-wongames.vercel.app/) feito no curso [React Avançado](https://www.udemy.com/course/react-avancado/) na Udemy.

## Requerimentos

Esse projeto usa [PostgreSQL](https://www.postgresql.org/), então, para funcionar, você precisa te- lo instalado na sua máquina ou usar Docker.

A configuração para o database pode ser achada no [config/database.js](config/database.js)

## Desenvolvimento

Depois de clonar esse projeto, instale as dependências:

```
npm install
```

Então prossiga com:

```
npm run dev
```

As urls para acesso são:

- `http://localhost:1337/admin` - O painel para criar e popular dados
- `http://localhost:1337/graphql` - GraphQL Playground para testar suas queries

Na primeira vez que você acessar o painel, será necessário criar um usuário de administrador.

## Popular dados

Esse projeto utiliza uma rota `/games/populate` para popular dados usando o site da GoG.

Para fazer funcionar, siga os passos:

- Acesse `http://localhost:1337/admin`
- Settings > Users & Permissions > Roles > Public
- Procure a sessão `Game` e marque `populate`
- Com a aplicação sendo executada, utilize o seguinte comando:

```bash
$ curl -X POST http://localhost:1337/games/populate

# Você pode passar queries da seguinte maneira:
$ curl -X POST http://localhost:1337/games/populate?page=2
$ curl -X POST http://localhost:1337/games/populate?search=simcity
$ curl -X POST http://localhost:1337/games/populate?sort=rating&price=free
$ curl -X POST http://localhost:1337/games/populate?availability=coming&sort=popularity
```
