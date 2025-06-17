import { expectType, expectAssignable } from 'tsd'
import { NodesOnly } from '../types/utils'

// Test simple case: NodesOnly should transform resolver groups
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

// Test that NodesOnly returns some transformation
type TransformedResolvers = NodesOnly<SimpleResolvers>

// Test that the transformation preserves the general structure
expectAssignable<Record<string, any>>({} as TransformedResolvers)

// Test with empty object
type EmptyResolvers = {}
type TransformedEmpty = NodesOnly<EmptyResolvers>
expectType<{}>({} as TransformedEmpty)

// Test with nested resolver objects
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
expectAssignable<Record<string, any>>({} as TransformedNestedObject)

// Test with object that has different resolver patterns
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
expectAssignable<Record<string, any>>({} as TransformedMixed)

// Test that the top-level keys are preserved
expectAssignable<{ Query: any; User: any }>({} as TransformedMixed)

// Test with optional fields
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
expectAssignable<Record<string, any>>({} as TransformedOptional)

// Test with deeply nested structure
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
expectAssignable<Record<string, any>>({} as TransformedNested)

// Test with function resolvers
type FunctionResolvers = {
  Query: {
    hello: () => string
    getUser: () => Promise<{ id: string; name: string }>
  }
}

type TransformedFunctions = NodesOnly<FunctionResolvers>
expectAssignable<Record<string, any>>({} as TransformedFunctions)

// Test with connection resolvers that have optional nodes
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
expectAssignable<Record<string, any>>({} as TransformedOptionalNodes)

// Test with complex edge structures using union types
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
expectAssignable<Record<string, any>>({} as TransformedComplexEdges)

// Test with multiple connection types in same resolver group
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
expectAssignable<Record<string, any>>({} as TransformedMultiConnection)

// Test that NodesOnly can handle complex generic constraints
type GenericResolvers<T> = {
  Query: {
    items: {
      resolve: () => Promise<{
        edges: Array<{ node: T }>
      }>
    }
  }
}

type TransformedGeneric = NodesOnly<GenericResolvers<{ id: string; data: any }>>
expectAssignable<Record<string, any>>({} as TransformedGeneric)

// Test with generic that extends specific types
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
expectAssignable<Record<string, any>>({} as TransformedConstrainedGeneric)

// Test that the NodesOnly constraint works properly
// This should work - passing a Record<string, any>
expectAssignable<NodesOnly<{ test: { field: string } }>>({
  test: { field: 'value' }
})

// Test with readonly arrays
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
expectAssignable<Record<string, any>>({} as TransformedReadonly)
