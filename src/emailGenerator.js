
// Email Generation Service - Pure functions for creating email content
// Can be used in both frontend and backend

// Email subjects in Arabic
export const EMAIL_SUBJECTS = {
  expired: (date) => ` عاجل - إقامات موظفين منتهية الصلاحية - ${date}`,
  urgent: (date) => ` تنبيه - إقامات موظفين تنتهي قريباً - ${date}`,
  both: (date) => ` عاجل - تقرير إقامات الموظفين (منتهية وقاربة على الانتهاء) - ${date}`
};

// Arabic column headers for email table
export const ARABIC_HEADERS = {
  staffNo: 'رقم الموظف',
  name: 'اسم الموظف',
  job: 'الوظيفة',
  nationality: 'الجنسية',
  cardNumber: 'رقم البطاقة',
  cardExpiry: 'تاريخ انتهاء الإقامة',
  daysUntilExpiry: 'الأيام المتبقية',
  status: 'الحالة'
};

// Arabic status translations
export const ARABIC_STATUS = {
  'Expired': 'منتهية',
  'Urgent': 'عاجل',
  'Warning': 'تحذير',
  'Valid': 'سارية'
};

// Email templates in Arabic
export const EMAIL_TEMPLATES = {
  expired: `السلام عليكم ورحمة الله وبركاته

تحية طيبة وبعد،

نود إحاطتكم علماً بأن إقامات الموظفين المذكورين أدناه قد انتهت صلاحيتها، ونرجو اتخاذ الإجراءات اللازمة لتجديدها في أقرب وقت ممكن.

{{TABLE}}

مع خالص التقدير`,

  urgent: `السلام عليكم ورحمة الله وبركاته

تحية طيبة وبعد،

نود لفت انتباهكم إلى أن إقامات الموظفين المذكورين أدناه ستنتهي خلال الأيام القادمة، نرجو التكرم باتخاذ الإجراءات اللازمة لتجديدها قبل انتهاء المدة المحددة.

{{TABLE}}

مع خالص التقدير`,

  both: `السلام عليكم ورحمة الله وبركاته

تحية طيبة وبعد،

نود إحاطتكم علماً بحالة إقامات الموظفين التي تحتاج لاتخاذ إجراءات عاجلة كما يلي:

{{EXPIRED_SECTION}}

{{URGENT_SECTION}}

نرجو التكرم باتخاذ الإجراءات اللازمة لتجديد هذه الإقامات في أقرب وقت ممكن.

مع خالص التقدير`
};

// Helper function to format names (same as in App.js)
const formatName = (name) => {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Generate HTML table for email
export const generateEmailTable = (employees, title = '') => {
  if (!employees || employees.length === 0) return '';

  const tableHeader = `
    <tr style="background-color: #FFD600; color: #673ab7; font-weight: bold;">
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.staffNo}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.name}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.job}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.nationality}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.cardNumber}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.cardExpiry}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.daysUntilExpiry}</th>
      <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${ARABIC_HEADERS.status}</th>
    </tr>
  `;

  const tableRows = employees.map(emp => {
    const statusText = emp.daysUntilExpiry <= 0 ? ARABIC_STATUS.Expired :
                      emp.daysUntilExpiry <= 7 ? ARABIC_STATUS.Urgent :
                      emp.daysUntilExpiry <= 30 ? ARABIC_STATUS.Warning : ARABIC_STATUS.Valid;
    
    const rowColor = emp.daysUntilExpiry <= 0 ? '#FFEBEE' :
                    emp.daysUntilExpiry <= 7 ? '#FFE0B2' :
                    emp.daysUntilExpiry <= 30 ? '#FFF8E1' : '#E8F5E8';

    return `
      <tr style="background-color: ${rowColor};">
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${emp.staffNo}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${formatName(emp.name)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${formatName(emp.job)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${formatName(emp.nationality)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${emp.cardNumber}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${emp.cardExpiry.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${emp.daysUntilExpiry} يوم</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${statusText}</td>
      </tr>
    `;
  }).join('');

  const titleSection = title ? `<h3 style="color: #673ab7; margin: 20px 0 10px 0;">${title}</h3>` : '';

  return `
    ${titleSection}
    <table style="border-collapse: collapse; width: 100%; margin: 10px 0; font-family: Arial, sans-serif; direction: rtl;">
      ${tableHeader}
      ${tableRows}
    </table>
  `;
};

// Filter employees by status
export const filterEmployees = {
  expired: (employees) => employees.filter(emp => emp.daysUntilExpiry <= 0),
  urgent: (employees) => employees.filter(emp => emp.daysUntilExpiry > 0 && emp.daysUntilExpiry <= 30),
  warning: (employees) => employees.filter(emp => emp.daysUntilExpiry > 7 && emp.daysUntilExpiry <= 30)
};

// Generate complete email content
export const generateEmailContent = (type, employees) => {
  const today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  switch (type) {
    case 'expired':
      const expiredEmployees = filterEmployees.expired(employees);
      if (expiredEmployees.length === 0) return null;
      return {
        subject: EMAIL_SUBJECTS.expired(today),
        body: EMAIL_TEMPLATES.expired.replace('{{TABLE}}', generateEmailTable(expiredEmployees))
      };

    case 'urgent':
      const urgentEmployees = filterEmployees.urgent(employees);
      if (urgentEmployees.length === 0) return null;
      return {
        subject: EMAIL_SUBJECTS.urgent(today),
        body: EMAIL_TEMPLATES.urgent.replace('{{TABLE}}', generateEmailTable(urgentEmployees))
      };

    case 'both':
      const expiredEmp = filterEmployees.expired(employees);
      const urgentEmp = filterEmployees.urgent(employees);
      if (expiredEmp.length === 0 && urgentEmp.length === 0) return null;
      
      let expiredSection = '';
      if (expiredEmp.length > 0) {
        expiredSection = generateEmailTable(expiredEmp, 'أولاً: الموظفون ذوو الإقامات المنتهية الصلاحية');
      }
      
      let urgentSection = '';
      if (urgentEmp.length > 0) {
        urgentSection = generateEmailTable(urgentEmp, 'ثانياً: الموظفون ذوو الإقامات التي تنتهي قريباً');
      }

      return {
        subject: EMAIL_SUBJECTS.both(today),
        body: EMAIL_TEMPLATES.both
          .replace('{{EXPIRED_SECTION}}', expiredSection)
          .replace('{{URGENT_SECTION}}', urgentSection)
      };

    default:
      return null;
  }
};
