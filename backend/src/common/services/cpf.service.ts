import { Injectable } from '@nestjs/common';
import { AppError } from '../errors/app-error';

@Injectable()
export class CpfService {
  /**
   * Validates a CPF string.
   * Currently performs mathematical validation (check digits).
   * Can be extended to call an external verification service.
   *
   * @throws AppError.invalidCpf() if the CPF is invalid
   */
  validate(cpf: string): void {
    if (!this.isValid(cpf)) {
      throw AppError.invalidCpf();
    }
  }

  /**
   * Returns true if the CPF is mathematically valid.
   * Extracted as a pure function for use in decorators and other contexts.
   */
  isValid(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf)) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const digits = cpf.split('').map(Number);

    // First check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== digits[9]) return false;

    // Second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (11 - i);
    }
    check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== digits[10]) return false;

    return true;
  }
}
