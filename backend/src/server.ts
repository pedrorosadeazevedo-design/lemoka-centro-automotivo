import express from 'express';
import cors from 'cors';
import routes from './routes';
import { config } from './config';

const app = express();

// Enable CORS for all origins (Netlify, mobile, localhost)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes API
app.use('/api', routes);

// Root healthcheck
app.get('/', (req, res) => {
  res.json({
    app: 'Lemoka Centro Automotivo API',
    status: 'online',
    timestamp: new Date()
  });
});

// Global production-safe error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Internal Error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(err.status || 500).json({
    error: isProd ? 'Ocorreu um erro interno no servidor.' : (err.message || 'Erro interno no servidor'),
    ...(isProd ? {} : { stack: err.stack })
  });
});

app.listen(config.port, () => {
  console.log(`⚡ API Lemoka Centro Automotivo rodando na porta ${config.port}`);
});
