// Email Service for Staff Management System (Frontend)
// This file handles the browser-specific email functionality.

import { generateEmailContent } from './emailGenerator.js';
import { EMAIL_RECIPIENT } from './config.js';

// The main function that prepares and copies the content for the browser
export const sendEmail = (type, employees) => {
  const emailContent = generateEmailContent(type, employees);

  if (!emailContent) {
    const messages = {
      expired: "✅ Great! No expired residencies found",
      urgent: "✅ Excellent! No urgent cases found",
      both: "✅ Perfect! All residencies are valid"
    };
    alert(messages[type] || "No data to send");
    return;
  }

  // --- 1. Copy full HTML report to clipboard ---
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = emailContent.body;

  navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([tempDiv.innerHTML], { type: 'text/html' }),
      'text/plain': new Blob([tempDiv.innerText], { type: 'text/plain' })
    })
  ]).catch(err => {
    console.error('Failed to copy to clipboard:', err);
  });

  // --- 2. Open mailto link (with a shorter body) ---
  const recipient = EMAIL_RECIPIENT;
  const subject = encodeURIComponent(emailContent.subject);
  const mailtoBody = ""; // Body is left empty as it's in the clipboard
  const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(mailtoBody)}`;

  try {
    const mailtoWin = window.open(mailtoLink, '_blank');
    if (!mailtoWin) {
        // If window.open is blocked
        throw new Error("Popup blocked");
    }
  } catch (e) {
      // Handle popup blocker or other errors
      console.error("Failed to open mailto link:", e);
  }
};