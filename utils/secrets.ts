import { cons } from '@constants/matrix';
import { secureLoad } from './storage';

export const KADO_API_KEY = process.env.NEXT_PUBLIC_KADO_API_KEY;

function getSecret(key: string): string | null {
  try {
    return secureLoad(key) ?? null;
  } catch (e) {
    return null;
  }
}

class Secrets {
  get accessToken() {
    return getSecret(cons.secretKey.ACCESS_TOKEN);
  }

  get deviceId() {
    return getSecret(cons.secretKey.DEVICE_ID);
  }

  get userId() {
    return getSecret(cons.secretKey.USER_ID);
  }

  get baseUrl() {
    return getSecret(cons.secretKey.BASE_URL);
  }
}

const secret = new Secrets();

const isAuthenticated = () => !!secret.accessToken;

export { isAuthenticated, secret };
