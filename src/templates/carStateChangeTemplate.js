const { designTokens } = require('../config/designTokens');
const { CAR_STATUS } = require('../constants');

const STATE_COLORS = {
  [CAR_STATUS.ENTRADA]: { bg: '#f9fafb', color: '#374151', cardBg: '#f3f4f6', cardBorder: '#d1d5db' },
  [CAR_STATUS.PENDIENTE]: { bg: '#fef3c7', color: '#92400e', cardBg: '#fffbeb', cardBorder: '#fde68a' },
  [CAR_STATUS.EN_REVISION]: { bg: '#dbeafe', color: '#1e40af', cardBg: '#eff6ff', cardBorder: '#bfdbfe' },
  [CAR_STATUS.RECHAZADO]: { bg: '#fee2e2', color: '#dc2626', cardBg: '#fef2f2', cardBorder: '#fecaca' },
  [CAR_STATUS.EN_REPARACION]: { bg: '#ede9fe', color: '#7c3aed', cardBg: '#f5f3ff', cardBorder: '#ddd6fe' },
  [CAR_STATUS.FINALIZADO]: { bg: '#dcfce7', color: '#16a34a', cardBg: '#f0fdf4', cardBorder: '#bbf7d0' },
  [CAR_STATUS.ENTREGADO]: { bg: '#e0e7ff', color: '#4338ca', cardBg: '#eef2ff', cardBorder: '#c7d2fe' },
  [CAR_STATUS.CANCELADO]: { bg: '#fed7aa', color: '#ea580c', cardBg: '#fff7ed', cardBorder: '#fdba74' }
};

const STATE_NAMES = {
  [CAR_STATUS.ENTRADA]: 'Entrada',
  [CAR_STATUS.PENDIENTE]: 'Pendiente',
  [CAR_STATUS.EN_REVISION]: 'En Revisión',
  [CAR_STATUS.RECHAZADO]: 'Rechazado',
  [CAR_STATUS.EN_REPARACION]: 'En Reparación',
  [CAR_STATUS.FINALIZADO]: 'Finalizado',
  [CAR_STATUS.ENTREGADO]: 'Entregado',
  [CAR_STATUS.CANCELADO]: 'Cancelado'
};

const getStateMessage = (statusId) => {
  const messages = {
    [CAR_STATUS.ENTRADA]: 'Su vehículo ha ingresado al taller y está registrado en nuestro sistema.',
    [CAR_STATUS.PENDIENTE]: 'Su vehículo está pendiente de asignación de mecánico. Pronto será revisado por nuestro equipo.',
    [CAR_STATUS.EN_REVISION]: 'Su vehículo está siendo revisado por nuestro mecánico especializado.',
    [CAR_STATUS.RECHAZADO]: 'El presupuesto ha sido rechazado. Su vehículo regresará al estado de entrada.',
    [CAR_STATUS.EN_REPARACION]: 'Su vehículo está siendo reparado por nuestro equipo de mecánicos.',
    [CAR_STATUS.FINALIZADO]: 'La reparación de su vehículo ha sido completada exitosamente.',
    [CAR_STATUS.ENTREGADO]: 'Su vehículo ha sido entregado. ¡Gracias por confiar en nosotros!',
    [CAR_STATUS.CANCELADO]: 'El servicio para su vehículo ha sido cancelado.'
  };
  return messages[statusId] || 'El estado de su vehículo ha sido actualizado.';
};

const carStateChangeTemplate = (carData, previousState = null) => {
  const currentState = carData.status || { id: carData.statusId, name: STATE_NAMES[carData.statusId] };
  const stateColor = STATE_COLORS[currentState.id] || STATE_COLORS[CAR_STATUS.ENTRADA];
  const clientName = `${carData.client.user.name} ${carData.client.user.lastName}`;
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
    }
  };

  let mechanicInfo = '';
  if (carData.mechanic && currentState.id === CAR_STATUS.EN_REVISION) {
    mechanicInfo = `
      <div class="details-card">
        <h3>Mecánico Asignado</h3>
        <div class="detail-item">
          <span class="detail-label">Nombre:</span>
          <span class="detail-value">${carData.mechanic.user.name} ${carData.mechanic.user.lastName}</span>
        </div>
      </div>
    `;
  }

  let previousStateInfo = '';
  if (previousState) {
    previousStateInfo = `
      <div class="detail-item">
        <span class="detail-label">Estado Anterior:</span>
        <span class="detail-value">${previousState.name}</span>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cambio de estado de su vehículo - Taller Interestellar</title>
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
        .details-card {
          background: linear-gradient(135deg, ${stateColor.cardBg} 0%, ${stateColor.bg} 100%);
          border: 1px solid ${stateColor.cardBorder};
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          position: relative;
        }
        .details-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(135deg, ${stateColor.color} 0%, ${stateColor.color} 100%);
          border-radius: 2px;
        }
        .details-card h3 {
          color: ${stateColor.color};
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
        .status-badge {
          background: ${stateColor.bg};
          color: ${stateColor.color};
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
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
          <h2>Cambio de estado de su vehículo</h2>
        </div>
        
        <div class="divider"></div>
        
        <div class="content">
          <div class="greeting">
            Hola <span class="highlight">${clientName}</span>,
          </div>
          
          <div class="message">
            Le informamos que el estado de su vehículo ha sido actualizado en nuestro sistema.
          </div>
          
          <div class="details-card">
            <h3>Información del Vehículo</h3>
            <div class="detail-item">
              <span class="detail-label">Patente:</span>
              <span class="detail-value"><strong>${carData.licensePlate}</strong></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Marca:</span>
              <span class="detail-value">${carData.brand}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Modelo:</span>
              <span class="detail-value">${carData.model}</span>
            </div>
            ${previousStateInfo}
            <div class="detail-item">
              <span class="detail-label">Estado Actual:</span>
              <span class="detail-value"><span class="status-badge">${currentState.name}</span></span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Fecha y Hora:</span>
              <span class="detail-value">${currentDateTime}</span>
            </div>
          </div>
          
          ${mechanicInfo}
          
          <div class="message">
            <strong>Descripción:</strong><br>
            ${getStateMessage(currentState.id)}
          </div>
          
          ${carData.description ? `
            <div class="details-card">
              <h3>Observaciones</h3>
              <p style="color: #6b7280; font-style: italic; margin: 0;">${carData.description}</p>
            </div>
          ` : ''}
          
          <div class="message">
            <strong>Recordatorio:</strong> Puede consultar el estado de su vehículo en cualquier momento accediendo a nuestro sistema en línea con sus credenciales.
          </div>
          
          <div class="message">
            Si tiene alguna consulta sobre el estado de su vehículo, no dude en contactarnos.
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

module.exports = { carStateChangeTemplate, STATE_NAMES, STATE_COLORS };