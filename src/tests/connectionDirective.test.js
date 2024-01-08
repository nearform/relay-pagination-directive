import fastify from 'fastify'
import mercurius from 'mercurius'
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { connectionDirective } from '../connectionDirective.js'
import { z } from 'zod'

const getServer = async (schema, resolvers) => {
  const app = fastify({ logger: false })

  await app.register(mercurius, {
    schema,
    resolvers,
  })

  return app
}

const people = [
  {
    id: 1,
    name: 'Tom Hanks',
    type: 'Actor',
  },
]

const typeDefs = `
  type Person {
    id: ID!
    name: String!
  }

  type Query {
    people: Person! @connection
    person(id: ID!): Person
  }
`

const resolvers = {
  Query: {
    people: () => {
      return people.slice()
    },
  },
}

test('default directive name', async () => {
  const { connectionDirectiveTypeDefs } = connectionDirective()

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, typeDefs],
  })

  const server = await getServer(schema, resolvers)

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            directives {
              name
            }
          }
        }
      `,
    }),
  })

  const directiveNames = res.json().data['__schema'].directives.map(d => d.name)

  assert.ok(directiveNames.includes('connection'))
})

test('custom directive name', async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
    }

    type Query {
      people: Person! @myDirective
    }
  `

  const { connectionDirectiveTypeDefs } = connectionDirective(undefined, 'myDirective')

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
  })

  const server = await getServer(schema, resolvers)

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            directives {
              name
            }
          }
        }
      `,
    }),
  })

  const directiveNames = res.json().data['__schema'].directives.map(d => d.name)

  assert.ok(directiveNames.includes('myDirective'))
})

test('adds types for connection pattern', async () => {
  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective()

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, typeDefs],
  })

  const server = await getServer(
    connectionDirectiveTransformer(schema),
    resolvers,
  )

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `,
    }),
  })

  const typeNames = res.json().data['__schema'].types.map(t => t.name)

  assert.ok(typeNames.includes('PageInfo'))
  assert.ok(typeNames.includes('Person'))
  assert.ok(typeNames.includes('PersonConnection'))
  assert.ok(typeNames.includes('PersonEdge'))
})

test('updates the return type for tagged fields', async () => {
  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective()

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, typeDefs],
  })

  const server = await getServer(
    connectionDirectiveTransformer(schema),
    resolvers,
  )

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __type (name: "Query") {
            fields {
              name
              type {
                ofType {
                  name
                }
              }
            }
          }
        }
      `,
    }),
  })

  const peopleQuery = res
    .json()
    .data['__type'].fields.find(f => f.name === 'people')

  assert.equal(peopleQuery.type.ofType.name, 'PersonConnection')
})

test('updates the query to include connection arguments', async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
    }

    type Query {
      people(type: String!): Person! @connection
    }
  `

  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective()

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
  })

  const server = await getServer(
    connectionDirectiveTransformer(schema),
    resolvers,
  )

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __type (name: "Query") {
            fields {
              name
              args {
                name
              }
            }
          }
        }
      `,
    }),
  })

  const peopleQuery = res
    .json()
    .data['__type'].fields.find(f => f.name === 'people')

  assert.deepEqual(peopleQuery.args, [
    { name: 'type' },
    { name: 'first' },
    { name: 'after' },
  ])
})

test("doesn't add types when they're added by the user", async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
    }

    type PageInfo {
      startCursor: String
      endCursor: String
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
    }

    type PersonConnection {
      edges: [Person!]!
      pageInfo: PageInfo
      foo: String
    }

    type Query {
      people: Person! @connection
    }
  `

  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective()

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
  })

  const server = await getServer(
    connectionDirectiveTransformer(schema),
    resolvers,
  )

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            types {
              name
              fields {
                name
              }
            }
          }
        }
      `,
    }),
  })

  const personConnection = res
    .json()
    .data['__schema'].types.find(t => t.name === 'PersonConnection')

  assert.ok(personConnection)
  const connectionFields = personConnection.fields.map(f => f.name)
  assert.ok(connectionFields.includes('edges'))
  assert.ok(connectionFields.includes('pageInfo'))
  assert.ok(connectionFields.includes('foo'))
})

test('allows custom connection properties', async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
    }

    type Film {
      id: ID!
      name: String!
      released: Int!
    }

    type Query {
      people: Person! @connection
      films: Film! @connection
    }
  `

  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective({
      Person: {
        connectionProps: {
          totalCount: 'Int!',
        }
      },
    })

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
  })

  const server = await getServer(
    connectionDirectiveTransformer(schema),
    resolvers,
  )

  const res = await server.inject({
    method: 'POST',
    url: '/graphql',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          __schema {
            types {
              name
              fields {
                name
              }
            }
          }
        }
      `,
    }),
  })

  const { data } = res.json()

  const personConnection = data['__schema'].types.find(
    t => t.name === 'PersonConnection',
  )
  const filmConnection = data['__schema'].types.find(
    t => t.name === 'FilmConnection',
  )

  assert.ok(personConnection.fields.map(f => f.name).includes('totalCount'))
  assert.ok(!filmConnection.fields.map(f => f.name).includes('totalCount'))
})

test('options validation', () => {

})
