import { expect, test, describe } from 'tstyche'
import {
  encodeCursor,
  decodeCursor,
  PAGINATION_MODE,
  connectionDirective
} from './core.js'
import type { ConnectionArgs, ConnectionResolverResponse } from './core.js'

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
    expect({
      first: 10,
      after: 'cursor123'
    }).type.toBeAssignableTo<ConnectionArgs>()
  })

  test('should accept only first property', () => {
    expect({ first: 5 }).type.toBeAssignableTo<ConnectionArgs>()
  })

  test('should accept first with optional after', () => {
    expect({ first: 10 }).type.toBeAssignableTo<ConnectionArgs>()
    expect({
      first: 10,
      after: 'cursor'
    }).type.toBeAssignableTo<ConnectionArgs>()
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
    expect({
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
    }).type.toBeAssignableTo<ConnectionResolverResponse<User>>()
  })

  test('should accept connection response with Post type', () => {
    expect({
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
    }).type.toBeAssignableTo<ConnectionResolverResponse<Post>>()
  })

  test('should accept empty edges array', () => {
    expect({
      edges: [],
      pageInfo: {
        startCursor: 'start',
        endCursor: 'end',
        hasPreviousPage: false,
        hasNextPage: false
      }
    }).type.toBeAssignableTo<ConnectionResolverResponse<User>>()
  })

  test('should validate edge structure', () => {
    expect({
      cursor: 'test',
      node: { id: '1', name: 'Test' }
    }).type.toBe<{ cursor: string; node: User }>()
  })

  test('should validate pageInfo structure', () => {
    expect({
      startCursor: 'start',
      endCursor: 'end',
      hasPreviousPage: true,
      hasNextPage: false
    }).type.toBeAssignableTo<{
      startCursor: string
      endCursor: string
      hasPreviousPage: boolean
      hasNextPage: boolean
    }>()
  })
})

describe('connectionDirective function', () => {
  test('should return correct type with no parameters', () => {
    expect(connectionDirective()).type.toBeAssignableTo<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: any) => any
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
    ).type.toBeAssignableTo<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: any) => any
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
    ).type.toBeAssignableTo<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: any) => any
    }>()
  })
})

describe('ConnectionProperties type constraints', () => {
  test('should accept basic connection properties', () => {
    expect({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true
      },
      Post: {
        paginationMode: 'edges' as const,
        encodeCursor: false
      }
    }).type.toBeAssignableTo<Parameters<typeof connectionDirective>[0]>()
  })

  test('should accept cursorPropOrFn as string', () => {
    expect({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true,
        cursorPropOrFn: 'id'
      }
    }).type.toBeAssignableTo<Parameters<typeof connectionDirective>[0]>()
  })

  test('should accept cursorPropOrFn as function', () => {
    expect({
      User: {
        paginationMode: 'simple' as const,
        encodeCursor: true,
        cursorPropOrFn: (item: unknown[]) => `cursor_${item.length}`
      }
    }).type.toBeAssignableTo<Parameters<typeof connectionDirective>[0]>()
  })

  test('should accept nested connectionProps and edgeProps', () => {
    expect({
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
    }).type.toBeAssignableTo<Parameters<typeof connectionDirective>[0]>()
  })

  test('should accept directiveName parameter', () => {
    expect(
      connectionDirective(undefined, 'myPagination')
    ).type.toBeAssignableTo<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: any) => any
    }>()
  })

  test('should accept all optional connection properties', () => {
    expect({
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
    }).type.toBeAssignableTo<Parameters<typeof connectionDirective>[0]>()
  })
})
