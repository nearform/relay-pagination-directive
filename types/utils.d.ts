type Valid<T> = Exclude<T, undefined | null>

type InConnection<T> = {
  edges: Array<{ node?: T }>
}

type MaybeWithResolve<T> = T | { resolve: T }
type MaybePromise<T> = T | Promise<T>
type ExtractMaybePromise<T> = T extends MaybePromise<infer U> ? U : T
type ExtractNode<T> = T extends InConnection<infer U> ? U : T
type ExtractMaybeResolver<T> = T extends MaybeWithResolve<infer U> ? U : T

type ResolverFunction<
  TReturn,
  TArgs extends readonly unknown[] = []
> = MaybeWithResolve<(...args: TArgs) => MaybePromise<
  import("mercurius-codegen").DeepPartial< MaybePromise<TReturn>>
>>

type TransformResolverGroup<T> = {
  [K in keyof T]: Valid<T[K]> extends ResolverFunction<infer R, infer A>
  ? ResolverFunction<Valid<ExtractNode<R>>[] | null, A>
  : T[K]
}

export type NodesOnly<T extends Record<string, any>> = {
  [K in keyof T]: Valid<T[K]> extends Record<string, any>
  ? TransformResolverGroup<T[K]>
  : T[K]
}
