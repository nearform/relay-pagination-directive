import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PAGINATION_MODE,
  connectionFromArray,
  decodeCursor,
  encodeCursor,
} from '../helpers.js'

test('encode creates a base64 string from provided values', () => {
  const val = encodeCursor('foo', '1234')
  assert.equal(Buffer.from(val, 'base64').toString('utf8'), 'foo:1234')
})

test('decodeCursor', async t => {
  await t.test('with invalid string', () => {
    assert.throws(() => decodeCursor('foo'), {
      message: 'Invalid cursor provided',
    })
  })

  await t.test('with valid string', () => {
    assert.deepEqual(decodeCursor(encodeCursor('foo', '1234')), {
      typeName: 'foo',
      id: '1234',
    })
  })
})

test('connectionFromArraySlice', async t => {
  const data = () => [
    { id: 10001, otherId: 8001, name: 'foo' },
    { id: 10002, otherId: 8002, name: 'bar' },
    { id: 10003, otherId: 8003, name: 'baz' },
  ]

  await t.test('with a negative first value', () => {
    assert.throws(() => connectionFromArray(data(), { first: -1 }), {
      message: 'Argument "first" must be a non-negative integer',
    })
  })

  await t.test('default options', () => {
    assert.deepEqual(connectionFromArray(data(), { first: 2, after: 1 }), {
      edges: [
        {
          cursor: 10001,
          node: { id: 10001, otherId: 8001, name: 'foo' },
        },
        {
          cursor: 10002,
          node: { id: 10002, otherId: 8002, name: 'bar' },
        },
      ],
      pageInfo: {
        startCursor: 10001,
        endCursor: 10002,
        hasPreviousPage: true,
        hasNextPage: true,
      },
    })
  })

  await t.test('custom cursor prop', () => {
    assert.deepEqual(
      connectionFromArray(
        data(),
        { first: 2, after: 1 },
        { cursorPropOrFn: 'otherId' },
      ),
      {
        edges: [
          {
            cursor: 8001,
            node: { id: 10001, otherId: 8001, name: 'foo' },
          },
          {
            cursor: 8002,
            node: { id: 10002, otherId: 8002, name: 'bar' },
          },
        ],
        pageInfo: {
          startCursor: 8001,
          endCursor: 8002,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      },
    )
  })

  await t.test('custom cursor function', () => {
    assert.deepEqual(
      connectionFromArray(
        data(),
        { first: 2, after: 1 },
        { cursorPropOrFn: val => val.name },
      ),
      {
        edges: [
          {
            cursor: 'foo',
            node: { id: 10001, otherId: 8001, name: 'foo' },
          },
          {
            cursor: 'bar',
            node: { id: 10002, otherId: 8002, name: 'bar' },
          },
        ],
        pageInfo: {
          startCursor: 'foo',
          endCursor: 'bar',
          hasPreviousPage: true,
          hasNextPage: true,
        },
      },
    )
  })

  await t.test('simple mode', () => {
    assert.deepEqual(
      connectionFromArray(
        data(),
        { first: 2, after: 1 },
        { paginationMode: PAGINATION_MODE.SIMPLE },
      ),
      {
        edges: [
          { id: 10001, otherId: 8001, name: 'foo' },
          { id: 10002, otherId: 8002, name: 'bar' },
        ],
        pageInfo: {
          startCursor: 10001,
          endCursor: 10002,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      },
    )
  })

  await t.test('edge props', () => {
    assert.deepEqual(
      connectionFromArray(
        data(),
        {
          first: 2,
          after: 1,
        },
        { edgeProps: ['otherId'] },
      ),
      {
        edges: [
          {
            cursor: 10001,
            otherId: 8001,
            node: { id: 10001, name: 'foo' },
          },
          {
            cursor: 10002,
            otherId: 8002,
            node: { id: 10002, name: 'bar' },
          },
        ],
        pageInfo: {
          startCursor: 10001,
          endCursor: 10002,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      },
    )
  })

  await t.test('without after value', () => {
    assert.deepEqual(connectionFromArray(data(), { first: 2 }), {
      edges: [
        {
          cursor: 10001,
          node: { id: 10001, otherId: 8001, name: 'foo' },
        },
        {
          cursor: 10002,
          node: { id: 10002, otherId: 8002, name: 'bar' },
        },
      ],
      pageInfo: {
        startCursor: 10001,
        endCursor: 10002,
        hasPreviousPage: false,
        hasNextPage: true,
      },
    })
  })

  await t.test('when requested item count is higher than the dataset', () => {
    assert.deepEqual(connectionFromArray(data(), { first: 100 }), {
      edges: [
        {
          cursor: 10001,
          node: { id: 10001, otherId: 8001, name: 'foo' },
        },
        {
          cursor: 10002,
          node: { id: 10002, otherId: 8002, name: 'bar' },
        },
        {
          cursor: 10003,
          node: { id: 10003, otherId: 8003, name: 'baz' },
        },
      ],
      pageInfo: {
        startCursor: 10001,
        endCursor: 10003,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    })
  })

  await t.test('user provided previous/next page values', () => {
    assert.deepEqual(
      connectionFromArray(data(), { first: 100 }, undefined, {
        hasNextPage: true,
        hasPreviousPage: true,
      }),
      {
        edges: [
          {
            cursor: 10001,
            node: { id: 10001, otherId: 8001, name: 'foo' },
          },
          {
            cursor: 10002,
            node: { id: 10002, otherId: 8002, name: 'bar' },
          },
          {
            cursor: 10003,
            node: { id: 10003, otherId: 8003, name: 'baz' },
          },
        ],
        pageInfo: {
          startCursor: 10001,
          endCursor: 10003,
          hasPreviousPage: true,
          hasNextPage: true,
        },
      },
    )
  })
})
