type Expect<T extends true> = T
type Equal<A, B> =
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false
