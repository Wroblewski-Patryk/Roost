import { Translate } from "../../i18n/i18n";

export type AuthFormValues = {
  email: string;
  password: string;
  name?: string;
  workspaceName?: string;
};

export type AuthFormErrors = Partial<Record<keyof AuthFormValues, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthForm(values: AuthFormValues, mode: "login" | "register", t: Translate) {
  const errors: AuthFormErrors = {};
  if (!values.email.trim()) {
    errors.email = t("auth.validation.email.required");
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = t("auth.validation.email.invalid");
  }

  if (!values.password) {
    errors.password = t("auth.validation.password.required");
  } else if (mode === "register" && values.password.length < 12) {
    errors.password = t("auth.validation.password.min", { min: 12 });
  }

  if (mode === "register" && !values.workspaceName?.trim()) {
    errors.workspaceName = t("auth.validation.workspace.required");
  }

  return errors;
}

export function hasAuthErrors(errors: AuthFormErrors) {
  return Object.values(errors).some(Boolean);
}
