const defaultOrigins = ["http://localhost:3000", "https://kuraryu.jp"];

export const corsOrigins =
  process.env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? defaultOrigins;
