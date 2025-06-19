/** A minimal subset of the Standard Schema specification used internally */
interface StandardSchema<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchema.Props<Input, Output>
}

declare namespace StandardSchema {
  interface Props<Input = unknown, Output = Input> {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>
  }

  type Result<Output> = SuccessResult<Output> | FailureResult

  interface SuccessResult<Output> {
    readonly value: Output
    readonly issues?: undefined
  }

  interface FailureResult {
    readonly issues: readonly Issue[]
  }

  interface Issue {
    readonly message: string
    readonly path?: readonly (PropertyKey | PathSegment)[]
  }

  interface PathSegment {
    readonly key: PropertyKey
  }
}

export { StandardSchema }
