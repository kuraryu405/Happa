import { corsOrigin, getCorsOrigins } from './cors-origins';

describe('CORS origins', () => {
  const originalOrigins = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalOrigins;
    }
  });

  it('reads configured origins at request time', () => {
    process.env.CORS_ORIGINS = 'https://first.example';
    expect(getCorsOrigins()).toEqual(['https://first.example']);

    process.env.CORS_ORIGINS = 'https://second.example';
    expect(getCorsOrigins()).toEqual(['https://second.example']);

    let allowed: boolean | undefined;
    corsOrigin('https://second.example', (_error, result) => {
      allowed = result;
    });
    expect(allowed).toBe(true);
  });

  it('rejects an origin that is not configured', () => {
    process.env.CORS_ORIGINS = 'https://allowed.example';

    let allowed: boolean | undefined;
    corsOrigin('https://blocked.example', (_error, result) => {
      allowed = result;
    });
    expect(allowed).toBe(false);
  });
});
