import dotenv from 'dotenv';
import path from 'path';

// Carrega .env do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const jwtSecret = process.env.JWT_SECRET;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!jwtSecret) {
  console.warn('⚠️ JWT_SECRET não configurado nas variáveis de ambiente. Utilizando padrão seguro de desenvolvimento.');
}

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️ Chaves VAPID não configuradas nas variáveis de ambiente. Notificações Push podem não funcionar até o preenchimento do .env.');
}

export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: jwtSecret || 'lemoka_prod_secret_key_8f93a1c2b5d4e6f7a8b9c0d1e2f3a4b5',
  vapidKeys: {
    publicKey: vapidPublicKey || '',
    privateKey: vapidPrivateKey || ''
  }
};

export default config;
