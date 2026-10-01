const defaultOrigins = ['http://localhost:3000', 'https://kuraryu.jp'];

export function getCorsOrigins(): string[] {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? defaultOrigins
  );
}

export function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  callback(null, origin === undefined || getCorsOrigins().includes(origin));
}
