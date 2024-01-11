export const PAGINATION_MODE = {
  SIMPLE: 'simple',
  EDGES: 'edges'
}

export function encodeCursor(typeName, id) {
  return Buffer.from(`${typeName}:${id}`).toString('base64')
}

export function decodeCursor(cursor) {
  const [typeName, id] = Buffer.from(cursor, 'base64')
    .toString('utf-8')
    .split(':')

  if (!typeName || !id) {
    throw new Error('Invalid cursor provided')
  }

  return {
    typeName,
    id
  }
}

export function connectionFromArray(
  baseType,
  arrayItems,
  { first, after }, // per request args
  {
    paginationMode = PAGINATION_MODE.EDGES,
    edgeProps,
    encodeCursor = true,
    cursorPropOrFn = 'id'
  } = {},
  pageInfoPartial,
  connectionProps
) {
  if (typeof first === 'number') {
    if (first < 0) {
      throw new Error('Argument "first" must be a non-negative integer')
    }
  }

  const slice = arrayItems.slice(0, first)

  const getCursor =
    typeof cursorPropOrFn === 'string'
      ? (type, val) =>
          defaultEncodeCursorFn(type, val, cursorPropOrFn, encodeCursor)
      : cursorPropOrFn

  if (paginationMode === PAGINATION_MODE.SIMPLE) {
    return {
      ...connectionProps,
      edges: slice,
      pageInfo: {
        startCursor: getCursor(baseType, slice[0]),
        endCursor: getCursor(baseType, slice[slice.length - 1]),
        hasPreviousPage: pageInfoPartial?.hasPreviousPage ?? !!after,
        hasNextPage: pageInfoPartial?.hasNextPage ?? arrayItems.length >= first
      }
    }
  }

  const edges = slice.map(value => {
    return {
      ...(edgeProps && getEdgeProps(edgeProps, value)),
      cursor: getCursor(baseType, value),
      node: value
    }
  })

  return {
    ...connectionProps,
    edges,
    pageInfo: {
      startCursor: edges[0].cursor,
      endCursor: edges[edges.length - 1].cursor,
      hasPreviousPage: pageInfoPartial?.hasPreviousPage ?? !!after,
      hasNextPage: pageInfoPartial?.hasNextPage ?? arrayItems.length >= first
    }
  }
}

function getEdgeProps(edgeProps, val) {
  const props = {}
  for (const prop of Object.keys(edgeProps)) {
    props[prop] = val[prop]
    delete val[prop]
  }
  return props
}

function defaultEncodeCursorFn(typeName, val, cursorProp, shouldEncode) {
  if (!shouldEncode) return val[cursorProp]

  return encodeCursor(typeName, val[cursorProp])
}
