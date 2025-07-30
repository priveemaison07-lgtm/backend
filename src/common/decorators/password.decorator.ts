import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidatorOptions,
} from 'class-validator';

/**
 * Custom decorator `ConfirmedPassword` to validate if a confirmation password field matches
 * the specified password field.
 *
 * @param {string} property - The original field name to compare with (e.g., "password")
 * @param {string} message - Optional custom error message
 * @param {ValidatorOptions} validationOption - Optional validator options
 */
export function ConfirmedPassword(
  property: string,
  message?: string,
  validationOption?: ValidatorOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'ConfirmedPassword',
      target: object.constructor,
      propertyName,
      options: validationOption,
      constraints: [property, message],
      validator: ConfirmedPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'ConfirmedPassword' })
export class ConfirmedPasswordConstraint
  implements ValidatorConstraintInterface
{
  /**
   * Validate that the decorated property (e.g., "confirmPassword") matches the target property (e.g., "password")
   */
  validate(value: any, args: ValidationArguments): boolean {
    const [property] = args.constraints;
    const relatedValue = (args.object as any)[property];
    return value === relatedValue;
  }

  /**
   * Returns custom error message when validation fails
   */
  defaultMessage(args: ValidationArguments): string {
    const message = args.constraints[1];
    return message ?? 'Password and confirm password must match';
  }
}
