const nodemailer = require('nodemailer');

// Import email templates
const { loginConfirmationTemplate } = require('../templates/loginConfirmationTemplate');
const { welcomeEmailTemplate } = require('../templates/welcomeEmailTemplate');
const { passwordResetTemplate } = require('../templates/passwordResetTemplate');
const { testEmailTemplate } = require('../templates/testEmailTemplate');
const { carStateChangeTemplate } = require('../templates/carStateChangeTemplate');

// Email Service Configuration
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    try {
      // Validate required environment variables
      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          throw new Error(`Missing required environment variable: ${varName}`);
        }
      }

      // Create nodemailer transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      this.isConfigured = true;
      console.log('Email service configured successfully');

      // Test the connection
      this.testConnection();

    } catch (error) {
      console.warn('Email service not available:', error.message);
      console.warn('Email notifications will be disabled');
      this.isConfigured = false;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (error) {
      console.error('SMTP connection failed:', error.message);
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
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'Taller Interestellar',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to,
        subject,
        html,
        text
      };

      console.log('Sending email to:', to);
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('Email sent successfully:', result.messageId);
      return { 
        success: true, 
        messageId: result.messageId,
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
}

// Create and export singleton instance
const emailService = new EmailService();
module.exports = emailService;