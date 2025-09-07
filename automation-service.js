// This is an ES Module, so we use import statements
import 'dotenv/config'; // Load environment variables from .env file
import cron from 'node-cron';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { generateEmailContent } from './src/emailGenerator.js';

// --- 1. CONFIGURATION ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/1Fnr64ZBPhUoOJRY9CUr47rh6a_j-iHRmR37Jew9WdXo/export?format=csv&gid=323448096';


// SMTP Configuration from environment variables
const smtpConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const recipientEmail = process.env.EMAIL_TO;

// --- 2. DATA FETCHING AND PARSING ---

// Simple CSV parser
const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const result = [];
  for (const line of lines) {
    if (line.trim()) {
      const row = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
      result.push(row);
    }
  }
  return result;
};

// Fetches and processes employee data from Google Sheets
const getEmployeeData = async () => {
  try {
    console.log('Fetching employee data...');
    const response = await axios.get(CSV_URL);
    const rows = parseCSV(response.data);

    if (!rows || rows.length < 2) {
      console.log('No employee data found in CSV.');
      return [];
    }

    const employeeData = [];
    // Start from 1 to skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[7]) { // staffNo and cardExpiry are required
        const dateParts = row[7].split('/');
        const cardExpiryDate = dateParts.length === 3
          ? new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]))
          : new Date(row[7]);

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date
        cardExpiryDate.setHours(0, 0, 0, 0); // Normalize expiry date

        const timeDiff = cardExpiryDate.getTime() - today.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

        employeeData.push({
          staffNo: row[0] || '',
          name: row[2] || '',
          job: row[3] || '',
          nationality: row[4] || '',
          cardNumber: row[6] || '',
          cardExpiry: cardExpiryDate,
          daysUntilExpiry
        });
      }
    }
    console.log(`Successfully processed ${employeeData.length} employees.`);
    return employeeData;
  } catch (error) {
    console.error('Error fetching or parsing employee data:', error.message);
    return []; // Return empty array on error
  }
};

// --- 3. EMAIL SERVICE ---

const sendNotificationEmail = async (subject, htmlBody) => {
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error('SMTP user or password is not defined. Please check your .env file.');
    return;
  }
  if (!recipientEmail) {
    console.error('Recipient email is not defined. Please check EMAIL_TO in your .env file.');
    return;
  }

  console.log(`Creating transporter for ${smtpConfig.host}...`);
  const transporter = nodemailer.createTransport(smtpConfig);

  try {
    console.log(`Sending email to ${recipientEmail}...`);
    await transporter.sendMail({
      from: `"Staff Alert System" <${smtpConfig.auth.user}>`,
      to: recipientEmail,
      subject: subject,
      html: htmlBody,
    });
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// --- 4. MAIN TASK AND SCHEDULING ---

const checkAndSendReport = async () => {
  console.log('\nRunning daily check for expiring residencies...');
  const employees = await getEmployeeData();

  if (employees.length === 0) {
    console.log('Aborting check, no employees to process.');
    return;
  }

  console.log(`Found ${employees.length} employees. Checking expiry dates...`);
  
  // Log some employee data for debugging
  employees.slice(0, 3).forEach(emp => {
    console.log(`Employee: ${emp.name}, Days until expiry: ${emp.daysUntilExpiry}`);
  });

  // We want to send a report for employees expiring within 30 days
  const emailContent = generateEmailContent('urgent', employees);

  if (emailContent) {
    console.log('Found employees with expiring residencies. Preparing to send email.');
    await sendNotificationEmail(emailContent.subject, emailContent.body);
  } else {
    console.log('No employees with expiring residencies found. No email will be sent.');
    // For testing purposes, let's send a test email anyway
    console.log('Sending test email to verify email functionality...');
    await sendNotificationEmail(
      'Test Email - Staff Alert System', 
      '<h2>Test Email</h2><p>This is a test email to verify the email system is working. Total employees processed: ' + employees.length + '</p>'
    );
  }
};

// Check if running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

if (isGitHubActions) {
  // GitHub Actions mode - run once and exit
  console.log('🚀 Running in GitHub Actions mode...');
  checkAndSendReport().then(() => {
    console.log('✅ GitHub Actions job completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ GitHub Actions job failed:', error);
    process.exit(1);
  });
} else {
  // Local mode - use cron scheduling
  const cronJob = cron.schedule('0 9 * * *', () => {
    console.log('\n🔔 Cron job triggered at:', new Date().toLocaleString('ar-EG', {timeZone: 'Asia/Riyadh'}));
    checkAndSendReport();
  }, {
    scheduled: true,
    timezone: "Asia/Riyadh"
  });

  console.log('📅 Cron job scheduled successfully!');
  console.log('⏰ Next execution will be at 9:00 AM (Asia/Riyadh timezone)');
  console.log('🔄 Current time:', new Date().toLocaleString('ar-EG', {timeZone: 'Asia/Riyadh'}));
  console.log('\n✅ Automated Email Service has started.');
  console.log('📧 Email Configuration:');
  console.log('   Host:', smtpConfig.host);
  console.log('   Port:', smtpConfig.port);
  console.log('   User:', smtpConfig.auth.user);
  console.log('   To:', recipientEmail);
  console.log('\n🚀 Running immediate test...');
  
  checkAndSendReport();
  
  console.log('\n⏳ Service is now running and waiting for scheduled time...');
  console.log('💡 To stop the service, press Ctrl+C');
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Service stopped by user');
    process.exit(0);
  });
}
