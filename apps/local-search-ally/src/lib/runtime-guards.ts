export function isProductionRuntime(env = process.env) {
  return env.NODE_ENV === "production";
}

export function developmentFixturesEnabled(env = process.env) {
  return !isProductionRuntime(env) || env.ENABLE_DEVELOPMENT_FIXTURE_ROUTES === "true";
}

export function developmentProductAccessEnabled(env = process.env) {
  return !isProductionRuntime(env);
}

export function sandboxCheckoutPreviewEnabled(env = process.env) {
  return !isProductionRuntime(env) || env.ENABLE_SANDBOX_CHECKOUT_PREVIEW === "true";
}

export function assertSandboxCheckoutPreviewEnabled(env = process.env) {
  if (!sandboxCheckoutPreviewEnabled(env)) {
    throw new Error("Sandbox checkout preview is unavailable in this environment.");
  }
}

export const noIndexMetadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
} as const;
