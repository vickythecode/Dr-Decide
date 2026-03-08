export type PasswordValidationResult = {
  isValid: boolean;
  issues: string[];
};

const SPECIAL_CHARACTER_REGEX = /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~]/;

export function validatePasswordPolicy(password: string): PasswordValidationResult {
  const issues: string[] = [];

  if (password.length < 8) issues.push("Use at least 8 characters.");
  if (password.length > 99) issues.push("Use no more than 99 characters.");
  if (!/[a-z]/.test(password)) issues.push("Add at least one lowercase letter.");
  if (!/[A-Z]/.test(password)) issues.push("Add at least one uppercase letter.");
  if (!/[0-9]/.test(password)) issues.push("Add at least one number.");
  if (!SPECIAL_CHARACTER_REGEX.test(password)) issues.push("Add at least one special character.");

  return {
    isValid: issues.length === 0,
    issues,
  };
}
