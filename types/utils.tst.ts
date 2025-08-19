import { expect, test, describe } from 'tstyche'
import type { NodesOnly } from 'relay-pagination-directive'

describe('NodesOnly utility type', () => {
  describe('basic functionality', () => {
    test('should transform simple resolver groups', () => {
      type SimpleResolvers = {
        Query: {
          users: {
            resolve: () => Promise<{
              edges: Array<{ node: { id: string; name: string } }>
            }>
          }
          // Non-connection resolver
          currentUser: {
            resolve: () => Promise<{ id: string; name: string }>
          }
        }
        // Direct function resolver
        Mutation: {
          createUser: () => Promise<{ id: string; name: string }>
        }
      }

      type TransformedResolvers = NodesOnly<SimpleResolvers>

      // Test that the transformation preserves the general structure
      expect<TransformedResolvers>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })

    test('should handle empty object', () => {
      type EmptyResolvers = {}
      type TransformedEmpty = NodesOnly<EmptyResolvers>

      expect<TransformedEmpty>().type.toBe<{}>()
    })
  })

  describe('nested structures', () => {
    test('should handle nested resolver objects', () => {
      type NestedResolverObject = {
        level1: {
          level2: {
            users: {
              resolve: () => Promise<{
                edges: Array<{ node: { id: string } }>
              }>
            }
          }
        }
      }

      type TransformedNestedObject = NodesOnly<NestedResolverObject>
      expect<TransformedNestedObject>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })

    test('should handle deeply nested structure', () => {
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
      expect<TransformedNested>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('mixed resolver patterns', () => {
    test('should handle object with different resolver patterns', () => {
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

      // Test that the transformation produces a valid object type
      expect<TransformedMixed>().type.toBeAssignableTo<
        Record<string, unknown>
      >()

      // Test that the top-level keys are preserved
      expect<TransformedMixed>().type.toBeAssignableTo<{
        Query: unknown
        User: unknown
      }>()
    })

    test('should handle function resolvers', () => {
      type FunctionResolvers = {
        Query: {
          hello: () => string
          getUser: () => Promise<{ id: string; name: string }>
        }
      }

      type TransformedFunctions = NodesOnly<FunctionResolvers>
      expect<TransformedFunctions>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('optional fields', () => {
    test('should handle optional fields', () => {
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
      expect<TransformedOptional>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })

    test('should handle connection resolvers with optional nodes', () => {
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
      expect<TransformedOptionalNodes>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('complex edge structures', () => {
    test('should handle complex edge structures using union types', () => {
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
      expect<TransformedComplexEdges>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })

    test('should handle multiple connection types in same resolver group', () => {
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
      expect<TransformedMultiConnection>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('generic types', () => {
    test('should handle complex generic constraints', () => {
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
        GenericResolvers<{ id: string; data: unknown }>
      >
      expect<TransformedGeneric>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })

    test('should handle generic that extends specific types', () => {
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
      expect<TransformedConstrainedGeneric>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('readonly arrays', () => {
    test('should handle readonly arrays', () => {
      type ReadonlyArrayResolvers = {
        Query: {
          readonly items: {
            resolve: () => Promise<{
              edges: ReadonlyArray<{ node: { id: string } }>
            }>
          }
        }
      }

      type TransformedReadonly = NodesOnly<ReadonlyArrayResolvers>
      expect<TransformedReadonly>().type.toBeAssignableTo<
        Record<string, unknown>
      >()
    })
  })

  describe('NodesOnly constraint validation', () => {
    test('should work with Record<string, unknown>', () => {
      expect<NodesOnly<{ test: { field: string } }>>().type.toBeAssignableWith({
        test: { field: 'value' }
      })
    })
  })
})
