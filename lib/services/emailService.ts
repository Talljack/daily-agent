import nodemailer from 'nodemailer';
import type { DailyReport } from './dailyReport';
import { hasEmailConfig, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO } from '@/lib/env';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  static fromEnv(): EmailService | null {
    if (!hasEmailConfig()) {
      return null;
    }

    const config: EmailConfig = {
      host: SMTP_HOST!,
      port: SMTP_PORT!,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER!,
        pass: SMTP_PASS!
      },
      from: EMAIL_FROM!,
      to: EMAIL_TO!,
    };

    return new EmailService(config);
  }

  private generateEmailHtml(report: DailyReport): string {
    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    let sourcesHtml = '';
    report.sources.forEach(source => {
      if (source.items.length > 0) {
        sourcesHtml += `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #2563eb; font-size: 20px; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
              ${source.title}
            </h2>
            ${source.description ? `<p style="color: #6b7280; margin-bottom: 15px;">${source.description}</p>` : ''}
            <ul style="list-style: none; padding: 0;">
              ${source.items.map(item => `
                <li style="margin-bottom: 15px; padding: 15px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px;">
                    <a href="${item.link}" style="color: #1f2937; text-decoration: none;" target="_blank">
                      ${item.title}
                    </a>
                  </h3>
                  ${item.summary ? `<p style="color: #6b7280; margin: 0; line-height: 1.5;">${item.summary}</p>` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
    });

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Agent - ${date}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <header style="text-align: center; margin-bottom: 40px; padding: 30px 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🤖 Daily Agent</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">AI驱动的科技日报 - ${date}</p>
          </header>

          <div style="margin-bottom: 40px; padding: 25px; background: #f0f9ff; border-radius: 12px; border: 1px solid #bae6fd;">
            <h2 style="margin: 0 0 15px 0; color: #0c4a6e; font-size: 20px;">🤖 Grok AI 摘要</h2>
            <div style="white-space: pre-line; line-height: 1.7; color: #1e293b;">
              ${report.summary}
            </div>
          </div>

          <div>
            ${sourcesHtml}
          </div>

          <footer style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>🤖 由 Daily Agent 自动生成并发送</p>
            <p>⚡ Powered by Grok AI & Next.js</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailText(report: DailyReport): string {
    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN');

    let sourcesText = '';
    report.sources.forEach(source => {
      if (source.items.length > 0) {
        sourcesText += `\n\n## ${source.title}\n`;
        if (source.description) {
          sourcesText += `${source.description}\n\n`;
        }
        source.items.forEach((item, index) => {
          sourcesText += `${index + 1}. ${item.title}\n`;
          sourcesText += `   链接: ${item.link}\n`;
          if (item.summary) {
            sourcesText += `   摘要: ${item.summary}\n`;
          }
          sourcesText += '\n';
        });
      }
    });

    return `
Daily Agent - ${date}

Grok AI 摘要:
${report.summary}

详细资讯:${sourcesText}

---
由 Daily Agent 自动生成并发送
⚡ Powered by Grok AI & Next.js
    `.trim();
  }

  async sendDailyReport(report: DailyReport): Promise<void> {
    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN');
    const subject = `🤖 Daily Agent 科技日报 - ${date}`;

    const mailOptions = {
      from: this.config.from,
      to: this.config.to,
      subject,
      text: this.generateEmailText(report),
      html: this.generateEmailHtml(report),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ 邮件发送成功: ${info.messageId}`);
      console.log(`📧 收件人: ${this.config.to.join(', ')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 邮件发送失败: ${message}`);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP连接测试成功');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ SMTP连接测试失败: ${message}`);
      return false;
    }
  }
}