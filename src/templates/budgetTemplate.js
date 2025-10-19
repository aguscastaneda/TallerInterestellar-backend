const { designTokens } = require('../config/designTokens');

const budgetTemplate = (carData, budgetData, clientName) => {
  const currentDateTime = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

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
    },
    warning: {
      bg: '#fef3c7',
      color: '#92400e',
      cardBg: '#fffbeb',
      cardBorder: '#fde68a'
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Presupuesto para su vehículo - Taller Interestellar</title>
    </head>
    <body style="margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: ${colors.text.primary}; background-color: #f8f9fa; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: ${colors.background.primary}; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(28, 28, 28, 0.25);">
        <div style="background: linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 8px; color: ${colors.background.primary};">Taller Interestellar</h1>
          <h2 style="font-size: 16px; font-weight: 400; opacity: 0.95; color: #f8f9fa;">Presupuesto detallado para su vehículo</h2>
        </div>
        
        <div style="height: 4px; background: linear-gradient(90deg, ${colors.primary.main}, ${colors.primary.dark}, ${colors.primary.main});"></div>
        
        <div style="padding: 40px 30px; background-color: ${colors.background.primary};">
          <div style="font-size: 18px; margin-bottom: 20px; color: ${colors.text.primary}; font-weight: 500;">
            Hola <span style="color: ${colors.primary.main}; font-weight: 600;">${clientName}</span>,
          </div>
          
          <div style="font-size: 16px; margin-bottom: 30px; color: #3c4043; line-height: 1.7;">
            Le informamos que nuestro mecánico ha preparado un presupuesto detallado para la reparación de su vehículo.
          </div>
          
          <div style="background: linear-gradient(135deg, ${colors.warning.cardBg} 0%, ${colors.warning.bg} 100%); border: 1px solid ${colors.warning.cardBorder}; border-radius: 12px; padding: 24px; margin: 30px 0; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(135deg, ${colors.warning.color} 0%, ${colors.warning.color} 100%); border-radius: 2px;"></div>
            <h3 style="color: ${colors.warning.color}; font-size: 16px; font-weight: 600; margin-bottom: 16px; margin-left: 12px;">Información del Vehículo</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8eaed; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Patente:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;"><strong>${carData.licensePlate}</strong></span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8eaed; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Marca:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;">${carData.brand}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8eaed; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Modelo:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;">${carData.model}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Fecha y Hora:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;">${currentDateTime}</span>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, ${colors.warning.cardBg} 0%, ${colors.warning.bg} 100%); border: 1px solid ${colors.warning.cardBorder}; border-radius: 12px; padding: 24px; margin: 30px 0; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: linear-gradient(135deg, ${colors.warning.color} 0%, ${colors.warning.color} 100%); border-radius: 2px;"></div>
            <h3 style="color: ${colors.warning.color}; font-size: 16px; font-weight: 600; margin-bottom: 16px; margin-left: 12px;">Detalles del Presupuesto</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #e8eaed; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Descripción del trabajo:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;">${budgetData.description}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; margin-left: 12px;">
              <span style="font-weight: 600; color: ${colors.text.primary}; font-size: 14px;">Costo estimado:</span>
              <span style="color: #5f6368; text-align: right; font-size: 14px;">$${parseFloat(budgetData.cost).toFixed(2)}</span>
            </div>
          </div>
          
          <div style="font-size: 16px; margin-bottom: 30px; color: #3c4043; line-height: 1.7;">
            Por favor, revise el presupuesto y confirme si desea proceder con la reparación o rechazarla.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-budget?carId=${carData.id}" 
               style="display: inline-block; background: linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%); color: ${colors.background.primary}; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 10px 10px 0; transition: transform 0.2s ease; border: none; cursor: pointer;">
              Aceptar Presupuesto
            </a>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/reject-budget?carId=${carData.id}" 
               style="display: inline-block; background: linear-gradient(135deg, #6b7280 0%, #374151 100%); color: ${colors.background.primary}; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 0 10px 10px; transition: transform 0.2s ease; border: none; cursor: pointer;">
              Rechazar Presupuesto
            </a>
          </div>
          
          <div style="background: #fffbeb; border: 1px solid #fde68a; color: #92400e; padding: 16px; border-radius: 12px; margin: 20px 0; font-size: 14px;">
            <strong>Importante:</strong> Al aceptar el presupuesto, autoriza al taller a comenzar con la reparación de su vehículo. 
            Al rechazar el presupuesto, su solicitud volverá al estado de entrada y no se realizará ningún trabajo.
          </div>
        </div>
        
        <div style="background: linear-gradient(135deg, ${colors.text.primary} 0%, ${colors.text.secondary} 100%); color: ${colors.background.primary}; padding: 30px; text-align: center;">
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: ${colors.background.primary};">El equipo de Taller Interestellar</h3>
          <p style="opacity: 0.8; font-size: 14px; color: #B3B3B3;">Sistema de gestión automotriz profesional</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { budgetTemplate };