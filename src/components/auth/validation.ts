import { PASSWORD_MIN_LENGTH, emailPattern } from "./constants";

export function validateEmail(value: string) {
  if (!value.trim()) {
    return "Adres email jest wymagany.";
  }

  if (!emailPattern.test(value.trim())) {
    return "Podaj poprawny adres email.";
  }

  return "";
}

export function validatePassword(value: string) {
  if (!value) {
    return "Hasło jest wymagane.";
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
  }

  return "";
}
