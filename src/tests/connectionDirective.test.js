import fastify from 'fastify'
import mercurius from 'mercurius'
import test from 'node:test'
import assert from 'node:assert/strict'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { connectionDirective } from '../connectionDirective.js'
import { z } from 'zod'
import { PAGINATION_MODE } from '../helpers.js'

const getServer = async schema => {
  const app = fastify({ logger: false })

  await app.register(mercurius, {
    schema,
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
    resolvers,
  })

  const server = await getServer(schema)

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

  const { connectionDirectiveTypeDefs } = connectionDirective(
    undefined,
    'myDirective',
  )

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
    resolvers,
  })

  const server = await getServer(schema)

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
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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

test("doesn't add edge types when in simple mode", async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
    }

    type Query {
      people: Person! @connection
    }
  `

  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective({
      Person: {
        paginationMode: PAGINATION_MODE.SIMPLE,
      },
    })

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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
                type {
                  ofType {
                    ofType {
                      ofType {
                        name
                      }
                    }
                  }
                }
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

  const personEdge = res
    .json()
    .data['__schema'].types.find(t => t.name === 'PersonEdge')

  assert.ok(personConnection)
  assert.ok(!personEdge)
  const edgeType = personConnection.fields.find(f => f.name === 'edges')?.type
    .ofType.ofType.ofType.name
  assert.equal(edgeType, 'Person')
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
        },
      },
    })

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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

test('custom prefix', async () => {
  const customTypeDefs = `
    type Person {
      id: ID!
      name: String!
      films: Film @connection(prefix: "PersonFilm")
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
        },
      },
      Film: {
        edgeProps: {
          PersonFilm: {
            roles: '[String!]!',
          },
        },
      },
    })

  const schema = makeExecutableSchema({
    typeDefs: [connectionDirectiveTypeDefs, customTypeDefs],
    resolvers,
  })

  const server = await getServer(connectionDirectiveTransformer(schema))

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

  const filmEdge = data['__schema'].types.find(t => t.name === 'FilmEdge')
  const personFilmConnection = data['__schema'].types.find(
    t => t.name === 'PersonFilmConnection',
  )
  const personFilmEdge = data['__schema'].types.find(
    t => t.name === 'PersonFilmEdge',
  )

  assert.ok(personFilmConnection)
  assert.ok(personFilmEdge.fields.map(f => f.name).includes('roles'))
  assert.ok(!filmEdge.fields.map(f => f.name).includes('roles'))
})

test('options validation', async t => {
  await t.test('invalid pagination mode', t => {
    return assert.throws(() =>
      connectionDirective({
        foo: {
          paginationMode: 'bar',
        },
      }),
    )
  })

  await t.test('invalid edge props', t => {
    return assert.throws(() =>
      connectionDirective({
        foo: {
          edgeProps: {
            fooLink: ['bar'],
          },
        },
      }),
    )
  })

  await t.test('invalid connection props', async t => {
    await assert.throws(() =>
      connectionDirective({
        foo: {
          connectionProps: ['bar'],
        },
      }),
    )

    await assert.throws(() =>
      connectionDirective({
        foo: {
          connectionProps: {
            fooLink: ['bar'],
          },
        },
      }),
    )
  })

  await t.test('valid options', async t => {
    assert.ok(() =>
      connectionDirective({
        foo: {
          paginationMode: 'edges',
          cursor: val => 'cursor:' + val.id,
          connectionProps: {
            totalCount: 'Int!',
            FooLink: {
              bar: 'Int',
            },
          },
          edgeProps: {
            relationship: 'String!',
            FooLink: {
              type: 'String!',
            },
          },
        },
      }),
    )
  })
})

test('response formatting', async t => {
  const { connectionDirectiveTypeDefs, connectionDirectiveTransformer } =
    connectionDirective({
      Person: {
        connectionProps: {
          totalCount: 'Int',
        },
        edgeProps: {
          roles: '[String!]',
        },
      },
    })

  await t.test('invalid resolver response', async t => {
    const customResolvers = {
      Query: {
        people: () => {
          return 'foobar'
        },
      },
    }
    const schema = makeExecutableSchema({
      typeDefs: [connectionDirectiveTypeDefs, typeDefs],
      resolvers: customResolvers,
    })

    const server = await getServer(connectionDirectiveTransformer(schema))

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            people(first: 1) {
              edges {
                cursor
                node {
                  id
                  name
                }
              }
              pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `,
      }),
    })
    const { data, errors } = res.json()
    assert.equal(data, null)
    assert.equal(
      errors?.[0].message,
      'Connection responses must be an array or object',
    )
  })
  await t.test('when returning an array from the resolver', async t => {
    const schema = makeExecutableSchema({
      typeDefs: [connectionDirectiveTypeDefs, typeDefs],
      resolvers,
    })

    const server = await getServer(connectionDirectiveTransformer(schema))

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            people(first: 1) {
              edges {
                cursor
                node {
                  id
                  name
                }
              }
              pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `,
      }),
    })

    assert.deepEqual(res.json(), {
      data: {
        people: {
          edges: [
            {
              cursor: '1',
              node: {
                id: '1',
                name: 'Tom Hanks',
              },
            },
          ],
          pageInfo: {
            endCursor: '1',
            hasNextPage: true,
            hasPreviousPage: false,
            startCursor: '1',
          },
        },
      },
    })
  })

  await t.test('when returning an object from the resolver', async t => {
    const customResolvers = {
      Query: {
        people: () => {
          return {
            edges: people.slice().map(p => ({
              ...p,
              roles: ['foobar'],
            })),
            totalCount: 3,
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: true,
            },
          }
        },
      },
    }

    const schema = makeExecutableSchema({
      typeDefs: [connectionDirectiveTypeDefs, typeDefs],
      resolvers: customResolvers,
    })

    const server = await getServer(connectionDirectiveTransformer(schema))

    const res = await server.inject({
      method: 'POST',
      url: '/graphql',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            people(first: 1) {
              totalCount
              edges {
                cursor
                node {
                  id
                  name
                }
                roles
              }
              pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `,
      }),
    })

    assert.deepEqual(res.json(), {
      data: {
        people: {
          totalCount: 3,
          edges: [
            {
              cursor: '1',
              roles: ['foobar'],
              node: {
                id: '1',
                name: 'Tom Hanks',
              },
            },
          ],
          pageInfo: {
            endCursor: '1',
            hasNextPage: true,
            hasPreviousPage: true,
            startCursor: '1',
          },
        },
      },
    })
  })
})
