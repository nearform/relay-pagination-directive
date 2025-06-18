import test from 'node:test'
import { expectTypeOf } from 'expect-type'
import { GraphQLSchema } from 'graphql'
import type {
  ConnectionArgs,
  ConnectionResolverResponse,
  PAGINATION_MODE,
  encodeCursor,
  decodeCursor,
  connectionDirective
} from './core'

test('encodeCursor function type', () => {
  expectTypeOf<typeof encodeCursor>().toBeFunction()
  expectTypeOf<typeof encodeCursor>().parameter(0).toBeString()
  expectTypeOf<typeof encodeCursor>()
    .parameter(1)
    .toEqualTypeOf<string | number>()
  expectTypeOf<typeof encodeCursor>().returns.toBeString()

  // Test with concrete types
  type StringIdType = ReturnType<typeof encodeCursor>
  expectTypeOf<StringIdType>().toBeString()
})

test('decodeCursor function type', () => {
  expectTypeOf<typeof decodeCursor>().toBeFunction()
  expectTypeOf<typeof decodeCursor>().parameter(0).toBeString()
  expectTypeOf<typeof decodeCursor>().returns.toEqualTypeOf<{
    typeName: string
    id: string
  }>()
})

test('ConnectionArgs type', async t => {
  await t.test('should require first parameter and make after optional', () => {
    expectTypeOf<ConnectionArgs>().toEqualTypeOf<{
      first: number
      after?: string
    }>()

    expectTypeOf<ConnectionArgs['first']>().toBeNumber()
    expectTypeOf<ConnectionArgs['after']>().toEqualTypeOf<string | undefined>()
  })

  await t.test('should accept valid objects', () => {
    // Test with first only
    expectTypeOf<{ first: 10 }>().toMatchTypeOf<ConnectionArgs>()

    // Test with both first and after
    expectTypeOf<{
      first: 10
      after: 'cursor123'
    }>().toMatchTypeOf<ConnectionArgs>()

    // Test with undefined after
    expectTypeOf<{
      first: 5
      after: undefined
    }>().toMatchTypeOf<ConnectionArgs>()
  })

  await t.test('should not accept invalid objects', () => {
    expectTypeOf<{}>().not.toMatchTypeOf<ConnectionArgs>()
    expectTypeOf<{ after: 'cursor' }>().not.toMatchTypeOf<ConnectionArgs>()
    expectTypeOf<{ first: 'invalid' }>().not.toMatchTypeOf<ConnectionArgs>()
  })
})

test('PAGINATION_MODE enum type', async t => {
  await t.test('should have correct enum structure', () => {
    expectTypeOf<typeof PAGINATION_MODE>().toHaveProperty('SIMPLE')
    expectTypeOf<typeof PAGINATION_MODE>().toHaveProperty('EDGES')
    expectTypeOf<typeof PAGINATION_MODE.SIMPLE>().toBeString()
    expectTypeOf<typeof PAGINATION_MODE.EDGES>().toBeString()
  })

  await t.test('should be assignable to/from string literals', () => {
    type SimpleMode = typeof PAGINATION_MODE.SIMPLE
    type EdgesMode = typeof PAGINATION_MODE.EDGES
    expectTypeOf<SimpleMode>().toMatchTypeOf<'simple'>()
    expectTypeOf<EdgesMode>().toMatchTypeOf<'edges'>()
  })
})

test('ConnectionResolverResponse type', async t => {
  type User = { id: string; name: string }
  type Post = { id: number; title: string; content: string }

  await t.test('should be generic and work with different node types', () => {
    expectTypeOf<ConnectionResolverResponse<User>>().toEqualTypeOf<{
      edges: {
        cursor: string
        node: User
      }[]
      pageInfo: {
        startCursor: string
        endCursor: string
        hasPreviousPage: boolean
        hasNextPage: boolean
      }
    }>()
  })

  await t.test('should work with User type', () => {
    type UserConnection = ConnectionResolverResponse<User>

    expectTypeOf<UserConnection>().toEqualTypeOf<{
      edges: { cursor: string; node: User }[]
      pageInfo: {
        startCursor: string
        endCursor: string
        hasPreviousPage: boolean
        hasNextPage: boolean
      }
    }>()

    expectTypeOf<UserConnection['edges']>().toBeArray()
    expectTypeOf<UserConnection['edges'][0]>().toEqualTypeOf<{
      cursor: string
      node: User
    }>()
    expectTypeOf<UserConnection['pageInfo']['hasNextPage']>().toBeBoolean()
  })

  await t.test('should work with Post type', () => {
    type PostConnection = ConnectionResolverResponse<Post>

    expectTypeOf<PostConnection>().toEqualTypeOf<{
      edges: { cursor: string; node: Post }[]
      pageInfo: {
        startCursor: string
        endCursor: string
        hasPreviousPage: boolean
        hasNextPage: boolean
      }
    }>()

    expectTypeOf<PostConnection['edges'][0]['node']['id']>().toBeNumber()
    expectTypeOf<PostConnection['edges'][0]['node']['title']>().toBeString()
  })

  await t.test('should support empty edges array', () => {
    type EmptyConnection = ConnectionResolverResponse<User>

    expectTypeOf<EmptyConnection>().toEqualTypeOf<{
      edges: { cursor: string; node: User }[]
      pageInfo: {
        startCursor: string
        endCursor: string
        hasPreviousPage: boolean
        hasNextPage: boolean
      }
    }>()

    expectTypeOf<EmptyConnection['edges']>().toEqualTypeOf<
      { cursor: string; node: User }[]
    >()
  })
})

test('connectionDirective function type', async t => {
  await t.test('should be callable with no parameters', () => {
    expectTypeOf<typeof connectionDirective>().toBeFunction()

    type Result = ReturnType<typeof connectionDirective>
    expectTypeOf<Result>().toEqualTypeOf<{
      connectionDirectiveTypeDefs: string
      connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
    }>()

    expectTypeOf<Result['connectionDirectiveTypeDefs']>().toBeString()
    expectTypeOf<Result['connectionDirectiveTransformer']>().toBeFunction()
    expectTypeOf<Result['connectionDirectiveTransformer']>()
      .parameter(0)
      .toEqualTypeOf<GraphQLSchema>()
    expectTypeOf<
      Result['connectionDirectiveTransformer']
    >().returns.toEqualTypeOf<GraphQLSchema>()
  })

  await t.test('should accept connectionProperties parameter', () => {
    type MinimalConfig = {
      User: {
        paginationMode: 'simple'
        encodeCursor: boolean
      }
    }

    type FullConfig = {
      User: {
        paginationMode: 'edges'
        encodeCursor: boolean
        cursorPropOrFn: (items: unknown[]) => string
        connectionProps: Record<string, string | Record<string, string>>
        edgeProps: Record<string, string | Record<string, string>>
      }
    }

    // Test minimal config
    expectTypeOf<MinimalConfig>().toMatchTypeOf<
      Parameters<typeof connectionDirective>[0]
    >()

    // Test full config
    expectTypeOf<FullConfig>().toMatchTypeOf<
      Parameters<typeof connectionDirective>[0]
    >()
  })

  await t.test('should support cursorPropOrFn as string or function', () => {
    // Test with string
    type WithStringCursor = {
      User: {
        paginationMode: 'simple'
        encodeCursor: boolean
        cursorPropOrFn: string
      }
    }
    expectTypeOf<WithStringCursor>().toMatchTypeOf<
      Parameters<typeof connectionDirective>[0]
    >()

    // Test with function
    type WithFunctionCursor = {
      User: {
        paginationMode: 'simple'
        encodeCursor: boolean
        cursorPropOrFn: (item: unknown[]) => string
      }
    }
    expectTypeOf<WithFunctionCursor>().toMatchTypeOf<
      Parameters<typeof connectionDirective>[0]
    >()
  })

  await t.test('should support nested connectionProps and edgeProps', () => {
    type ComplexProperties = {
      User: {
        paginationMode: 'edges'
        encodeCursor: boolean
        connectionProps: {
          description: string
          metadata: { version: string }
        }
        edgeProps: {
          label: string
          config: { sortable: string }
        }
      }
    }

    expectTypeOf<ComplexProperties>().toMatchTypeOf<
      Parameters<typeof connectionDirective>[0]
    >()
  })

  await t.test('should support directiveName as second parameter', () => {
    expectTypeOf<typeof connectionDirective>().parameters.toEqualTypeOf<
      [
        connectionProperties?: Parameters<typeof connectionDirective>[0],
        directiveName?: string
      ]
    >()
  })

  await t.test('should properly type ConnectionProperties', () => {
    type ConnectionProperties = Parameters<typeof connectionDirective>[0]

    expectTypeOf<ConnectionProperties>().toEqualTypeOf<
      | {
          [typeName: string]: {
            paginationMode: 'simple' | 'edges'
            encodeCursor: boolean
            cursorPropOrFn?: string | ((item: unknown[]) => string)
            connectionProps?: Record<string, string | Record<string, string>>
            edgeProps?: Record<string, string | Record<string, string>>
          }
        }
      | undefined
    >()
  })
})
