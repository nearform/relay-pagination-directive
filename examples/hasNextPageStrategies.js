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

const typeConnectionMap = {
  Film: {
    edgeProps: {
      PeopleFilm: { roles: '[String!]!', performance: 'Int!' },
    },
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

  type Query {
    people: [People!]! @connection
    films: [Film!]! @connection
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

      // Basic usage where we allow the library to determine
      // 'hasNextPage' values based on the requested page size
      // and the dataset returned
      return res.rows
    },
    films: async (root, { first, after }) => {
      const query = SQL`
        select
          *,
          count(*) over () as remaining_count
        from films
        ${ after ? SQL`where id > ${after}` : SQL``}
        order by id
        limit ${first}`
      const res = await pool.query(query.text, query.values)

      // Using a window function we can retrieve the remaining
      // rows and compare this to the requested page size
      // to provide an accurate hasNextPage value
      return {
        edges: res.rows,
        pageInfo: {
          hasNextPage: res.rows?.[0].remaining_count > first
        }
      }
    },
  },
  People: {
    films: async (root, { first, after }) => {
      const query = SQL`
        select pf.roles, pf.performance, pf.rel_type, f.*
        from people_films pf
        join films f on f.id = pf.film_id
        where pf.people_id = ${root.id}
        ${ after ? SQL`and f.id > ${after}` : SQL``}
        order by f.id
        limit ${first + 1}`
      const res = await pool.query(query.text, query.values)

      // Here we +1 to the first value. This causes us to provide
      // 1 more value than requested to the response formatter.
      // The request response will only include the request number
      // of records but we can determine there is another page by
      // comparing the dataset length with the users `first` value
      return {
        edges: res.rows,
        pageInfo: {
          hasNextPage: res.rows.length > first
        }
      }
    },
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
