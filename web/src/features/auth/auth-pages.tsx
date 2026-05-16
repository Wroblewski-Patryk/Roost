import { FormEvent, useState } from "react";
import { canonicalPostAuthPath } from "../../app-route-registry";
import { api } from "../../api/client";
import { setOwnerToken } from "../../api/auth-token";
import { userErrorMessage } from "../../api/errors";
import { CcButton } from "../../components/cc-button";
import { CcField } from "../../components/cc-field";
import { CcNotice } from "../../components/cc-notice";
import { CcTextInput } from "../../components/cc-text-input";
import { PublicLayout } from "../../layout/public-layout";
import { AuthPayload } from "../../types";
import { useLanguage } from "../../i18n/i18n";
import { AuthFormErrors, hasAuthErrors, validateAuthForm } from "./auth-validation";

export function AuthRoute({ mode }: { mode: "login" | "register" }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFormErrors>({});
  const isLogin = mode === "login";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = isLogin
      ? {
          email: String(form.get("email") || ""),
          password: String(form.get("password") || "")
        }
      : {
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
          name: String(form.get("name") || ""),
          workspaceName: String(form.get("workspaceName") || "")
        };

    const validation = validateAuthForm(payload, mode, t);
    setFieldErrors(validation);
    setSubmitError("");
    if (hasAuthErrors(validation)) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const response = await api<AuthPayload>(isLogin ? "/v1/auth/login" : "/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.data?.token) {
        throw new Error(response.error || "auth_failed");
      }
      setOwnerToken(response.data.token);
      window.location.assign(canonicalPostAuthPath(window.sessionStorage.getItem("companycorePendingPrivatePath")));
    } catch (authError) {
      setStatus("error");
      setSubmitError(userErrorMessage(authError, t));
    }
  }

  return (
    <PublicLayout active={mode}>
      <section className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-6xl content-center gap-8 px-4 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.7fr)] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase text-primary">{t(isLogin ? "auth.login.kicker" : "auth.register.kicker")}</p>
          <h1 className="mt-3 text-4xl font-black text-company-ink">{t(isLogin ? "auth.login.title" : "auth.register.title")}</h1>
          <p className="mt-4 text-lg leading-8 text-company-muted">{t("auth.description")}</p>
        </div>
        <form className="grid gap-4 rounded-company border border-base-300 bg-base-100 p-5 shadow-sm" noValidate onSubmit={onSubmit}>
          {!isLogin ? (
            <>
              <CcField label={t("auth.name")}>
                {({ id, describedBy, invalid }) => (
                  <CcTextInput
                    autoComplete="name"
                    aria-describedby={describedBy}
                    id={id}
                    invalid={invalid}
                    name="name"
                  />
                )}
              </CcField>
              <CcField error={fieldErrors.workspaceName} label={t("auth.workspaceName")} required>
                {({ id, describedBy, invalid }) => (
                  <CcTextInput
                    aria-describedby={describedBy}
                    defaultValue="LuckySparrow"
                    id={id}
                    invalid={invalid}
                    name="workspaceName"
                    required
                  />
                )}
              </CcField>
            </>
          ) : null}
          <CcField error={fieldErrors.email} label={t("auth.email")} required>
            {({ id, describedBy, invalid }) => (
              <CcTextInput
                autoComplete="email"
                aria-describedby={describedBy}
                id={id}
                invalid={invalid}
                name="email"
                required
                type="email"
              />
            )}
          </CcField>
          <CcField error={fieldErrors.password} label={t("auth.password")} required>
            {({ id, describedBy, invalid }) => (
              <CcTextInput
                aria-describedby={describedBy}
                autoComplete={isLogin ? "current-password" : "new-password"}
                id={id}
                invalid={invalid}
                minLength={isLogin ? 1 : 12}
                name="password"
                required
                type="password"
              />
            )}
          </CcField>
          {submitError ? <CcNotice live tone="error" title={submitError} /> : null}
          <CcButton loading={status === "loading"} type="submit" variant="primary">
            {t(isLogin ? "auth.submit.login" : "auth.submit.register")}
          </CcButton>
          <p className="text-sm text-company-muted">
            {t(isLogin ? "auth.needWorkspace" : "auth.alreadyHaveAccess")}{" "}
            <a className="font-bold text-primary" href={isLogin ? "/auth/register" : "/auth/login"}>{t(isLogin ? "auth.createOne" : "auth.submit.login")}</a>
          </p>
        </form>
      </section>
    </PublicLayout>
  );
}
