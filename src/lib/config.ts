export const BILLING_ENABLED = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
export const PRE_RELEASE = process.env.NEXT_PUBLIC_PRE_RELEASE === "true";
export const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
