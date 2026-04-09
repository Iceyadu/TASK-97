type BcryptLike = {
  hash(data: string, saltOrRounds: string | number): Promise<string>;
  compare(data: string, encrypted: string): Promise<boolean>;
};

function loadBcrypt(): BcryptLike {
  try {
    // Prefer native bcrypt when available.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('bcrypt') as BcryptLike;
  } catch {
    // Fallback for environments where native bindings are unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('bcryptjs') as BcryptLike;
  }
}

export const bcryptAdapter = loadBcrypt();
