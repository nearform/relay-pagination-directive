import { mergeSchemas } from '@graphql-tools/schema'
import { MapperKind, getDirective, mapSchema } from '@graphql-tools/utils'
import { TransformObjectFields, wrapSchema } from '@graphql-tools/wrap'
import {
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLNonNull,
  defaultFieldResolver
} from 'graphql'
import { PAGINATION_MODE, connectionFromArray } from './helpers.js'
import { z } from 'zod'

const typeOptionsMapValidator = z.record(
  z.string(),
  z.object({
    paginationMode: z.optional(
      z.enum(Object.values(PAGINATION_MODE)).default(PAGINATION_MODE.EDGES)
    ),
    cursorPropOrFn: z.optional(z.union([z.string().min(1), z.function()])),
    connectionProps: z.optional(z.record(z.string(), z.string())),
    edgeProps: z.optional(
      z.record(
        z.string(),
        z.union([z.string(), z.record(z.string(), z.string())])
      )
    )
  })
)

export function connectionDirective(
  typeOptionsMap = {},
  directiveName = 'connection'
) {
  const options = typeOptionsMapValidator.parse(typeOptionsMap)

  return {
    connectionDirectiveTypeDefs: `directive @${directiveName}(prefix: String) on FIELD_DEFINITION`,
    connectionDirectiveTransformer(schema) {
      const existingTypes = {}
      const connectionTypes = {}
      const newTypes = []

      mapSchema(schema, {
        [MapperKind.TYPE](type) {
          // Get all existing types for presence checks
          existingTypes[type.name] = true
        },
        [MapperKind.OBJECT_FIELD](fieldConfig, fieldName, typeName) {
          const directive = getDirective(
            schema,
            fieldConfig,
            directiveName
          )?.[0]

          if (directive) {
            const match = fieldConfig.type.toString().match(/[A-Z][a-z]+/)
            if (!match) return fieldConfig

            // create a map of type properties to their original response type
            connectionTypes[getTypeKey(typeName, fieldName)] = {
              typeName: match[0],
              resolver: fieldConfig.resolve ?? defaultFieldResolver,
              prefix: directive['prefix'] ?? match[0]
            }
          }

          return fieldConfig
        }
      })

      if (!existingTypes['PageInfo']) {
        newTypes.push(`
          type PageInfo {
            startCursor: String
            endCursor: String
            hasNextPage: Boolean!
            hasPreviousPage: Boolean!
          }
        `)
      }

      // Add edges/connections for all discovered @connection types
      for (const typeConfig of Object.values(connectionTypes)) {
        const { typeName, prefix } = typeConfig
        const typeOptions = options[typeName]

        const edgeName =
          typeOptions?.paginationMode === PAGINATION_MODE.SIMPLE
            ? typeName
            : `${prefix}Edge`

        if (
          typeOptions?.paginationMode !== PAGINATION_MODE.SIMPLE &&
          !existingTypes[edgeName]
        ) {
          newTypes.push(`
            type ${edgeName} {
              cursor: ID!
              node: ${typeName}
              ${mapAdditionalProps(typeOptions?.edgeProps, prefix)}
            }
          `)
        }

        const newConnectionName = `${prefix}Connection`
        if (!existingTypes[newConnectionName]) {
          newTypes.push(`
            type ${newConnectionName} {
              edges: [${edgeName}!]!
              pageInfo: PageInfo!
              ${mapAdditionalProps(typeOptions?.connectionProps, prefix)}
            }
          `)
        }
      }

      schema = mergeSchemas({
        schemas: [schema],
        typeDefs: newTypes
      })

      return wrapSchema({
        schema,
        transforms: [
          new TransformObjectFields((typeName, fieldName, fieldConfig) => {
            const typeKey = getTypeKey(typeName, fieldName)
            if (!connectionTypes[typeKey]) return undefined
            const {
              typeName: baseType,
              prefix,
              resolver: originalResolver
            } = connectionTypes[typeKey]
            const typeOptions = options[baseType]

            // update the response type for @connection types
            fieldConfig.type = getConnectionType(prefix)

            fieldConfig.args = {
              ...fieldConfig.args,
              ...getConnectionArgs()
            }

            fieldConfig.resolve = async (root, args, ctx, info) => {
              const res = await originalResolver(root, args, ctx, info)
              if (typeOptions) {
                typeOptions.edgeProps =
                  typeOptions.edgeProps?.[prefix] ?? typeOptions.edgeProps
              }

              if (typeof res !== 'object') {
                throw new Error(
                  'Connection responses must be an array or object'
                )
              }

              if (Array.isArray(res))
                return connectionFromArray(baseType, res, args, typeOptions)

              const { edges, pageInfo, ...connectionProps } = res

              return connectionFromArray(
                baseType,
                edges,
                args,
                typeOptions,
                pageInfo,
                connectionProps
              )
            }

            return fieldConfig
          })
        ]
      })
    }
  }
}

function getTypeKey(typeName, fieldName) {
  return `${typeName}.${fieldName}`
}

function getConnectionType(typeName) {
  return new GraphQLNonNull(
    new GraphQLObjectType({
      name: `${typeName}Connection`,
      fields: {}
    })
  )
}

function getConnectionArgs() {
  return {
    first: {
      type: new GraphQLScalarType({
        name: 'Int'
      })
    },
    after: {
      type: new GraphQLScalarType({
        name: 'ID'
      })
    }
  }
}

function mapAdditionalProps(additionalProps, subKey) {
  if (!additionalProps) return ''
  if (subKey && additionalProps[subKey]) {
    return mapAdditionalProps(additionalProps[subKey])
  }
  return Object.entries(additionalProps)
    .filter(([, val]) => typeof val === 'string')
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n')
}
