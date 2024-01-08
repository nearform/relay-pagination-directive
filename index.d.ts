import { GraphQLSchema } from 'graphql'

export function encodeCursor(typeName: string, id: string | number): string

export function decodeCursor(typeName: string, id: string | number): string

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

export type ConnectionResolverResponse<TArrayItem> = {
  edges: {
    cursor: string
    node: TArrayItem,
  }
  pageInfo: PageInfo
}


type ConnectionProperties = {
  [typeName: string]: {
    paginationMode: 'simple' | 'edges'
    cursorPropOrFn?: string | ((item: unknown[]) => string)
    connectionProps?: Record<string, string>
    edgeProps?: string[]
  }
}

type ConnectionDirectiveResponse = {
  connectionDirectiveTypeDefs: string
  connectionDirectiveTransformer: (schema: GraphQLSchema) => GraphQLSchema
}

export function connectionDirective(connectionProperties?: ConnectionProperties, directiveName?: string): ConnectionDirectiveResponse
