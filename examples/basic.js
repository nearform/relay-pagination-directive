import pg from 'pg'
import Fastify from 'fastify'
import mercurius from 'mercurius'
import SQL from '@nearform/sql'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { connectionDirective } from '../index.js'

const app = Fastify({
  logger: true
})

const pool = new pg.Pool({
  host: 'localhost',
  post: '5432',
  user: 'docker',
  database: 'test_db',
})

const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
  connectionDirective()

const typeDefs = `
  type People {
    id: ID!
    name: String!
    type: String!
  }

  type Film {
    id: ID!
    name: String!
    released: Int!
  }

  type Query {
    films: [Film!]! @connection
    people: [People!]! @connection
  }
`

const resolvers = {
  Query: {
    films: async (root, { first, after }) => {
      const query = SQL`
        select *
        from films
        ${ after ? SQL`where id > ${after}` : SQL``}
        order by id
        limit ${first}`

      const res = await pool.query(query.text, query.values)

      return res.rows
    },
    people: async (root, { first, after }) => {
      const query = SQL`
        select *
        from people
        ${ after ? SQL`where id > ${after}` : SQL``}
        order by id
        limit ${first}`

      const res = await pool.query(query.text, query.values)

      return res.rows
    },
  }
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
