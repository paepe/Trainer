import { sendPushToUser } from './_lib/fcm';

// POST /api/send-notification
// Sends a push notification to a specific user's registered device tokens.
// Body: { userId: string, title: string, body: string, url?: string }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, url } = req.body || {};
  if (!userId || !title || !body) {
    return res.status(400).json({ error: 'userId, title, and body are required' });
  }

  try {
    const result = await sendPushToUser(userId, { title, body, url });
    res.status(200).json(result);
  } catch (err) {
    console.error('[send-notification]', err);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
