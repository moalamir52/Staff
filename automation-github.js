// GitHub Actions version - runs once and exits
import 'dotenv/config';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { generateEmailContent } from './src/emailGenerator.js';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1Fnr64ZBPhUoOJRY9CUr47rh6a_j-iHRmR37Jew9WdXo/export?format=csv&gid=323448096';

const smtpConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

const recipientEmail = process.env.EMAIL_TO;

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
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[7]) {
        const dateParts = row[7].split('/');
        const cardExpiryDate = dateParts.length === 3
          ? new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]))
          : new Date(row[7]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        cardExpiryDate.setHours(0, 0, 0, 0);

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
    return [];
  }
};

const sendNotificationEmail = async (subject, htmlBody) => {
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.error('SMTP credentials not found');
    return;
  }
  if (!recipientEmail) {
    console.error('Recipient email not found');
    return;
  }

  const transporter = nodemailer.createTransporter(smtpConfig);

  try {
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

const main = async () => {
  console.log('🚀 Starting GitHub Actions email check...');
  const employees = await getEmployeeData();

  if (employees.length === 0) {
    console.log('No employees to process.');
    return;
  }

  const emailContent = generateEmailContent('urgent', employees);

  if (emailContent) {
    console.log('Sending notification email...');
    await sendNotificationEmail(emailContent.subject, emailContent.body);
  } else {
    console.log('No urgent notifications needed.');
  }
  
  console.log('✅ Process completed');
};

main().catch(console.error);