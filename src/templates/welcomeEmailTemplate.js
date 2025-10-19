const { designTokens } = require('../config/designTokens');

const welcomeEmailTemplate = (userName) => {
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
      <title>Bienvenido - Taller Interestellar</title>
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
        .welcome-card {
          background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
          border: 1px solid #a5d6a7;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          position: relative;
        }
        .welcome-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, #4CAF50 0%, #388e3c 100%);
          border-radius: 2px;
        }
        .welcome-card h3 {
          color: #2e7d32;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .welcome-card p {
          color: #1b5e20;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .welcome-card p:last-child {
          margin-bottom: 0;
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
          <h2>¡Bienvenido!</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
          <div class="greeting">
            Hola <span class="highlight">${userName}</span>,
          </div>
          
          <div class="message">
            ¡Te damos la bienvenida a <strong>Taller Interestellar</strong>!
          </div>
          
          <div class="welcome-card">
            <h3>¡Cuenta creada exitosamente!</h3>
            <p>Tu cuenta ha sido registrada y ya está lista para usar.</p>
            <p>Podés comenzar a explorar todas nuestras funcionalidades.</p>
          </div>
          
          <div class="message">
            Estamos aquí para ayudarte con todas tus necesidades automotrices.
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

module.exports = { welcomeEmailTemplate };