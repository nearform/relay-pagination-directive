/**
 * Type Definition Tests for Package Entry Point
 *
 * This file uses `tsd` (TypeScript type definition tester) to verify that:
 * 1. All public exports are accessible from the main package entry point
 * 2. Import/export integrity is maintained across the type system
 * 3. The public API surface matches expectations
 *
 * Note: This is a smoke test for the main exports. Detailed type behavior
 * testing is handled in types/core.test-d.ts and types/utils.test-d.ts
 */

import { expectType } from 'tsd'
import type {
  // Core functions
  encodeCursor,
  decodeCursor,
  connectionDirective,

  // Types and enums
  ConnectionArgs,
  PAGINATION_MODE,
  ConnectionResolverResponse,
  NodesOnly
} from './index'

// Verify all exports are accessible by importing them successfully

// Verify basic type shapes without complex expectations
expectType<ConnectionArgs>({} as ConnectionArgs)
expectType<PAGINATION_MODE>({} as PAGINATION_MODE)
expectType<ConnectionResolverResponse<any>>(
  {} as ConnectionResolverResponse<any>
)
expectType<NodesOnly<any>>({} as NodesOnly<any>)

// Verify function types exist (without testing implementation details)
expectType<typeof encodeCursor>({} as typeof encodeCursor)
expectType<typeof decodeCursor>({} as typeof decodeCursor)
expectType<typeof connectionDirective>({} as typeof connectionDirective)
