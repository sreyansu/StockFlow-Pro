import nodemailer from 'nodemailer';

// Create alert in database
export async function createAlert(client, { product_id, alert_type, message }) {
  try {
    const result = await client.query(
      'INSERT INTO alerts (product_id, alert_type, message) VALUES ($1, $2, $3) RETURNING *',
      [product_id, alert_type, message]
    );
    
    // Send notification (email, webhook, etc.)
    await sendNotification({
      type: alert_type,
      message,
      product_id
    });
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create alert:', error);
  }
}

// Send notifications
async function sendNotification({ type, message, product_id }) {
  try {
    // Email notification
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL || 'admin@stockflow.com',
        subject: `StockFlow Pro Alert: ${type}`,
        text: message,
        html: `
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
        `
      });
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