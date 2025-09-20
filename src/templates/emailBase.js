// Base email template with shared styles and structure
const { designTokens } = require('../config/designTokens');

const baseEmailTemplate = (content, theme = 'primary') => {
  // Theme configurations using design tokens
  const themes = {
    primary: {
      gradient: `linear-gradient(135deg, ${designTokens.colors.red[500]} 0%, ${designTokens.colors.red[800]} 100%)`,
      highlight: designTokens.colors.red[500],
      cardBg: `linear-gradient(135deg, ${designTokens.colors.red[50]} 0%, ${designTokens.colors.red[100]} 100%)`,
      cardBorder: designTokens.colors.red[300],
      divider: `linear-gradient(90deg, ${designTokens.colors.red[500]}, ${designTokens.colors.red[800]}, ${designTokens.colors.red[500]})`
    },
    success: {
      gradient: `linear-gradient(135deg, ${designTokens.colors.green[500]} 0%, ${designTokens.colors.green[700]} 100%)`,
      highlight: designTokens.colors.green[500],
      cardBg: `linear-gradient(135deg, ${designTokens.colors.green[50]} 0%, ${designTokens.colors.green[100]} 100%)`,
      cardBorder: designTokens.colors.green[300],
      divider: `linear-gradient(90deg, ${designTokens.colors.green[500]}, ${designTokens.colors.green[700]}, ${designTokens.colors.green[500]})`
    },
    warning: {
      gradient: `linear-gradient(135deg, ${designTokens.colors.yellow[500]} 0%, ${designTokens.colors.yellow[700]} 100%)`,
      highlight: designTokens.colors.yellow[500],
      cardBg: `linear-gradient(135deg, ${designTokens.colors.yellow[50]} 0%, ${designTokens.colors.yellow[100]} 100%)`,
      cardBorder: designTokens.colors.yellow[300],
      divider: `linear-gradient(90deg, ${designTokens.colors.yellow[500]}, ${designTokens.colors.yellow[700]}, ${designTokens.colors.yellow[500]})`
    },
    danger: {
      gradient: `linear-gradient(135deg, ${designTokens.colors.orange[500]} 0%, ${designTokens.colors.orange[700]} 100%)`,
      highlight: designTokens.colors.orange[500],
      cardBg: `linear-gradient(135deg, ${designTokens.colors.orange[50]} 0%, ${designTokens.colors.orange[100]} 100%)`,
      cardBorder: designTokens.colors.orange[300],
      divider: `linear-gradient(90deg, ${designTokens.colors.orange[500]}, ${designTokens.colors.orange[700]}, ${designTokens.colors.orange[500]})`
    }
  };

  const currentTheme = themes[theme] || themes.primary;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.title} - Taller Interestellar</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: ${designTokens.typography.fontFamily.sans.join(', ')};
          line-height: 1.6;
          color: ${designTokens.colors.black[900]};
          background-color: ${designTokens.colors.metallic[50]};
          padding: 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: ${designTokens.colors.white};
          border-radius: ${designTokens.borderRadius['2xl']};
          overflow: hidden;
          box-shadow: ${designTokens.boxShadow['2xl']};
        }
        .header {
          background: ${currentTheme.gradient};
          color: ${designTokens.colors.white};
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: ${designTokens.typography.fontSize['3xl'][0]};
          font-weight: ${designTokens.typography.fontWeight.bold};
          margin-bottom: 8px;
          color: ${designTokens.colors.white};
        }
        .header h2 {
          font-size: ${designTokens.typography.fontSize.base[0]};
          font-weight: ${designTokens.typography.fontWeight.normal};
          opacity: 0.95;
          color: ${designTokens.colors.metallic[50]};
        }
        .content {
          padding: 40px 30px;
          background-color: ${designTokens.colors.white};
        }
        .greeting {
          font-size: ${designTokens.typography.fontSize.lg[0]};
          margin-bottom: 20px;
          color: ${designTokens.colors.black[900]};
          font-weight: ${designTokens.typography.fontWeight.medium};
        }
        .highlight {
          color: ${currentTheme.highlight};
          font-weight: ${designTokens.typography.fontWeight.semibold};
        }
        .message {
          font-size: ${designTokens.typography.fontSize.base[0]};
          margin-bottom: 25px;
          color: ${designTokens.colors.metallic[700]};
          line-height: 1.7;
        }
        .card {
          background: ${currentTheme.cardBg};
          border: 1px solid ${currentTheme.cardBorder};
          border-radius: ${designTokens.borderRadius.xl};
          padding: 24px;
          margin: 30px 0;
          position: relative;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: ${currentTheme.gradient};
          border-radius: 2px;
        }
        .card h3 {
          color: ${currentTheme.highlight};
          font-size: ${designTokens.typography.fontSize.base[0]};
          font-weight: ${designTokens.typography.fontWeight.semibold};
          margin-bottom: 16px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid ${designTokens.colors.metallic[200]};
        }
        .detail-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: ${designTokens.typography.fontWeight.semibold};
          color: ${designTokens.colors.black[900]};
          font-size: ${designTokens.typography.fontSize.sm[0]};
        }
        .detail-value {
          color: ${designTokens.colors.metallic[600]};
          text-align: right;
          font-size: ${designTokens.typography.fontSize.sm[0]};
        }
        .button {
          display: inline-block;
          background: ${currentTheme.gradient};
          color: ${designTokens.colors.white};
          padding: 16px 32px;
          border-radius: ${designTokens.borderRadius.lg};
          text-decoration: none;
          font-weight: ${designTokens.typography.fontWeight.semibold};
          font-size: ${designTokens.typography.fontSize.base[0]};
          margin: 20px 0;
          transition: transform 0.2s ease;
        }
        .button:hover {
          transform: translateY(-1px);
        }
        .footer {
          background: linear-gradient(135deg, ${designTokens.colors.black[900]} 0%, ${designTokens.colors.black[700]} 100%);
          color: ${designTokens.colors.white};
          padding: 30px;
          text-align: center;
        }
        .footer h3 {
          font-size: ${designTokens.typography.fontSize.lg[0]};
          font-weight: ${designTokens.typography.fontWeight.semibold};
          margin-bottom: 8px;
          color: ${designTokens.colors.white};
        }
        .footer p {
          opacity: 0.8;
          font-size: ${designTokens.typography.fontSize.sm[0]};
          color: ${designTokens.colors.metallic[500]};
        }
        .divider {
          height: 4px;
          background: ${currentTheme.divider};
        }
        .warning-text {
          background: ${designTokens.colors.yellow[50]};
          border: 1px solid ${designTokens.colors.yellow[200]};
          color: ${designTokens.colors.yellow[800]};
          padding: 16px;
          border-radius: ${designTokens.borderRadius.lg};
          margin: 20px 0;
          font-size: ${designTokens.typography.fontSize.sm[0]};
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Taller Interestellar</h1>
          <h2>${content.subtitle}</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
          ${content.body}
        </div>
        
        <div class="footer">
          <h3>El equipo de Taller Interestellar</h3>
          <p>Sistema de gestión automotriz profesional</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { baseEmailTemplate };