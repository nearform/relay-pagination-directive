import pg from 'pg'
import Fastify from 'fastify'
import mercurius from 'mercurius'
import SQL from '@nearform/sql'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { connectionDirective, encodeCursor, decodeCursor } from '../index.js'

const app = Fastify({
  logger: true
})

const pool = new pg.Pool({
  host: 'localhost',
  post: '5432',
  user: 'docker',
  database: 'test_db',
})

const typeConnectionMap = {
  Film: {
    cursorPropOrFn: (val) => encodeCursor('Film', val.id),
  },
  People: {
    cursorPropOrFn: (val) => encodeCursor('People', val.id),
  },
}

const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
  connectionDirective(typeConnectionMap)

const typeDefs = `
  type People {
    id: ID!
    name: String!
    type: String!
    films: [Film!]! @connection(prefix: "PeopleFilm")
  }

  type Film {
    id: ID!
    name: String!
    released: Int!
  }

  union AllTypes = People | Film

  type Query {
    people: [People!]! @connection
    films: [Film!]! @connection
    node(cursor: ID!): AllTypes
  }
`

const resolvers = {
  Query: {
    films: async (root, { first, after }) => {
      let afterId
      if (after) {
        const { id } = decodeCursor(after)
        after = id
      }
      const query = SQL`
        select *
        from films
        ${ afterId ? SQL`where id > ${afterId}` : SQL``}
        order by id
        limit ${first + 1}`

      const res = await pool.query(query.text, query.values)

      return {
        edges: res.rows,
        pageInfo: {
          hasNextPage: res.rows.length > first
        }
      }
    },
    /*
      Using globally unique cursors allows us to implement a generic
      node look up interface
    */
    node: async (root, { cursor }) => {
      let tableName
      const { typeName, id } = decodeCursor(cursor)
      switch (typeName) {
        case 'Film':
          tableName = 'films'
          break
        case 'People':
          tableName = 'people'
          break
      }

      const query = SQL`
        select *, ${typeName} as type_name
        from ${SQL.quoteIdent(tableName)}
        where id = ${id}
      `

      const res = await pool.query(query.text, query.values)

      return res.rows?.[0]
    },
  },
  AllTypes: {
    __resolveType: (obj) => {
      return obj.type_name && obj.type_name
    }
  },
}

const schema = makeExecutableSchema({
  typeDefs: [connectionDirectiveTypeDefs, typeDefs],
  resolvers,
})

const connectionSchema = connectionDirectiveTransformer(schema)

app.register(mercurius, {
  schema: connectionSchema,
  graphiql: true,
})

await app.listen({ port: 3000 })
