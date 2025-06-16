import { expectType, expectAssignable } from 'tsd'
import {
  encodeCursor,
  decodeCursor,
  ConnectionArgs,
  PAGINATION_MODE,
  ConnectionResolverResponse,
  connectionDirective
} from './core'

// Test encodeCursor function
expectType<string>(encodeCursor('User', '123'))
expectType<string>(encodeCursor('Post', 456))

// Test decodeCursor function
expectType<{ typeName: string; id: string }>(decodeCursor('abc123'))

// Test ConnectionArgs type
expectType<ConnectionArgs>({ first: 10, after: 'cursor123' })
expectType<ConnectionArgs>({ first: 5 })

// Test that after is optional
expectAssignable<ConnectionArgs>({ first: 10 })
expectAssignable<ConnectionArgs>({ first: 10, after: 'cursor' })

// ConnectionArgs constraint testing is implicit in the positive test cases above

// Test PAGINATION_MODE enum
expectType<PAGINATION_MODE>(PAGINATION_MODE.SIMPLE)
expectType<PAGINATION_MODE>(PAGINATION_MODE.EDGES)
expectType<'simple'>(PAGINATION_MODE.SIMPLE)
expectType<'edges'>(PAGINATION_MODE.EDGES)

// Test ConnectionResolverResponse type with different node types
type User = { id: string; name: string }
type Post = { id: number; title: string; content: string }

// Test basic connection response
expectType<ConnectionResolverResponse<User>>({
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

// Test with different node type
expectType<ConnectionResolverResponse<Post>>({
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

// Test empty edges array
expectAssignable<ConnectionResolverResponse<User>>({
  edges: [],
  pageInfo: {
    startCursor: 'start',
    endCursor: 'end',
    hasPreviousPage: false,
    hasNextPage: false
  }
})

// Test edge structure
expectType<{ cursor: string; node: User }>({
  cursor: 'test',
  node: { id: '1', name: 'Test' }
})

// Test pageInfo structure
expectType<{
  startCursor: string
  endCursor: string
  hasPreviousPage: boolean
  hasNextPage: boolean
}>({
  startCursor: 'start',
  endCursor: 'end',
  hasPreviousPage: true,
  hasNextPage: false
})

// Test connectionDirective function with no parameters
expectType<{
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: any) => any
}>(connectionDirective())

// Test connectionDirective with only connectionProperties
expectType<{
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: any) => any
}>(
  connectionDirective({
    User: {
      paginationMode: 'simple',
      encodeCursor: true
    }
  })
)

// Test connectionDirective with both parameters
expectType<{
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: any) => any
}>(
  connectionDirective(
    {
      User: {
        paginationMode: 'simple',
        encodeCursor: true,
        cursorPropOrFn: 'id',
        connectionProps: { description: 'User connection' },
        edgeProps: { description: 'User edge' }
      },
      Post: {
        paginationMode: 'edges',
        encodeCursor: false,
        cursorPropOrFn: (item: unknown[]) => 'custom-cursor'
      }
    },
    'customPagination'
  )
)

// Test ConnectionProperties type constraints
expectAssignable<Parameters<typeof connectionDirective>[0]>({
  User: {
    paginationMode: 'simple',
    encodeCursor: true
  },
  Post: {
    paginationMode: 'edges',
    encodeCursor: false
  }
})

// Test cursorPropOrFn as string
expectAssignable<Parameters<typeof connectionDirective>[0]>({
  User: {
    paginationMode: 'simple',
    encodeCursor: true,
    cursorPropOrFn: 'id'
  }
})

// Test cursorPropOrFn as function
expectAssignable<Parameters<typeof connectionDirective>[0]>({
  User: {
    paginationMode: 'simple',
    encodeCursor: true,
    cursorPropOrFn: (item: unknown[]) => `cursor_${item.length}`
  }
})

// Test nested connectionProps and edgeProps
expectAssignable<Parameters<typeof connectionDirective>[0]>({
  User: {
    paginationMode: 'simple',
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

// Test directiveName parameter
expectType<{
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: any) => any
}>(connectionDirective(undefined, 'myPagination'))

// Test with all optional connection properties
expectAssignable<Parameters<typeof connectionDirective>[0]>({
  ComplexType: {
    paginationMode: 'edges',
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

// Test that GraphQLSchema type is properly imported and used
import type { GraphQLSchema } from 'graphql'
expectType<(schema: GraphQLSchema) => GraphQLSchema>(
  connectionDirective().connectionDirectiveTransformer
)
