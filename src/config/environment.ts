/**
 * 環境変数の安全な管理
 * 必須の環境変数が設定されていない場合はエラーを投げる
 */

interface EnvironmentConfig {
  googleMapsApiKey: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    functionsRegion?: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * 環境変数を取得する
 * 本番環境で必須の環境変数が設定されていない場合はエラーを投げる
 */
const getEnvironmentVariable = (key: string, required = true): string => {
  const value = import.meta.env[key];
  
  if (!value && required && import.meta.env.PROD) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value || '';
};

/**
 * 環境設定
 */
export const config: EnvironmentConfig = {
  googleMapsApiKey: getEnvironmentVariable('VITE_GOOGLE_MAPS_API_KEY'),
  firebase: {
    apiKey: getEnvironmentVariable('VITE_FB_API_KEY'),
    authDomain: getEnvironmentVariable('VITE_FB_AUTH_DOMAIN'),
    projectId: getEnvironmentVariable('VITE_FB_PROJECT_ID'),
    storageBucket: getEnvironmentVariable('VITE_FB_STORAGE_BUCKET'),
    messagingSenderId: getEnvironmentVariable('VITE_FB_MSG_SENDER_ID'),
    appId: getEnvironmentVariable('VITE_FB_APP_ID'),
    functionsRegion: getEnvironmentVariable('VITE_FB_FUNCTIONS_REGION', false),
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

/**
 * 環境変数の検証
 * アプリケーション起動時に実行される
 */
export const validateEnvironment = (): void => {
  const requiredVars = [
    'VITE_GOOGLE_MAPS_API_KEY',
    'VITE_FB_API_KEY',
    'VITE_FB_AUTH_DOMAIN',
    'VITE_FB_PROJECT_ID',
    'VITE_FB_STORAGE_BUCKET',
    'VITE_FB_MSG_SENDER_ID',
    'VITE_FB_APP_ID',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !import.meta.env[varName]
  );

  if (missingVars.length > 0 && import.meta.env.PROD) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // 開発環境では警告のみ
  if (missingVars.length > 0 && import.meta.env.DEV) {
    console.warn(
      `⚠️ Missing environment variables: ${missingVars.join(', ')}\n` +
      'Please check .env.example for required variables.'
    );
  }
};