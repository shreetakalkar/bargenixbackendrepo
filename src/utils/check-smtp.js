import dotenv from "dotenv"; 

dotenv.config({ path: "../../.env" });
// Print the SMTP details from the .env file or use fallback values
console.log("✅ SMTP Configuration:");
console.log("SMTP Service:", process.env.SMTP_SERVICE );
console.log("SMTP Email:", process.env.SMTP_MAIL );
console.log("SMTP Password:", process.env.SMTP_PASSWORD );
console.log("SMTP Host:", process.env.SMTP_HOST );
console.log("SMTP Port:", process.env.SMTP_PORT );

