import brevo from '@getbrevo/brevo';
import { db } from '../config/firebase.js';

// Create alert in database
export async function createAlert({ product_id, alert_type, message }) {
  try {
    const newAlert = {
      product_id,
      alert_type,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection('alerts').add(newAlert);
    
    // Send notification (email, webhook, etc.)
    await sendNotification({
      type: alert_type,
      message,
      product_id
    });
    
    return { id: docRef.id, ...newAlert };
  } catch (error) {
    console.error('Failed to create alert:', error);
  }
}

// Send notifications
async function sendNotification({ type, message, product_id }) {
  try {
    // Email notification
    if (process.env.BREVO_API_KEY) {
      const apiInstance = new brevo.TransactionalEmailsApi();
      const apiKey = apiInstance.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;

      const sendSmtpEmail = new brevo.SendSmtpEmail();

      sendSmtpEmail.subject = `StockFlow Pro Alert: ${type}`;
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">StockFlow Pro Alert</h2>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>${type}</strong></p>
            <p style="margin: 10px 0 0 0; color: #92400e;">${message}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated alert from StockFlow Pro inventory management system.
          </p>
        </div>
      `;
      sendSmtpEmail.sender = { name: 'StockFlow Pro', email: process.env.BREVO_SENDER_EMAIL || 'noreply@stockflow.com' };
      sendSmtpEmail.to = [{ email: process.env.ALERT_EMAIL || 'admin@stockflow.com' }];

      await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Brevo email sent successfully.');
    }

    // Slack webhook notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 StockFlow Pro Alert: ${message}`,
          username: 'StockFlow Pro',
          icon_emoji: ':warning:'
        })
      });
    }

  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}