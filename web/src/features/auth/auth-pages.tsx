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
  const [passwordVisible, setPasswordVisible] = useState(false);
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
      <section className="roost-auth-shell">
        <div className="roost-auth-context">
          <p className="roost-auth-kicker">{t(isLogin ? "auth.login.kicker" : "auth.register.kicker")}</p>
          <h1>{t(isLogin ? "auth.login.title" : "auth.register.title")}</h1>
          <p>{t(isLogin ? "auth.login.description" : "auth.register.description")}</p>
        </div>
        <form className="roost-auth-card" noValidate onSubmit={onSubmit}>
          <header className="roost-auth-card-header">
            <span className="roost-auth-card-icon"><i className={`ph-bold ${isLogin ? "ph-lock-key" : "ph-buildings"}`} aria-hidden="true"></i></span>
            <div>
              <h2>{t(isLogin ? "auth.form.loginTitle" : "auth.form.registerTitle")}</h2>
              <p>{t(isLogin ? "auth.form.loginDescription" : "auth.form.registerDescription")}</p>
            </div>
          </header>
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
              <div className="roost-auth-password">
                <CcTextInput
                  aria-describedby={describedBy}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="pr-12"
                  id={id}
                  invalid={invalid}
                  minLength={isLogin ? 1 : 12}
                  name="password"
                  required
                  type={passwordVisible ? "text" : "password"}
                />
                <button
                  aria-label={t(passwordVisible ? "auth.password.hide" : "auth.password.show")}
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  title={t(passwordVisible ? "auth.password.hide" : "auth.password.show")}
                  type="button"
                >
                  <i className={`ph-bold ${passwordVisible ? "ph-eye-slash" : "ph-eye"}`} aria-hidden="true"></i>
                </button>
              </div>
            )}
          </CcField>
          {submitError ? <CcNotice live tone="error" title={submitError} /> : null}
          <CcButton className="roost-auth-submit" iconRight="ph-arrow-right" loading={status === "loading"} type="submit" variant="primary">
            {t(isLogin ? "auth.submit.login" : "auth.submit.register")}
          </CcButton>
          {!isLogin ? <div className="roost-auth-switch">
            <span>{t(isLogin ? "auth.needWorkspace" : "auth.alreadyHaveAccess")}</span>
            <a href={isLogin ? "/auth/register" : "/auth/login"}>
              {t(isLogin ? "auth.createOne" : "auth.submit.login")}
              <i className="ph-bold ph-arrow-up-right" aria-hidden="true"></i>
            </a>
          </div> : null}
        </form>
      </section>
    </PublicLayout>
  );
}
