// Password reset email template
const { designTokens } = require('../config/designTokens');

const passwordResetTemplate = (userName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  
  // Map design tokens to template structure
  const colors = {
    primary: {
      main: designTokens.colors.red[500],
      dark: designTokens.colors.red[900]
    },
    text: {
      primary: designTokens.colors.black[900],
      secondary: designTokens.colors.metallic[700]
    },
    background: {
      primary: designTokens.colors.white
    }
  };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Restablecer Contraseña - Taller Interestellar</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: ${colors.text.primary};
          background-color: #f8f9fa;
          padding: 20px;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: ${colors.background.primary};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(28, 28, 28, 0.25);
        }
        .header {
          background: linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          color: ${colors.background.primary};
        }
        .header h2 {
          font-size: 16px;
          font-weight: 400;
          opacity: 0.95;
          color: #f8f9fa;
        }
        .content {
          padding: 40px 30px;
          background-color: ${colors.background.primary};
        }
        .greeting {
          font-size: 18px;
          margin-bottom: 20px;
          color: ${colors.text.primary};
          font-weight: 500;
        }
        .highlight {
          color: ${colors.primary.main};
          font-weight: 600;
        }
        .message {
          font-size: 16px;
          margin-bottom: 30px;
          color: #3c4043;
          line-height: 1.7;
        }
        .reset-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          position: relative;
        }
        .reset-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 2px;
        }
        .reset-card h3 {
          color: #92400e;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%);
          color: white !important;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
        }
        .warning-text {
          background: #f3f4f6;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          color: #6b7280;
          font-size: 14px;
          text-align: center;
        }
        .footer {
          background: linear-gradient(135deg, ${colors.text.primary} 0%, ${colors.text.secondary} 100%);
          color: ${colors.background.primary};
          padding: 30px;
          text-align: center;
        }
        .footer h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          color: ${colors.background.primary};
        }
        .footer p {
          opacity: 0.8;
          font-size: 14px;
          color: #B3B3B3;
        }
        .divider {
          height: 4px;
          background: linear-gradient(90deg, ${colors.primary.main}, ${colors.primary.dark}, ${colors.primary.main});
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Taller Interestellar</h1>
          <h2>Restablecer Contraseña</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
          <div class="greeting">
            Hola <span class="highlight">${userName}</span>,
          </div>
          
          <div class="message">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en Taller Interestellar.
          </div>
          
          <div class="message">
            Para continuar con el proceso, hacé clic en el siguiente botón:
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="reset-button">Restablecer contraseña</a>
          </div>
          
          <div class="warning-text">
            Si vos no solicitaste este cambio, podés ignorar este mensaje. Tu cuenta seguirá siendo segura.
          </div>
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

module.exports = { passwordResetTemplate };