import type { GraphQLSchema } from 'graphql'
import { expect, test, describe } from 'tstyche'
import {
  encodeCursor,
  decodeCursor,
  PAGINATION_MODE,
  connectionDirective
} from 'relay-pagination-directive'
import type {
  ConnectionArgs,
  ConnectionResolverResponse
} from 'relay-pagination-directive'

describe('encodeCursor function', () => {
  test('should return string for string id', () => {
    expect(encodeCursor('User', '123')).type.toBe<string>()
  })

  test('should return string for number id', () => {
    expect(encodeCursor('Post', 456)).type.toBe<string>()
  })
})

describe('decodeCursor function', () => {
  test('should return object with typeName and id', () => {
    expect(decodeCursor('abc123')).type.toBe<{ typeName: string; id: string }>()
  })
})

describe('ConnectionArgs type', () => {
  test('should accept first and after properties', () => {
    expect<ConnectionArgs>().type.toBeAssignableFrom({
      first: 10,
      after: 'cursor123'
    })
  })

  test('should accept only first property', () => {
    expect<ConnectionArgs>().type.toBeAssignableFrom({ first: 5 })
  })
})

describe('PAGINATION_MODE enum', () => {
  test('should be assignable to PAGINATION_MODE type', () => {
    expect(PAGINATION_MODE.SIMPLE).type.toBeAssignableTo<PAGINATION_MODE>()
    expect(PAGINATION_MODE.EDGES).type.toBeAssignableTo<PAGINATION_MODE>()
  })

  test('should match expected string values', () => {
    expect(PAGINATION_MODE.SIMPLE).type.toBeAssignableTo<'simple'>()
    expect(PAGINATION_MODE.EDGES).type.toBeAssignableTo<'edges'>()
  })
})

describe('ConnectionResolverResponse type', () => {
  type User = { id: string; name: string }
  type Post = { id: number; title: string; content: string }

  test('should accept basic connection response with User type', () => {
    expect<ConnectionResolverResponse<User>>().type.toBe({
      edges: [
        {
          cursor: 'cursor1',
          node: { id: '1', name: 'John' }
        },
        {
          cursor: 'cursor2',
          node: { id: '2', name: 'Jane' }
        }
      ],
      pageInfo: {
        startCursor: 'cursor1',
        endCursor: 'cursor2',
        hasPreviousPage: false,
        hasNextPage: true
      }
    })
  })

  test('should accept connection response with Post type', () => {
    expect<ConnectionResolverResponse<Post>>().type.toBe({
      edges: [
        {
          cursor: 'post1',
          node: { id: 1, title: 'Hello', content: 'World' }
        }
      ],
      pageInfo: {
        startCursor: 'post1',
        endCursor: 'post1',
        hasPreviousPage: false,
        hasNextPage: false
      }
    })
  })

  test('should accept empty edges array', () => {
    expect<ConnectionResolverResponse<User>>().type.toBeAssignableFrom({
      edges: [],
      pageInfo: {
        startCursor: 'start',
        endCursor: 'end',
        hasPreviousPage: false,
        hasNextPage: false
      }
    })
  })
})

describe('connectionDirective function', () => {
  test('should return correct type with no parameters', () => {
    expect(connectionDirective()).type.toBe<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
    }>()
  })

  test('should return correct type with only connectionProperties', () => {
    expect(
      connectionDirective({
        User: {
          paginationMode: 'simple' as const,
          encodeCursor: true
        }
      })
    ).type.toBe<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
    }>()
  })

  test('should return correct type with both parameters', () => {
    expect(
      connectionDirective(
        {
          User: {
            paginationMode: 'simple' as const,
            encodeCursor: true,
            cursorPropOrFn: 'id',
            connectionProps: { description: 'User connection' },
            edgeProps: { description: 'User edge' }
          },
          Post: {
            paginationMode: 'edges' as const,
            encodeCursor: false,
            cursorPropOrFn: (item: unknown[]) => 'custom-cursor'
          }
        },
        'customPagination'
      )
    ).type.toBe<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
    }>()
  })
})

describe('ConnectionProperties type constraints', () => {
  test('should accept basic connection properties', () => {
    expect(connectionDirective).type.toBeCallableWith({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true
      },
      Post: {
        paginationMode: 'edges' as const,
        encodeCursor: false
      }
    })
  })

  test('should accept cursorPropOrFn as string', () => {
    expect(connectionDirective).type.toBeCallableWith({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true,
        cursorPropOrFn: 'id'
      }
    })
  })

  test('should accept cursorPropOrFn as function', () => {
    expect(connectionDirective).type.toBeCallableWith({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true,
        cursorPropOrFn: (item: unknown[]) => `cursor_${item.length}`
      }
    })
  })

  test('should accept nested connectionProps and edgeProps', () => {
    expect(connectionDirective).type.toBeCallableWith({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true,
        connectionProps: {
          description: 'A user connection',
          metadata: { version: '1.0' }
        },
        edgeProps: {
          label: 'user edge',
          config: { sortable: 'true' }
        }
      }
    })
  })

  test('should accept directiveName parameter', () => {
    expect(connectionDirective).type.toBeCallableWith(undefined, 'myPagination')
  })

  test('should accept all optional connection properties', () => {
    expect(connectionDirective).type.toBeCallableWith({
      ComplexType: {
        paginationMode: 'edges' as const,
        encodeCursor: true,
        cursorPropOrFn: (items: unknown[]) => `items_${items.length}`,
        connectionProps: {
          description: 'Complex connection',
          nested: { deep: 'value' }
        },
        edgeProps: {
          weight: 'heavy',
          metadata: { importance: 'high' }
        }
      }
    })
  })
})
