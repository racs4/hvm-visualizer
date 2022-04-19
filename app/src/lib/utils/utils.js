export const compose =
  (...functions) =>
    (arg) =>
      functions.reduceRight((arg, f) => f(arg), arg);