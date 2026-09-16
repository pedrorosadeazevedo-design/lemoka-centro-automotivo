import { Request, Response } from 'express';
import { saveSubscription, sendNotificationToAll } from '../services/pushService';
import { config } from '../config';

export const subscribePush = async (req: Request, res: Response) => {
  try {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }

    await saveSubscription(subscription);
    return res.status(201).json({ message: 'Inscrição de notificação salva com sucesso' });
  } catch (error) {
    console.error('Erro ao assinar push:', error);
    return res.status(500).json({ error: 'Erro ao salvar assinatura de notificação' });
  }
};

export const getVapidPublicKey = (req: Request, res: Response) => {
  return res.json({ publicKey: config.vapidKeys.publicKey });
};

export const triggerScheduledReminder = async (req: Request, res: Response) => {
  try {
    const { tipo } = req.body; // 'manha' (08:30), 'tarde' (12:30), 'fechamento' (17:30)

    let title = 'Lemoka Centro Automotivo';
    let body = 'Lembrete de revisão e manutenção preventiva.';

    if (tipo === 'morning') {
      title = '☀️ Bom dia! Equipe Lemoka Centro Automotivo';
      body = 'Hora de cadastrar o primeiro atendimento do dia no sistema!';
    } else if (tipo === 'tarde') {
      title = '🔧 Atualização da Tarde';
      body = 'Mantenha os atendimentos da manhã atualizados com os mecânicos!';
    } else if (tipo === 'fechamento') {
      title = '🏁 Fechamento do Dia';
      body = 'Confira o faturamento, comissões e fechamento do dia no Dashboard!';
    }

    const results = await sendNotificationToAll(title, body);
    return res.json({ message: 'Notificação enviada', total: results.length });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return res.status(500).json({ error: 'Erro ao enviar notificação push' });
  }
};
