import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from utils/.env
dotenv.config({ path: path.resolve("utils/.env") });

console.log("✅ SMTP Configuration Loaded:");
console.log("SMTP Email:", process.env.SMTP_MAIL || "❌ NOT LOADED");
console.log("SMTP Host:", process.env.SMTP_HOST || "❌ NOT LOADED");

// Email sender function
const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // `true` for 465, `false` for 587
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP Server is Ready to Send Emails");

    const mailOptions = {
      from: `"Bargenix Team" <${process.env.SMTP_MAIL}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);

    return { success: true, message: "Email sent successfully!" };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { success: false, message: "Error sending email: " + error.message };
  }
};

export { sendEmail };
