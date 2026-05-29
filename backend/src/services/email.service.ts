import nodemailer from 'nodemailer';
import logger from '../lib/logger';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const emailService = {
  async sendWelcomeEmail(to: string, name: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: '🎉 Welcome to Splitwise Clone!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1cc29f;">Welcome, ${name}!</h1>
            <p>Thanks for joining Splitwise Clone. You can now track shared expenses, settle debts, and manage group spending.</p>
            <a href="${process.env.FRONTEND_URL}" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Get Started
            </a>
          </div>
        `,
      });
      logger.info(`Welcome email sent to ${to}`);
    } catch (err) {
      logger.error('Failed to send welcome email', { error: err });
    }
  },

  async sendVerificationEmail(to: string, name: string, token: string) {
    try {
      const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: '✉️ Verify your email for Splitwise Clone',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1cc29f;">Welcome, ${name}!</h1>
            <p>Please verify your email address to complete your registration.</p>
            <a href="${link}" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Verify Email
            </a>
            <p style="margin-top: 24px; color: #666; font-size: 12px;">This link expires in 24 hours.</p>
          </div>
        `,
      });
      logger.info(`Verification email sent to ${to}`);
    } catch (err) {
      logger.error('Failed to send verification email', { error: err });
    }
  },

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    try {
      const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: '🔒 Reset your password for Splitwise Clone',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1cc29f;">Password Reset Request</h2>
            <p>Hi ${name},</p>
            <p>You requested to reset your password. Click the button below to set a new password.</p>
            <a href="${link}" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Reset Password
            </a>
            <p style="margin-top: 24px; color: #666; font-size: 12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      logger.info(`Password reset email sent to ${to}`);
    } catch (err) {
      logger.error('Failed to send password reset email', { error: err });
    }
  },

  async sendExpenseNotification(
    to: string,
    name: string,
    expenseTitle: string,
    amount: number,
    payer: string
  ) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `💸 New expense: ${expenseTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1cc29f;">New Expense Added</h2>
            <p>Hi ${name},</p>
            <p><strong>${payer}</strong> added a new expense: <strong>${expenseTitle}</strong></p>
            <p>Your share: <strong>$${amount.toFixed(2)}</strong></p>
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              View Expense
            </a>
          </div>
        `,
      });
    } catch (err) {
      logger.error('Failed to send expense notification', { error: err });
    }
  },

  async sendPaymentReminder(to: string, name: string, amount: number, owedTo: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `⏰ Reminder: You owe $${amount.toFixed(2)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">Payment Reminder</h2>
            <p>Hi ${name},</p>
            <p>This is a friendly reminder that you owe <strong>$${amount.toFixed(2)}</strong> to <strong>${owedTo}</strong>.</p>
            <a href="${process.env.FRONTEND_URL}/settlements" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              Settle Up
            </a>
          </div>
        `,
      });
    } catch (err) {
      logger.error('Failed to send payment reminder', { error: err });
    }
  },

  async sendSettlementConfirmation(to: string, name: string, amount: number, settledWith: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `✅ Payment of $${amount.toFixed(2)} confirmed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1cc29f;">Payment Confirmed!</h2>
            <p>Hi ${name},</p>
            <p>Your payment of <strong>$${amount.toFixed(2)}</strong> to <strong>${settledWith}</strong> has been recorded.</p>
            <a href="${process.env.FRONTEND_URL}/settlements" style="background: #1cc29f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
              View History
            </a>
          </div>
        `,
      });
    } catch (err) {
      logger.error('Failed to send settlement confirmation', { error: err });
    }
  },
};
