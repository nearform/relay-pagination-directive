# relay-pagination

This library provides a GQL directive to more easily implement pagination based on the Relay specification. The directive options allow you to decide how far you wish to go towards full [specification compliant pagination](https://relay.dev/graphql/connections.htm) as often full compliance can add overhead which may not be required in your application.

## What / why?

Cursor-based pagination, the style implemented by the Relay specific, involves wrapping a dataset in a `connection` object which presents your dataset items as a collection of `edges`. When making your query you provide a `first` (page size) value and an optional `after` value. `first` sets the number of items to return and `after` sets the start point for item selection. For example, given 100 records with sequential IDs, your initial query could include a `first` value of 10 and the second query would include 10 as the `after` value (the id of the last item in the first page).

To support this pattern in GQL we need to

- Create two additional types for each base type we wish to provide pagination for (a `Connection` and `Edge`) type
- Add connection arguments (`first`, `after`) to each GQL field to be paginated
- Format responses from our resolvers to match the `Connection`/`Edge` schema

This library aims to reduce this overhead by providing a GQL directive that allows you to tag the types you wish to paginate. It will then generate the appropriate types, with added connection arguments, for you and wrap your existing resolvers to generate the `Connection` and `Edge` objects.


## Install

```
yarn add relay-pagination
# or
npm i relay-pagination
# or
pnpm add relay-pagination
```

## Usage

Annotate any types you wish to paginate with the `@connection` directive. Apply the provided GQL directive transformer and all the required `Connection` and `Edge` types will be created for you.

```js
"use strict";

const Fastify = require("fastify");
const mercurius = require("..");
const { connectionDirective } = require('relay-pagination')

const app = Fastify();

const dogs = [
  {
    id: 1,
    name: "Max",
  },
  {
    id: 2,
    name: "Charlie",
  },
  {
    id: 3,
    name: "Buddy",
  },
  {
    id: 4,
    name: "Max",
  },
];


const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
  connectionDirective()

const typeDefs = `
  type Dog {
    id: ID!
    name: String!
    owner: Human
  }

  type Query {
    dogs: Dog @connection
  }
`;

const resolvers = {
  Query: {
    dogs(_, { first, after })
      const results = dogs
        .sort((a, b) => {
          return a.id - b.id
        })
        .filter((dog) => (after ? dog.id > after : true))
        .slice(0, first)

      return dogs
    ,
  },
};

const schema = makeExecutableSchema({
  typeDefs: [connectionDirectiveTypeDefs, typeDefs],
  resolvers
})

const connectionSchema = connectionDirectiveTransformer(schema)

app.register(mercurius, {
  schema: connectionSchema,
  graphiql: true,
});

app.listen({ port: 3000 });
```
[Basic DB example](./examples/basic.js)

This results in the following GQL schema being generated.

```gql
directive @connection ON OBJECT_DEFINITION

type PageInfo {
  startCursor: String
  endCursor: String
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
}

type Dog {
  id: ID!
  name: String!
  owner: Human
}

type DogEdge {
  cursor: ID!
  node: Dog!
}

type DogConnection {
  edges: [DogEdge!]!
  pageInfo: PageInfo!
}

type Query {
  dogs(first: Int, after: ID): DogConnection!
}
```

### Resolver Response

By default, any field marked with the `@connection` directive will have its resolver wrapped. This wrapper will await the result of your original resolver and perform the following depending on the result type it receives.

- If given an array it will treat this as the `edges` value and continue to create the connection and edges objects. Edges will be created depending on the [`paginationMode`](#pagination-mode) selected.
- If given an object it will treat this as the basis of the connection object. Using this it is possible to provide override values for the `pageInfo` property or additional properties on the connection

```js
const resolvers = {
  Query: {
    users: async (root, args) => {
      return db.getUsers(args)
      /*
        returns {
          edges: DB result mapped depending on pagination mode
          pageInfo: {
            startCursor: ...
            endCursor: ...
            hasNextPage: ...
            hasPreviousPage: ...
          }
        }
      */
    },
    films: async (root, args) => {
      const films = await db.getFilms(args)
      return {
        edges: films,
        pageInfo: {
          hasNextPage: true,
        }
      }
      /*
        returns {
          edges: DB result mapped depending on pagination mode
          pageInfo: {
            startCursor: ...
            endCursor: ...
            hasNextPage: true <-- overridden value
            hasPreviousPage: ...
          }
        }
      */
    }
  }
}
```

### Custom Connection/Edge properties

Often it is desirable to add additional properties to our connection and/or edge objects. This is possible using the `typeOptionsMap` config object. This is a mapping of the base type name to the configuration detail. For example if we wanted to add a `totalCount` property.

```js
...

const typeOptionsMap = {
  Dog: {
    connectionProps: {
      totalCount: 'Int!'
    },
  }
}

const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
  connectionDirective()

const typeDefs = `
  type Dog {
    id: ID!
    name: String!
    owner: Human
  }

  type Query {
    dogs: Dog @connection
  }
`

const resolvers = {
  Query: {
    dogs: async (root, { first, after}) => {
      const res = await db.getDogs(first, after)

      return {
        edges: res,
        totalCount: res.length
      }
    }
  }
}

...
```

### Custom Connection/Edge names

It's often desirable to have multiple edge types (relationships) to the same base type. As in the example below, both the `Person` and `Cinema` types have a collection of `Film` but in each instance the context is different and we want different properties to be available on the `Edge` type. Therefore we have to create different `Edge` types to represent the relationships.

To assist with this, it is possible to override the prefix used for generated connection and edge types. Imagine this schema

```gql
type Film {
  id: ID!
  name: String!
  release: Int!
}

type Person {
  id: ID!
  name: String!
  born: Int!
  films: [Film!]
}

type Cinema {
  id: ID!
  name: String!
  nowShowing: [Film!]
}

```

We may want to add pagination to `Person.films` and `Cinema.nowShowing` but the edges representing them might be different e.g.

```gql

type Film {
  id: ID!
  name: String!
  release: Int!
}

type PersonFilmEdge {
  node: Film!
  cursor: ID!
  roles: [String!]!
  performance: Int!
}

type PersonFilmConnection {
  edges: [PersonFilmEdge!]!
  pageInfo: PageInfo
}

type Person {
  id: ID!
  name: String!
  born: Int!
  films: PersonFilmConnection
}

type CinemaFilmEdge {
  node: Film!
  cursor: ID!
  showingTimes: JSON!
  price: Int!
}

type CinemaFilmConnection {
  edges: [CinemaFilmEdge!]!
  pageInfo: PageInfo
}

type Cinema {
  id: ID!
  name: String!
  nowShowing: CinemaFilmConnection
}
```

To achieve this we can supply an override prefix to the GQL directive. We can define the additional edge properties using the same `edgeProps` option except that they are nested under the name of the custom prefix

```js
...

const typeOptionsMap = {
  Film: {
    edgeProps: {
      PersonFilm: {
        roles: '[String!]!',
        performance: 'Int!',
      },
      CinemaFilm: {
        showingTimes: 'JSON!',
        price: 'Int!',
      }
    }
  }
}

const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
  connectionDirective(typeOptionsMap)

const typeDefs = `
  type Film {
    id: ID!
    name: String!
    release: Int!
  }

  type Person {
    id: ID!
    name: String!
    born: Int!
    films: Film @connection(prefix: "PersonFilm")
  }

  type Cinema {
    id: ID!
    name: String!
    nowShowing: Film @connection(prefix: "CinemaFilm")
  }
`
...
```

### Pagination mode

For each type marked with the `@connection` directive, you're able to specify the `paginationMode`. This allows you to decide how far into the Pagination spec you wish to go. It may be that simply having the `pageInfo` object and a list of results is enough for you. For this, enable `'simple'` pagination mode, otherwise omit this property and the default `'edges'` style will be used which follows the pagination spec for edges/nodes. When in `'simple'` mode the `Edge` type is not created, instead the `edges` property is given the type of the base type decorated with `@connection` directive. [Full example](./examples/simplePaginationMode.js)

```js
  const results = [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' }
  ]

  /* simple mode response */
  {
    edges: results,
    pageInfo: {
      startCursor: 1, // Cursors are still generated depending on the cursor config
      endCursor: 2,
      ...
    }
  }

  /* edges mode response (default) */
  {
    edges: [
      {
        cursor: 1,
        node: { id: 1, name: 'foo' },
      },
      {
        cursor: 2,
        node: { id: 2, name: 'bar' },
      },
    ],
    pageInfo: {
      startCursor: 1, // Cursors are still generated depending on the cursor config
      endCursor: 2,
      ...
    }
  }
```

## API

### `connectionDirective(typeOptionsMap, directiveName)`

`connectionDirective` returns an object providing the type definition and schema transformer required to use the connection directive.

- `typeOptionsMap` - _object (optional)_ - Map of GQL types (types with the `@connection` directive) and their configuration to support the pagination process
  - `paginationMode` - _string<'simple' | 'edges'> (optional)_ - when using simple pagination mode the results array will be added to `connection.edges` without any adjustments i.e. the edge relationship will be removed and no cursor mapping will occur, cursors will still be generated for the `startCursor` and `endCursor` values.
  - `cursorPropOrFn` - _string|function(optional)_ - By default, the `id` property of an item will be used as its cursor value, however, it is recommended that cursors should be opaque string values. This option allows you to provide a different property name to use for the cursor value or a function that will be passed the item and should return a string cursor value. `encodeCursor` and `decodeCursor` functions helpers and provided to assist with this. [Full example](./examples/opaqueCursor.js)
  - connectionProps - _object(optional)_ - An object will key/values representing GQL type props that should be added to the generated connection type. Nested objects can be used to configure directives given custom names.
  - edgeProps - _object(optional)_ - An object will key/values representing GQL type props that should be added to the generated edge type. Nested objects can be used to configure directives given custom names.
- `directiveName` - _string (optional, defaults to 'connection')_ - Custom name to be used for the directive

#### Return Value

An object with the following properties

- `connectionDirectiveTypeDefs` - _string_ - GQL type definition for the connection directive. This must be included in your types
- `connectionDirectiveTransformer` - _function_ - The directive transformer function to be used to wrap your schema and generate the pagination types. _NOTE_ You must have a GraphQLSchema object to pass to the transformer function, so we recommend using `makeExecutableSchema`. However, due to the reassignment of types in the directive your resolvers should still be passed in the Mercurius options.

### encodeCursor(typeName, id)

- `typeName` - _string_ - Value of the GQL type represented by this item
- `id` - _string|number_ - Unique identifier for this item, should be serialisable to a string

#### Return Value

Base64 string to be used as a unique identifier

### decodeCursor(cursor)

- `cursor` - _string_ - Base64 string value to decode

#### Return Value

An object with the following properties

- `typeName` - _string_ - Value of the GQL type represented by this item
- `id` - _string_ - Unique identifier for this item

## `hasNextPage` Strategies

The intention of the `pageInfo.hasNextPage` property is to indicate to the consuming application whether it needs to query for subsequent pages of results. By default, this library will set this value to true if the data set returned from your resolver has the same length as the `first` argument. Depending on your use case this could be enough for you. For example, in a scenario where you're using pagination to load a large dataset and your UI does not display page numbers having another page is not a problem. However if your pagination is enabling some `Next` style UI button this would be bad as the user could click next and receive a blank page.

These are two additional strategies that can be used to generate your own `hasNextPage` value and provide it in the resolver response.

- The simplest and lowest overhead option is to simply add 1 to the received `first` value e.g. if 100 items are requested, query your DB for 101. You'll then known if 101 records are returned that there is at least 1 more page.
- A window function can be added to you SQL query to retrieve the total (remaining) records found by a query. Most DB products support window functions and with a simple count, we can retrieve the total number of records. You can then infer that if the total remaining count is greater than the request page size that there are more pages.

You can view full examples of all three strategies in [this example](./examples/hasNextPageStrategies.js)




