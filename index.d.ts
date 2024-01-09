import { GraphQLSchema } from 'graphql'

export function encodeCursor(typeName: string, id: string | number): string

export function decodeCursor(id: string): { typeName: string; id: string }

export type ConnectionArgs = {
  first: number
  after?: string
}

type PageInfo = {
  startCursor: string
  endCursor: string
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export const PAGINATION_MODE = {
  SIMPLE: 'simple',
  EDGES: 'edges',
} as const

export type ConnectionResolverResponse<TArrayItem> = {
  edges: {
    cursor: string
    node: TArrayItem
  }
  pageInfo: PageInfo
}

type ConnectionProperties = {
  [typeName: string]: {
    paginationMode: 'simple' | 'edges'
    cursorPropOrFn?: string | ((item: unknown[]) => string)
    connectionProps?: Record<string, string | Record<string, string>>
    edgeProps?: Record<string, string | Record<string, string>>
  }
}

type ConnectionDirectiveResponse = {
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
}

export function connectionDirective(
  connectionProperties?: ConnectionProperties,
  directiveName?: string,
): ConnectionDirectiveResponse
