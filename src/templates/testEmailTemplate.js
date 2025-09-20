// Test email template
const { designTokens } = require('../config/designTokens');

const testEmailTemplate = () => {
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
      <title>Prueba de Email - Taller Interestellar</title>
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
          text-align: center;
        }
        .test-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          margin-bottom: 20px;
          color: #3c4043;
          line-height: 1.7;
        }
        .test-card {
          background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
          border: 1px solid #fb923c;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          position: relative;
        }
        .test-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
          border-radius: 2px;
        }
        .test-card h3 {
          color: #ea580c;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #e8eaed;
        }
        .detail-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: 600;
          color: ${colors.text.primary};
          font-size: 14px;
        }
        .detail-value {
          color: #5f6368;
          text-align: right;
          font-size: 14px;
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
          <h2>Email de Prueba</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
          <h2>¡Sistema funcionando correctamente!</h2>
          
          <div class="message">
            Este es un email de prueba del sistema de Taller Interestellar.
          </div>
          
          <div class="message">
            Si recibís este mensaje, la configuración SMTP está funcionando perfectamente.
          </div>
          
          <div class="test-card">
            <h3>Estado del Sistema</h3>
            <div class="detail-item">
              <span class="detail-label">Fecha de prueba:</span>
              <span class="detail-value">${new Date().toLocaleString('es-AR')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Estado del sistema:</span>
              <span class="detail-value">Operativo</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Configuración SMTP:</span>
              <span class="detail-value">Exitosa</span>
            </div>
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

module.exports = { testEmailTemplate };