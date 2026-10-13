import { ValueTransformer } from 'typeorm';

// Postgres "numeric" llega como string desde el driver; lo exponemos como number.
export class NumericTransformer implements ValueTransformer {
  to(value?: number | null): number | null | undefined {
    return value;
  }

  from(value?: string | null): number | null {
    return value == null ? null : parseFloat(value);
  }
}
