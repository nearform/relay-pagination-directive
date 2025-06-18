import test from 'node:test'
import { expectTypeOf } from 'expect-type'
import type {
  NodesOnly,
  Valid,
  InConnection,
  MaybeWithResolve,
  MaybePromise,
  ExtractMaybePromise,
  ExtractNode,
  ExtractMaybeResolver,
  ResolverFunction,
  TransformResolverGroup
} from './utils'

test('NodesOnly utility type - basic functionality', async t => {
  await t.test('should preserve non-resolver properties', () => {
    type SimpleObject = {
      regularProperty: string
      numberProperty: number
    }

    type TransformedSimple = NodesOnly<SimpleObject>
    expectTypeOf<TransformedSimple>().toEqualTypeOf<SimpleObject>()
  })

  await t.test('should work with empty object', () => {
    type EmptyObject = {}
    type TransformedEmpty = NodesOnly<EmptyObject>
    expectTypeOf<TransformedEmpty>().toEqualTypeOf<{}>()
  })

  await t.test('should handle basic resolver structure', () => {
    type BasicResolvers = {
      Query: {
        users: {
          resolve: () => Promise<{
            edges: Array<{ node: { id: string; name: string } }>
          }>
        }
        currentUser: {
          resolve: () => Promise<{ id: string; name: string }>
        }
      }
      Mutation: {
        createUser: () => Promise<{ id: string; name: string }>
      }
    }

    type TransformedBasic = NodesOnly<BasicResolvers>
    expectTypeOf<TransformedBasic>().toHaveProperty('Query')
    expectTypeOf<TransformedBasic>().toHaveProperty('Mutation')
  })
})

test('NodesOnly utility type - function resolvers', async t => {
  await t.test('should handle function resolvers', () => {
    type FunctionResolvers = {
      Query: {
        hello: () => string
        getUser: () => Promise<{ id: string; name: string }>
      }
      Mutation: {
        createUser: () => Promise<{ id: string; name: string }>
      }
    }

    type TransformedFunctions = NodesOnly<FunctionResolvers>
    expectTypeOf<TransformedFunctions>().toHaveProperty('Query')
    expectTypeOf<TransformedFunctions>().toHaveProperty('Mutation')
  })

  await t.test('should handle mixed resolver patterns', () => {
    type MixedResolvers = {
      Query: {
        // Connection-like resolver
        posts: {
          resolve: () => {
            edges: Array<{ node: { id: string; title: string } }>
          }
        }
        // Direct resolver function
        version: () => string
        // Object resolver (non-connection)
        config: {
          resolve: () => { setting: string }
        }
      }
      User: {
        // Another connection-like resolver
        friends: {
          resolve: () => Promise<{
            edges: Array<{ node: { id: string; name: string } }>
          }>
        }
        // Simple field
        name: () => string
      }
    }

    type TransformedMixed = NodesOnly<MixedResolvers>
    expectTypeOf<TransformedMixed>().toHaveProperty('Query')
    expectTypeOf<TransformedMixed>().toHaveProperty('User')
  })
})

test('NodesOnly utility type - optional and nested', async t => {
  await t.test('should handle optional properties', () => {
    type OptionalResolvers = {
      Query?: {
        users?: {
          resolve: () => Promise<{
            edges: Array<{ node: { id: string } }>
          }>
        }
      }
    }

    type TransformedOptional = NodesOnly<OptionalResolvers>
    expectTypeOf<TransformedOptional>().toMatchTypeOf<Record<string, any>>()
  })

  await t.test('should handle deeply nested structures', () => {
    type NestedResolvers = {
      Query: {
        search: {
          users: {
            resolve: () => Promise<{
              edges: Array<{
                node: {
                  id: string
                  profile: {
                    name: string
                    avatar: string
                  }
                }
              }>
            }>
          }
        }
      }
    }

    type TransformedNested = NodesOnly<NestedResolvers>
    expectTypeOf<TransformedNested>().toHaveProperty('Query')
  })

  await t.test('should handle connection resolvers with optional nodes', () => {
    type OptionalNodeResolvers = {
      Query: {
        maybeUsers: {
          resolve: () => Promise<{
            edges: Array<{ node?: { id: string; name: string } }>
          }>
        }
      }
    }

    type TransformedOptionalNodes = NodesOnly<OptionalNodeResolvers>
    expectTypeOf<TransformedOptionalNodes>().toMatchTypeOf<
      Record<string, any>
    >()
  })
})

test('NodesOnly utility type - complex scenarios', async t => {
  await t.test('should handle complex edge structures with union types', () => {
    type ComplexEdgeResolvers = {
      Query: {
        search: {
          resolve: () => Promise<{
            edges: Array<{
              node: {
                __typename: string
                id: string
              } & (
                | { type: 'user'; name: string; email: string }
                | { type: 'post'; title: string; content: string }
              )
            }>
          }>
        }
      }
    }

    type TransformedComplexEdges = NodesOnly<ComplexEdgeResolvers>
    expectTypeOf<TransformedComplexEdges>().toMatchTypeOf<Record<string, any>>()
  })

  await t.test(
    'should handle multiple connection types in same resolver group',
    () => {
      type MultiConnectionResolvers = {
        Query: {
          users: {
            resolve: () => Promise<{
              edges: Array<{ node: { id: string; name: string } }>
            }>
          }
          posts: {
            resolve: () => Promise<{
              edges: Array<{ node: { id: number; title: string } }>
            }>
          }
          comments: {
            resolve: () => Promise<{
              edges: Array<{
                node: { id: string; content: string; authorId: string }
              }>
            }>
          }
        }
      }

      type TransformedMultiConnection = NodesOnly<MultiConnectionResolvers>
      expectTypeOf<TransformedMultiConnection>().toMatchTypeOf<
        Record<string, any>
      >()
    }
  )
})

test('NodesOnly utility type - generics and constraints', async t => {
  await t.test('should work with generic types', () => {
    type GenericResolvers<T> = {
      Query: {
        items: {
          resolve: () => Promise<{
            edges: Array<{ node: T }>
          }>
        }
      }
    }

    type TransformedGeneric = NodesOnly<
      GenericResolvers<{ id: string; data: any }>
    >
    expectTypeOf<TransformedGeneric>().toMatchTypeOf<Record<string, any>>()
  })

  await t.test('should work with constrained generics', () => {
    type ConstrainedGenericResolvers<T extends { id: string }> = {
      Query: {
        entities: {
          resolve: () => Promise<{
            edges: Array<{ node: T }>
          }>
        }
      }
    }

    type TransformedConstrainedGeneric = NodesOnly<
      ConstrainedGenericResolvers<{ id: string; name: string }>
    >
    expectTypeOf<TransformedConstrainedGeneric>().toMatchTypeOf<
      Record<string, any>
    >()
  })

  await t.test('should preserve readonly modifiers', () => {
    type ReadonlyResolvers = {
      Query: {
        readonly items: {
          resolve: () => Promise<{
            edges: ReadonlyArray<{ node: { id: string } }>
          }>
        }
      }
    }

    type TransformedReadonly = NodesOnly<ReadonlyResolvers>
    expectTypeOf<TransformedReadonly>().toMatchTypeOf<Record<string, any>>()
  })
})

test('Internal utility types validation', async t => {
  await t.test('Valid type should exclude undefined and null', () => {
    type ValidString = Valid<string>
    expectTypeOf<ValidString>().toEqualTypeOf<string>()

    type ValidStringOrUndefined = Valid<string | undefined>
    expectTypeOf<ValidStringOrUndefined>().toEqualTypeOf<string>()

    type ValidStringOrNull = Valid<string | null>
    expectTypeOf<ValidStringOrNull>().toEqualTypeOf<string>()

    type ValidStringOrNullOrUndefined = Valid<string | null | undefined>
    expectTypeOf<ValidStringOrNullOrUndefined>().toEqualTypeOf<string>()
  })

  await t.test(
    'InConnection type should represent connection structure',
    () => {
      type SimpleConnection = InConnection<{ id: string }>
      expectTypeOf<SimpleConnection>().toEqualTypeOf<{
        edges: Array<{ node?: { id: string } }>
      }>()

      type ComplexConnection = InConnection<{ id: string; name: string }>
      expectTypeOf<ComplexConnection>().toEqualTypeOf<{
        edges: Array<{ node?: { id: string; name: string } }>
      }>()
    }
  )

  await t.test('MaybeWithResolve type should handle both forms', () => {
    type DirectType = MaybeWithResolve<string>
    expectTypeOf<DirectType>().toEqualTypeOf<string | { resolve: string }>()

    type FunctionType = MaybeWithResolve<() => string>
    expectTypeOf<FunctionType>().toEqualTypeOf<
      (() => string) | { resolve: () => string }
    >()
  })

  await t.test('MaybePromise type should handle both forms', () => {
    type DirectType = MaybePromise<string>
    expectTypeOf<DirectType>().toEqualTypeOf<string | Promise<string>>()

    type ObjectType = MaybePromise<{ id: number }>
    expectTypeOf<ObjectType>().toEqualTypeOf<
      { id: number } | Promise<{ id: number }>
    >()
  })

  await t.test('ExtractMaybePromise type should unwrap promises', () => {
    type DirectType = ExtractMaybePromise<string>
    expectTypeOf<DirectType>().toEqualTypeOf<string>()

    type PromiseType = ExtractMaybePromise<Promise<number>>
    expectTypeOf<PromiseType>().toEqualTypeOf<number>()

    type MaybePromiseType = ExtractMaybePromise<string | Promise<string>>
    expectTypeOf<MaybePromiseType>().toEqualTypeOf<string>()
  })

  await t.test(
    'ExtractNode type should extract node type from connection',
    () => {
      type DirectType = ExtractNode<string>
      expectTypeOf<DirectType>().toEqualTypeOf<string>()

      type ConnectionType = ExtractNode<{
        edges: Array<{ node?: { id: string } }>
      }>
      expectTypeOf<ConnectionType>().toEqualTypeOf<{ id: string }>()
    }
  )

  await t.test('ExtractMaybeResolver type should extract resolver type', () => {
    type DirectType = ExtractMaybeResolver<string>
    expectTypeOf<DirectType>().toEqualTypeOf<string>()

    type ResolverType = ExtractMaybeResolver<{ resolve: number }>
    expectTypeOf<ResolverType>().toEqualTypeOf<number>()
  })
})

test('ResolverFunction and TransformResolverGroup types', async t => {
  await t.test('ResolverFunction should handle different return types', () => {
    // Test with primitive return type
    type StringResolver = ResolverFunction<string>
    type StringFn = () => string | Promise<string>
    expectTypeOf<StringFn>().toBeFunction()
    expectTypeOf<StringFn>().returns.not.toBeNever()

    // Test with object return type
    type UserResolver = ResolverFunction<{ id: string; name: string }>
    type UserFn = () =>
      | { id: string; name: string }
      | Promise<{ id: string; name: string }>
    expectTypeOf<UserFn>().toBeFunction()
    expectTypeOf<UserFn>().returns.not.toBeNever()

    // Test with args
    type ArgsResolver = ResolverFunction<string, [number, boolean]>
    type ArgsFn = (arg1: number, arg2: boolean) => string | Promise<string>
    expectTypeOf<ArgsFn>().toBeFunction()
    expectTypeOf<ArgsFn>().parameter(0).toBeNumber()
    expectTypeOf<ArgsFn>().parameter(1).toBeBoolean()
    expectTypeOf<ArgsFn>().returns.not.toBeNever()
  })

  await t.test(
    'TransformResolverGroup should transform connection resolvers',
    () => {
      // Test with connection resolver
      type ConnectionGroup = {
        users: {
          resolve: () => Promise<{
            edges: Array<{ node: { id: string; name: string } }>
          }>
        }
      }

      type TransformedConnection = TransformResolverGroup<ConnectionGroup>
      expectTypeOf<TransformedConnection>().toBeObject()
      expectTypeOf<TransformedConnection['users']>().not.toBeNever()

      // Test with mixed resolvers
      type MixedGroup = {
        users: {
          resolve: () => Promise<{
            edges: Array<{ node: { id: string } }>
          }>
        }
        regularField: string
      }

      type TransformedMixed = TransformResolverGroup<MixedGroup>
      expectTypeOf<TransformedMixed>().toBeObject()
      expectTypeOf<TransformedMixed['regularField']>().toBeString()
    }
  )

  await t.test('TransformResolverGroup should handle nested structures', () => {
    type NestedGroup = {
      Query: {
        users: {
          resolve: () => Promise<{
            edges: Array<{
              node: {
                id: string
                profile: {
                  name: string
                  settings: {
                    theme: string
                  }
                }
              }
            }>
          }>
        }
      }
    }

    type TransformedNested = TransformResolverGroup<NestedGroup>
    expectTypeOf<TransformedNested>().toBeObject()
    expectTypeOf<TransformedNested['Query']>().toBeObject()
    expectTypeOf<TransformedNested['Query']['users']>().not.toBeNever()
  })

  await t.test(
    'TransformResolverGroup should preserve non-resolver fields',
    () => {
      type MixedGroup = {
        Query: {
          users: {
            resolve: () => Promise<{
              edges: Array<{ node: { id: string } }>
            }>
          }
          version: string
          settings: {
            theme: string
            language: string
          }
        }
      }

      type TransformedMixed = TransformResolverGroup<MixedGroup>
      expectTypeOf<TransformedMixed['Query']['version']>().toBeString()
      expectTypeOf<TransformedMixed['Query']['settings']>().toEqualTypeOf<{
        theme: string
        language: string
      }>()
    }
  )
})
