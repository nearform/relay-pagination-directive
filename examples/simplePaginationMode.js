import pg from 'pg'
import Fastify from 'fastify'
import mercurius from 'mercurius'
import SQL from '@nearform/sql'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { connectionDirective } from '../index.js'
import { PAGINATION_MODE } from '../src/helpers.js'

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
  connectionDirective({
    People: {
      paginationMode: PAGINATION_MODE.SIMPLE
    }
  })

const typeDefs = `
  type People {
    id: ID!
    name: String!
    type: String!
  }

  type Query {
    people: [People!]! @connection
  }
`

const resolvers = {
  Query: {
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
