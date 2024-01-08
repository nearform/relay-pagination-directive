# relay-pagination

This library provides a GQL directive to more easily implement pagination based on the Relay implementation. The directive options allow you to decide how far you wish to go towards full [specification compliant pagination](https://relay.dev/graphql/connections.htm) as often full compliance can add overhead which may not be required in your application.

## Install

```
yarn add relay-pagination
# or
npm i relay-pagination
# or
pnpm add relay-pagination
```

## Usage

### GQL Directive

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

All of the generated types will only be created if they don't already exist. If you wish to provide a different definition for any type add it to your type definitions before passing them to the directive transformer.

By default, any array of results from a resolver will be wrapped in `Connection` and `Edge` objects to satisfy the updated schema. Options for this and more are detailed in the API section

The `connectionFromArray` function will attempt to interpret values for `hasNextPage` and `hasPreviousPage` but these can also be passed to the function if you have better information. By default, it will look for an `id` property on the supplied objects to use as the cursor value. This can also be customised, see the API section for full details.

### Custom Connection names

It's often desirable to have multiple edge types (relationships) to the same base type. To assist with this it's possible to override the prefix used for generated connection and edge types. Imagine this schema

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
  films: Film @connection(prefix: "PersonFilm")
}

type Cinema {
  id: ID!
  name: String!
  nowShowing: Film @connection(prefix: "CinemaFilm")
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

To achieve this we can supply an override prefix to the GQL directive. The additional edge properties can be nested in the `edgeProps` option under the name of the custom prefix

```js
"use strict";

const Fastify = require("fastify");
const mercurius = require("..");
const { connectionDirective } = require('relay-pagination')

const app = Fastify();

const typeOptionsMap = {
  Film: {
    paginationMode: 'edges',
    edgeProps: {
      PersonFilm: {
        roles: '[String!]!',
        performance: 'Int!',
      }
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
`;

const resolvers = {
  Query: {
    ...
  },
  Person: {
    films: async (root, { first, after }) => {
      return db.getPersonFilms(root.id, { first, after })
    }
  },
  Cinema: {
    films: async (root, { first, after }) => {
      return db.getPersonFilms(root.id, { first, after })
    }
  }
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

### Resolver Response

By default, any field marked with the `@connection` directive will have its resolver wrapped. This wrapper will await the result of your original resolver and perform the following depending on the result type it receives.

- If given an array it will treat this as the `edges` value and continue to create the connection and edges objects. Edges will be created depending on the `paginationMode` selected.
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

### Pagination mode

For each type marked with the `@connection` directive, you're able to specify the `paginationMode`. This allows you to decide how far into the Pagination spec you wish to go. It may be that simply having the `pageInfo` object and a list of results is enough for you. For this, enable `'simple'` pagination mode, otherwise omit this property and the default `'edges'` style will be used which follows the pagination spec for edges/nodes.

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

### `connectionDirective(connectionProperties, directiveName)`

`connectionDirective` returns an object providing the type definition and schema transformer required to use the connection directive.

- `connectionProperties` - _object (optional)_ - Map of GQL types (types with the `@connection` directive) and their configuration to support the pagination process
  - `paginationMode` - _string<'simple' | 'edges'> (optional)_ - when using simple pagination mode the results array will be added to `connection.edges` without any adjustments i.e. the edge relationship will be removed and no cursor mapping will occur, cursors will still be generated for the `startCursor` and `endCursor` values.
  - `cursor` - _string|function(optional)_ - By default the `id` property of an item will be used as its cursor value, however, it is recommended that cursors should be opaque string values. This option allows you to provide a different property name to use for the cursor value or a function that will be passed the item and should return a string cursor value. `encodeCursor` and `decodeCursor` functions helpers and provided to assist with this
  - connectionProps - _object(optional)_ - An object will key/values representing GQL type props that should be added to the generated connection type. Nested objects can be used to configure directives given custom names.
  - edgeProps - _object(optional)_ - An object will key/values representing GQL type props that should be added to the generated edge type. Nested objects can be used to configure directives given custom names.
- `directiveName` - _string (optional, defaults to 'connection')_ - Custom name to be used for the directive

#### Return Value

An object with the following properties

- `connectionDirectiveTypeDefs` - _string_ - GQL type definition for the connection directive. This must be included in your types
- `connectionDirectiveTransformer` - _function_ - The directive transformer function to be used to wrap your schema and generate the pagination types. _NOTE_ You must have a GraphQLSchema object to pass to the transformer function, so we recommend using `makeExecutableSchema`. However, due to the reassignment of types in the directive your resolvers should still be passed in the Mercurius options.

### connectionFromArray(arrayItems, connectionArgs, cursorPropOrFn)

- `arrayItems` - _any[]_ - The list of items that resolve the user's request
- `connectionArgs` - _object_ - Options to customise the connection/edge objects
  - `first` - _number_ - The size of the page requested by the user
  - `after` - _string|number(optional)_ - The `after` value supplied by the user. This should be the cursor value of the last edge in the previous page.
  - `hasNextPage` - _boolean(optional)_ - By default the value will be true if the length of the array matches the requested `first` value. You can supply a specific value here if you have better information.
  - `hasPreviousPage` - _boolean(optional)_ - By default this value will be true if an `after` value is supplied. You can supply a specific value here if you have better information.
  - `edgeProps` - _string[](optional)_ - A list of properties that should be moved from the array items to their corresponding edge. This can be useful when modeling relationships between objects and your resolver is returning a flattened list of objects e.g. from a SQL query
  - `connectionMeta` - _object(optional)_ - An object that will be merged into the `Connection` object in the response. This can be useful for including additional meta data such as a `totalCount` field.
- `cursorPropOrFn` - _string|function(optional)_ - By default the `id` property of an item will be used as its cursor value, however, it is recommended that cursors should be opaque string values. This option allows you to provide a different property name to use for the cursor value or a function that will be passed the item and should return a string cursor value. `encodeCursor` and `decodeCursor` functions helpers and provided to assist with this

#### Return Value

An object matching the Connection/Edge specification with any customisations provided.

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

The intention of the `pageInfo.hasNextPage` property is to indicate to the consuming application whether it needs to query for subsequent pages of results. By default, this library will set this value to true if the data set returned from your resolver has the same length as the `first` argument. This is fairly effective, as `first`, or page size values, are usually consistent round numbers and datasets often aren't so the last page in a set will be partially full. In cases where the page size value divides the dataset exactly the consumer will make one additional request which will receive 0 results.

Here are additional strategies to help resolve this issue.

- The simplest and lowest overhead option is to simply add 1 to the received `first` value e.g. if 100 items are requested, query your DB for 101. This way the result set will be larger than the request length of items and we'll know there's at least 1 more record.
- Use a window query to retrieve the total records found by a query. Most DB products support window functions and with a simple count, we can retrieve the total number of records. We can then examine the total number of records. *NOTE* This will be a 'total count of records remaining'. It will only be the full count of records on the first page of a request as subsequent pages will include a where clause for the `after`

```sql
-- 1st page query
select
	*,
	COUNT(*) over () as total_count -- Total records
from items
order by id desc
limit 10

-- 2nd page query
select
	*,
	COUNT(*) over () as total_count -- Remaining records
from items
where id < 752
order by id desc
limit 10
```




