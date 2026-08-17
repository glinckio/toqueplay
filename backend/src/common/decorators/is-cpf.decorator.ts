import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { CpfService } from '../services/cpf.service';

const cpfService = new CpfService();

export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'string' && cpfService.isValid(value);
        },
        defaultMessage() {
          return 'Invalid CPF';
        },
      },
    });
  };
}
