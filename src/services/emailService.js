const SibApiV3Sdk = require('sib-api-v3-sdk');

// Import email templates
const { loginConfirmationTemplate } = require('../templates/loginConfirmationTemplate');
const { welcomeEmailTemplate } = require('../templates/welcomeEmailTemplate');
const { passwordResetTemplate } = require('../templates/passwordResetTemplate');
const { testEmailTemplate } = require('../templates/testEmailTemplate');
const { carStateChangeTemplate } = require('../templates/carStateChangeTemplate');
const { budgetTemplate } = require('../templates/budgetTemplate');

// Email Service Configuration
class EmailService {
  constructor() {
    this.isConfigured = false;
    this.apiInstance = null;
    this.sender = null;
    this.init();
  }

  init() {
    try {
      // Configure Brevo API
      let defaultClient = SibApiV3Sdk.ApiClient.instance;
      let apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY || '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';
      
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      
      // Set sender information
      this.sender = {
        email: process.env.BREVO_SENDER_EMAIL || "info@tallerinterestellar.com.ar",
        name: process.env.BREVO_SENDER_NAME || "Taller Interestellar"
      };

      this.isConfigured = true;
      console.log('Brevo Email service configured successfully');

    } catch (error) {
      console.warn('Email service not available:', error.message);
      console.warn('Email notifications will be disabled');
      this.isConfigured = false;
    }
  }

  // Generic email sending method
  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured) {
      console.warn('Email service not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      // Format recipients
      let recipients;
      if (Array.isArray(to)) {
        recipients = to.map(email => {
          if (typeof email === 'string') {
            return { email };
          }
          return email;
        });
      } else if (typeof to === 'string') {
        recipients = [{ email: to }];
      } else {
        recipients = [to];
      }

      let sendSmtpEmail = {
        sender: this.sender,
        to: recipients,
        subject: subject,
        htmlContent: html,
       textContent: text
      };

      console.log('Sending email to:', recipients.map(r => r.email).join(', '));
      const data = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log('Email sent successfully:', data.messageId);
      return { 
        success: true, 
        messageId: data.messageId,
        message: 'Email sent successfully' 
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to send email' 
      };
    }
  }

  // Registration confirmation email
  async sendRegistrationConfirmation(userEmail, userName, loginDateTime) {
    const subject = 'Registro de sesión confirmado en Taller Interestellar';
    const html = loginConfirmationTemplate(userName, userEmail, loginDateTime);
    
    const textVersion = `
      Hola ${userName},

      Te confirmamos que tu sesión en Taller Interestellar se registró correctamente.

      Detalles de acceso:
      Fecha y hora: ${loginDateTime}
      Email: ${userEmail}

      Gracias por confiar en nosotros.

      El equipo de Taller Interestellar
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: textVersion
    });
  }

  // Welcome email for new users
  async sendWelcomeEmail(userEmail, userName, userRole) {
    const subject = 'Bienvenido a Taller Interestellar';
    const html = welcomeEmailTemplate(userName);
    
    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: `Hola ${userName}, ¡Bienvenido a Taller Interestellar! Tu cuenta como ${userRole} ha sido creada exitosamente.`
    });
  }

  // Password reset email
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    const subject = 'Restablecé tu contraseña en Taller Interestellar';
    const html = passwordResetTemplate(userName, resetToken);
    
    const textVersion = `
      Hola ${userName},

      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Taller Interestellar.

      Para continuar con el proceso, accede al siguiente enlace:
      ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}

      Si vos no solicitaste este cambio, podés ignorar este mensaje. Tu cuenta seguirá siendo segura.

      El equipo de Taller Interestellar
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: textVersion
    });
  }

  // Test email method
  async sendTestEmail(to) {
    const subject = 'Prueba de Email - Taller Interestellar';
    const html = testEmailTemplate();
    
    return await this.sendEmail({
      to,
      subject,
      html,
      text: 'Email de prueba del sistema Taller Interestellar'
    });
  }

  // Car state change notification email
  async sendCarStateChangeNotification(carData, previousState = null) {
    if (!carData || !carData.client || !carData.client.user || !carData.client.user.email) {
      console.warn('Incomplete car data for email notification');
      return { success: false, message: 'Incomplete car data' };
    }

    const userEmail = carData.client.user.email;
    const userName = `${carData.client.user.name} ${carData.client.user.lastName}`;
    const currentStateName = carData.status ? carData.status.name : 'Actualizado';
    
    const subject = `Estado de su vehículo actualizado: ${currentStateName} - ${carData.licensePlate}`;
    const html = carStateChangeTemplate(carData, previousState);
    
    const textVersion = `
      Hola ${userName},

      Le informamos que el estado de su vehículo ${carData.licensePlate} ha sido actualizado.

      Estado actual: ${currentStateName}
      Fecha y hora: ${new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}

      Para más detalles, acceda a nuestro sistema en línea.

      Gracias por confiar en Taller Interestellar.

      El equipo de Taller Interestellar
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: textVersion
    });
  }

  // Budget email for clients
  async sendBudgetEmail(carData, budgetData) {
    if (!carData || !carData.client || !carData.client.user || !carData.client.user.email) {
      console.warn('Incomplete car data for budget email');
      return { success: false, message: 'Incomplete car data' };
    }

    const userEmail = carData.client.user.email;
    const userName = `${carData.client.user.name} ${carData.client.user.lastName}`;
    
    const subject = `Presupuesto para su vehículo ${carData.licensePlate} - Taller Interestellar`;
    const html = budgetTemplate(carData, budgetData, userName);
    
    const textVersion = `
      Hola ${userName},

      Le informamos que nuestro mecánico ha preparado un presupuesto detallado para la reparación de su vehículo ${carData.licensePlate}.

      Detalles del Presupuesto:
      Descripción del trabajo: ${budgetData.description}
      Costo estimado: $${parseFloat(budgetData.cost).toFixed(2)}

      Por favor, revise el presupuesto y confirme si desea proceder con la reparación o rechazarla.
      
      Para aceptar el presupuesto: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-budget?carId=${carData.id}
      Para rechazar el presupuesto: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/reject-budget?carId=${carData.id}

      Gracias por confiar en Taller Interestellar.

      El equipo de Taller Interestellar
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text: textVersion
    });
  }
}

// Create and export singleton instance
const emailService = new EmailService();
module.exports = emailService;