import type * as Subject from './transforms'
import * as subject from './transforms'

namespace TypeTransforms {
  type test1 = Expect<
    Equal<Subject.CamelToKebab<'camelToKebab'>, 'camel-to-kebab'>
  >
  type test2 = Expect<
    Equal<Subject.CamelToSnake<'camelToSnake'>, 'camel_to_snake'>
  >
  type test3 = Expect<
    Equal<Subject.KebabToCamel<'kebab-to-camel'>, 'kebabToCamel'>
  >
  type test4 = Expect<
    Equal<Subject.KebabToSnake<'kebab-to-snake'>, 'kebab_to_snake'>
  >
  type test5 = Expect<
    Equal<Subject.SnakeToCamel<'snake_to_camel'>, 'snakeToCamel'>
  >
  type test6 = Expect<
    Equal<Subject.SnakeToKebab<'snake_to_kebab'>, 'snake-to-kebab'>
  >
}

describe('deep transforms', () => {
  test('camelToKebab', () => {
    const result = subject.camelToKebab({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    expect(result).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { 'deep-nested': { value: boolean } }; 'other-value': boolean }
      >
    >
  })

  test('camelToSnake', () => {
    const result = subject.camelToSnake({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    expect(result).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deep_nested: { value: boolean } }; other_value: boolean }
      >
    >
  })

  test('kebabToCamel', () => {
    const result = subject.kebabToCamel({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    expect(result).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deepNested: { value: boolean } }; otherValue: boolean }
      >
    >
  })

  test('kebabToSnake', () => {
    const result = subject.kebabToSnake({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    expect(result).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deep_nested: { value: boolean } }; other_value: boolean }
      >
    >
  })

  test('snakeToCamel', () => {
    const result = subject.snakeToCamel({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    expect(result).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deepNested: { value: boolean } }; otherValue: boolean }
      >
    >
  })

  test('snakeToKebab', () => {
    const result = subject.snakeToKebab({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    expect(result).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { 'deep-nested': { value: boolean } }; 'other-value': boolean }
      >
    >
  })
})
