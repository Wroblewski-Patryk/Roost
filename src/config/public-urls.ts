/** Public addresses belong to each installation, never to the distributed code. */
export function publicUrlConfiguration(values: NodeJS.ProcessEnv) {
  const csv = (value?: string) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  function origin(value: string | undefined, name: string) {
    if (!value?.trim()) return undefined;
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error(`Invalid public origin configuration: ${name}`);
    }
    return url.origin;
  }
  const serviceOrigins = csv(values.SERVICE_URL_BACKEND_3000).map((value) => origin(value, "SERVICE_URL_BACKEND_3000")!);
  const publicWebBaseUrl = origin(values.COMPANYCORE_PUBLIC_WEB_BASE_URL, "COMPANYCORE_PUBLIC_WEB_BASE_URL") ?? serviceOrigins[0];
  const publicApiBaseUrl = origin(values.COMPANYCORE_PUBLIC_API_BASE_URL, "COMPANYCORE_PUBLIC_API_BASE_URL") ?? publicWebBaseUrl;
  const explicitHosts = csv(values.COMPANYCORE_API_HOSTS);
  const apiHostnames = explicitHosts.length ? explicitHosts : publicApiBaseUrl && publicWebBaseUrl && publicApiBaseUrl !== publicWebBaseUrl
    ? [new URL(publicApiBaseUrl).hostname] : [];
  const explicitOrigins = csv(values.COMPANYCORE_ALLOWED_ORIGINS);
  const corsAllowedOrigins = explicitOrigins.length ? explicitOrigins.map((value) => origin(value, "COMPANYCORE_ALLOWED_ORIGINS")!)
    : [...new Set([publicWebBaseUrl, publicApiBaseUrl, ...serviceOrigins].filter((value): value is string => Boolean(value)))];
  return { publicWebBaseUrl, publicApiBaseUrl, apiHostnames, corsAllowedOrigins };
}
