import nodemailer from 'nodemailer';
import type { DailyReport } from './dailyReport';
import { hasEmailConfig, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, EMAIL_TO } from '@/lib/env';

const REMOTE_SOURCE_IDS = new Set(["remote", "v2ex-remote", "eleduck", "remotive", "weworkremotely"]);

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

  private splitSources(report: DailyReport) {
    const remoteSources = report.sources.filter((source) => REMOTE_SOURCE_IDS.has(source.id) && source.items.length > 0);
    const otherSources = report.sources.filter((source) => !REMOTE_SOURCE_IDS.has(source.id) && source.items.length > 0);

    return { remoteSources, otherSources };
  }

  private inlineFormat(text: string) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" style="color: #2563eb; text-decoration: underline;">$1</a>',
      );
  }

  private markdownToPlainText(body: string) {
    const lines: string[] = [];
    for (const rawLine of body.split("\n")) {
      const line = rawLine.trimEnd();
      const stripped = line.trim();
      if (!stripped) {
        lines.push("");
        continue;
      }
      if (stripped.startsWith("## ")) {
        lines.push(stripped.slice(3));
        lines.push("-".repeat(Math.max(8, stripped.length - 3)));
        continue;
      }
      if (/^\d+\.\s+/.test(stripped)) {
        lines.push(stripped);
        continue;
      }
      if (stripped.startsWith("- ")) {
        lines.push(`• ${stripped.slice(2)}`);
        continue;
      }
      lines.push(stripped);
    }
    return lines.join("\n").trim();
  }

  private markdownToHtml(body: string) {
    const blocks: string[] = [];
    let listOpen = false;

    const closeList = () => {
      if (listOpen) {
        blocks.push("</ul>");
        listOpen = false;
      }
    };

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }
      if (line.startsWith("## ")) {
        closeList();
        blocks.push(`<h2 style="margin: 28px 0 12px; font-size: 22px; color: #111827;">${this.inlineFormat(line.slice(3))}</h2>`);
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        closeList();
        blocks.push(`<p style="margin: 18px 0 8px; font-size: 18px; font-weight: 700; color: #111827;">${this.inlineFormat(line)}</p>`);
        continue;
      }
      if (line.startsWith("- ")) {
        if (!listOpen) {
          blocks.push('<ul style="margin: 0 0 14px 0; padding-left: 22px; color: #374151;">');
          listOpen = true;
        }
        blocks.push(`<li style="margin: 6px 0; line-height: 1.7;">${this.inlineFormat(line.slice(2))}</li>`);
        continue;
      }
      closeList();
      blocks.push(`<p style="margin: 10px 0; line-height: 1.8; color: #374151;">${this.inlineFormat(line)}</p>`);
    }

    closeList();
    return blocks.join("\n");
  }

  private generateEmailHtml(report: DailyReport): string {
    if (report.emailMarkdown) {
      return this.generateRemoteJobsEmailHtml(report);
    }

    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const { remoteSources, otherSources } = this.splitSources(report);
    const remoteItems = remoteSources.flatMap((source) =>
      source.items.map((item) => ({ ...item, sourceTitle: source.title }))
    );

    let sourcesHtml = '';
    otherSources.forEach(source => {
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

    const preheader = "今日远程岗位优先送达，附带科技动态与开发者资讯摘要。";
    const remoteHtml = remoteItems.length > 0
      ? `
        <div style="margin-bottom: 32px; padding: 24px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 16px;">
          <h2 style="margin: 0 0 8px 0; color: #9a3412; font-size: 24px;">💼 今日远程岗位</h2>
          <p style="margin: 0 0 18px 0; color: #7c2d12; line-height: 1.6;">
            优先展示本次抓取到的远程岗位，方便你先看值得投递的机会。
          </p>
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${remoteItems.map((item, index) => `
              <li style="margin-bottom: 14px; padding: 16px; background: #ffffff; border-radius: 12px; border: 1px solid #fed7aa;">
                <div style="margin-bottom: 8px; color: #c2410c; font-size: 13px; font-weight: 700;">
                  ${index + 1}. ${item.sourceTitle}
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 17px; line-height: 1.5;">
                  <a href="${item.link}" style="color: #111827; text-decoration: none;" target="_blank">
                    ${item.title}
                  </a>
                </h3>
                ${item.summary ? `<p style="margin: 0; color: #7c2d12; line-height: 1.6;">${item.summary}</p>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `
      : "";

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Daily Agent - ${date}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #ffffff; margin: 0; padding: 0;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all;">
          ${preheader}
        </div>
        <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
          <header style="text-align: center; margin-bottom: 32px; padding: 30px 0; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); border-radius: 20px; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🤖 Daily Agent</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.92;">远程岗位优先日报 - ${date}</p>
          </header>

          ${remoteHtml}

          <div style="margin-bottom: 32px; padding: 24px; background: #eff6ff; border-radius: 16px; border: 1px solid #bfdbfe;">
            <h2 style="margin: 0 0 15px 0; color: #1d4ed8; font-size: 22px;">🤖 AI 摘要</h2>
            <div style="white-space: pre-line; line-height: 1.7; color: #1e293b;">
              ${report.summary}
            </div>
          </div>

          <div>
            ${sourcesHtml}
          </div>

          <footer style="text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>🤖 由 Daily Agent 自动生成并发送</p>
            <p>⚡ Powered by OpenRouter & Next.js</p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  private generateRemoteJobsEmailHtml(report: DailyReport): string {
    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    const bodyHtml = this.markdownToHtml(report.emailMarkdown ?? "");
    const preheader = "今日远程岗位推荐已更新，优先查看国内高匹配岗位和可直接投递机会。";

    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${report.emailSubject ?? "每日远程岗位推荐"}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.65; color: #222; background: #f3f4f6; margin: 0; padding: 24px 0;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>
        <div style="max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px 40px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);">
          <div style="margin-bottom: 28px;">
            <h1 style="margin: 0; font-size: 30px; color: #111827;">每日远程岗位推荐</h1>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 15px;">${date}</p>
          </div>
          <div style="font-size: 16px;">
            ${bodyHtml}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateEmailText(report: DailyReport): string {
    if (report.emailMarkdown) {
      return this.markdownToPlainText(report.emailMarkdown);
    }

    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN');
    const { remoteSources, otherSources } = this.splitSources(report);
    const remoteItems = remoteSources.flatMap((source) =>
      source.items.map((item) => ({ ...item, sourceTitle: source.title }))
    );

    let sourcesText = '';
    otherSources.forEach(source => {
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

    let remoteText = '';
    if (remoteItems.length > 0) {
      remoteText += '## 今日远程岗位\n\n';
      remoteItems.forEach((item, index) => {
        remoteText += `${index + 1}. ${item.title}\n`;
        remoteText += `   来源: ${item.sourceTitle}\n`;
        remoteText += `   链接: ${item.link}\n`;
        if (item.summary) {
          remoteText += `   摘要: ${item.summary}\n`;
        }
        remoteText += '\n';
      });
    }

    return `
Daily Agent 远程岗位优先日报 - ${date}

${remoteText}

AI 摘要:
${report.summary}

详细资讯:${sourcesText}

---
由 Daily Agent 自动生成并发送
⚡ Powered by OpenRouter & Next.js
    `.trim();
  }

  async sendDailyReport(report: DailyReport): Promise<void> {
    const date = new Date(report.generatedAt).toLocaleDateString('zh-CN');
    const subject = report.emailSubject ?? `💼 Daily Agent 远程岗位日报 - ${date}`;

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
