import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Valida que el campo decorado coincida con el valor de otro campo del mismo objeto. */
export function Match(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [related] = args.constraints as string[];
          return value === (args.object as Record<string, unknown>)[related];
        },
        defaultMessage(args: ValidationArguments) {
          const [related] = args.constraints as string[];
          return `${args.property} debe coincidir con ${related}`;
        },
      },
    });
  };
}
