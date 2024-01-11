import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PAGINATION_MODE,
  connectionFromArray,
  decodeCursor,
  encodeCursor
} from '../helpers.js'

test('encode creates a base64 string from provided values', () => {
  const val = encodeCursor('foo', '1234')
  assert.equal(Buffer.from(val, 'base64').toString('utf8'), 'foo:1234')
})

test('decodeCursor', async t => {
  await t.test('with invalid string', () => {
    assert.throws(() => decodeCursor('foo'), {
      message: 'Invalid cursor provided'
    })
  })

  await t.test('with valid string', () => {
    assert.deepEqual(decodeCursor(encodeCursor('foo', '1234')), {
      typeName: 'foo',
      id: '1234'
    })
  })
})

test('connectionFromArray', async t => {
  const cursorLookup = {
    10001: 'VXNlcjoxMDAwMQ==',
    10002: 'VXNlcjoxMDAwMg==',
    10003: 'VXNlcjoxMDAwMw==',
    8001: 'VXNlcjo4MDAx',
    8002: 'VXNlcjo4MDAy',
    8003: 'VXNlcjo4MDAz'
  }

  const data = () => [
    { id: 10001, otherId: 8001, name: 'foo' },
    { id: 10002, otherId: 8002, name: 'bar' },
    { id: 10003, otherId: 8003, name: 'baz' }
  ]

  await t.test('with a negative first value', () => {
    assert.throws(() => connectionFromArray('User', data(), { first: -1 }), {
      message: 'Argument "first" must be a non-negative integer'
    })
  })

  await t.test('default options', () => {
    assert.deepEqual(
      connectionFromArray('User', data(), { first: 2, after: 1 }),
      {
        edges: [
          {
            cursor: cursorLookup[10001],
            node: { id: 10001, otherId: 8001, name: 'foo' }
          },
          {
            cursor: cursorLookup[10002],
            node: { id: 10002, otherId: 8002, name: 'bar' }
          }
        ],
        pageInfo: {
          startCursor: cursorLookup[10001],
          endCursor: cursorLookup[10002],
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('custom cursor prop', () => {
    assert.deepEqual(
      connectionFromArray(
        'User',
        data(),
        { first: 2, after: 1 },
        { cursorPropOrFn: 'otherId' }
      ),
      {
        edges: [
          {
            cursor: cursorLookup[8001],
            node: { id: 10001, otherId: 8001, name: 'foo' }
          },
          {
            cursor: cursorLookup[8002],
            node: { id: 10002, otherId: 8002, name: 'bar' }
          }
        ],
        pageInfo: {
          startCursor: cursorLookup[8001],
          endCursor: cursorLookup[8002],
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('unencoded cursor prop', () => {
    assert.deepEqual(
      connectionFromArray(
        'User',
        data(),
        { first: 2, after: 1 },
        { encodeCursor: false }
      ),
      {
        edges: [
          {
            cursor: 10001,
            node: { id: 10001, otherId: 8001, name: 'foo' }
          },
          {
            cursor: 10002,
            node: { id: 10002, otherId: 8002, name: 'bar' }
          }
        ],
        pageInfo: {
          startCursor: 10001,
          endCursor: 10002,
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('custom cursor function', () => {
    assert.deepEqual(
      connectionFromArray(
        'User',
        data(),
        { first: 2, after: 1 },
        { cursorPropOrFn: (type, val) => val.name }
      ),
      {
        edges: [
          {
            cursor: 'foo',
            node: { id: 10001, otherId: 8001, name: 'foo' }
          },
          {
            cursor: 'bar',
            node: { id: 10002, otherId: 8002, name: 'bar' }
          }
        ],
        pageInfo: {
          startCursor: 'foo',
          endCursor: 'bar',
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('simple mode', () => {
    assert.deepEqual(
      connectionFromArray(
        'User',
        data(),
        { first: 2, after: 1 },
        { paginationMode: PAGINATION_MODE.SIMPLE }
      ),
      {
        edges: [
          { id: 10001, otherId: 8001, name: 'foo' },
          { id: 10002, otherId: 8002, name: 'bar' }
        ],
        pageInfo: {
          startCursor: cursorLookup[10001],
          endCursor: cursorLookup[10002],
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('edge props', () => {
    assert.deepEqual(
      connectionFromArray(
        'User',
        data(),
        {
          first: 2,
          after: 1
        },
        {
          edgeProps: {
            otherId: 'Int'
          }
        }
      ),
      {
        edges: [
          {
            cursor: cursorLookup[10001],
            otherId: 8001,
            node: { id: 10001, name: 'foo' }
          },
          {
            cursor: cursorLookup[10002],
            otherId: 8002,
            node: { id: 10002, name: 'bar' }
          }
        ],
        pageInfo: {
          startCursor: cursorLookup[10001],
          endCursor: cursorLookup[10002],
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })

  await t.test('without after value', () => {
    assert.deepEqual(connectionFromArray('User', data(), { first: 2 }), {
      edges: [
        {
          cursor: cursorLookup[10001],
          node: { id: 10001, otherId: 8001, name: 'foo' }
        },
        {
          cursor: cursorLookup[10002],
          node: { id: 10002, otherId: 8002, name: 'bar' }
        }
      ],
      pageInfo: {
        startCursor: cursorLookup[10001],
        endCursor: cursorLookup[10002],
        hasPreviousPage: false,
        hasNextPage: true
      }
    })
  })

  await t.test('when requested item count is higher than the dataset', () => {
    assert.deepEqual(connectionFromArray('User', data(), { first: 100 }), {
      edges: [
        {
          cursor: cursorLookup[10001],
          node: { id: 10001, otherId: 8001, name: 'foo' }
        },
        {
          cursor: cursorLookup[10002],
          node: { id: 10002, otherId: 8002, name: 'bar' }
        },
        {
          cursor: cursorLookup[10003],
          node: { id: 10003, otherId: 8003, name: 'baz' }
        }
      ],
      pageInfo: {
        startCursor: cursorLookup[10001],
        endCursor: cursorLookup[10003],
        hasPreviousPage: false,
        hasNextPage: false
      }
    })
  })

  await t.test('user provided previous/next page values', () => {
    assert.deepEqual(
      connectionFromArray('User', data(), { first: 100 }, undefined, {
        hasNextPage: true,
        hasPreviousPage: true
      }),
      {
        edges: [
          {
            cursor: cursorLookup[10001],
            node: { id: 10001, otherId: 8001, name: 'foo' }
          },
          {
            cursor: cursorLookup[10002],
            node: { id: 10002, otherId: 8002, name: 'bar' }
          },
          {
            cursor: cursorLookup[10003],
            node: { id: 10003, otherId: 8003, name: 'baz' }
          }
        ],
        pageInfo: {
          startCursor: cursorLookup[10001],
          endCursor: cursorLookup[10003],
          hasPreviousPage: true,
          hasNextPage: true
        }
      }
    )
  })
})
