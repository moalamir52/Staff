import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { sendEmail } from './emailService.js';

function App() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('all');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ total: 0, expiring: 0, expired: 0 });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  const formatName = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

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

  const loadEmployeeData = async () => {
    setLoading(true);
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1Fnr64ZBPhUoOJRY9CUr47rh6a_j-iHRmR37Jew9WdXo/export?format=csv&gid=323448096';
      const response = await fetch(csvUrl);
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      if (!rows || rows.length === 0) {
        setEmployees([]);
        return;
      }

      const employeeData = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] && row[7]) {
          // Handle Hijri date format
          let cardExpiryDate;
          if (row[7].includes('هـ')) {
            const hijriParts = row[7].replace(/هـ|\s/g, '').split('/');
            if (hijriParts.length === 3) {
              const hijriYear = parseInt(hijriParts[2]);
              const gregorianYear = Math.floor(hijriYear * 0.970229 + 621.5643);
              cardExpiryDate = new Date(gregorianYear, parseInt(hijriParts[1]) - 1, parseInt(hijriParts[0]));
            } else {
              cardExpiryDate = new Date();
            }
          } else {
            const dateParts = row[7].split('/');
            cardExpiryDate = dateParts.length === 3 ? 
              new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])) :
              new Date(row[7]);
          }
          
          const today = new Date();
          const timeDiff = cardExpiryDate.getTime() - today.getTime();
          const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));

          employeeData.push({
            staffNo: row[0] || '',
            passportNumber: row[1] || '',
            name: row[2] || '',
            job: row[3] || '',
            nationality: row[4] || '',
            cardType: row[5] || '',
            cardNumber: row[6] || '',
            cardExpiry: cardExpiryDate,
            passportIssueDate: row[8] || '',
            passportExpireDate: row[9] || '',
            email: row[10] || '',
            joiningDate: row[11] || '',
            years: row[12] || '',
            daysUntilExpiry
          });
        }
      }

      setEmployees(employeeData);
      
      // حساب الملخص
      const total = employeeData.length;
      const expiring = employeeData.filter(emp => emp.daysUntilExpiry <= 30 && emp.daysUntilExpiry > 0).length;
      const expired = employeeData.filter(emp => emp.daysUntilExpiry <= 0).length;
      setSummary({ total, expiring, expired });
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (keyword) => {
    const searchKeyword = keyword.trim().toLowerCase();
    if (!searchKeyword) {
      setFilteredEmployees([]);
      setView('all');
      return;
    }

    const results = employees.filter(emp =>
      emp.name.toLowerCase().includes(searchKeyword) ||
      emp.staffNo.toLowerCase().includes(searchKeyword) ||
      emp.passportNumber.toLowerCase().includes(searchKeyword) ||
      emp.job.toLowerCase().includes(searchKeyword) ||
      emp.nationality.toLowerCase().includes(searchKeyword) ||
      emp.cardType.toLowerCase().includes(searchKeyword) ||
      emp.cardNumber.toLowerCase().includes(searchKeyword)
    );
    
    setFilteredEmployees(results);
    setView('search');
  };

  const getEmployeesToShow = () => {
    if (view === 'search' && filteredEmployees.length > 0) {
      return filteredEmployees;
    }
    if (view === 'expiring') {
      return employees.filter(emp => emp.daysUntilExpiry <= 30 && emp.daysUntilExpiry > 0);
    }
    if (view === 'expired') {
      return employees.filter(emp => emp.daysUntilExpiry <= 0);
    }
    return employees;
  };

  const getStatusClass = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'urgent';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'normal';
  };

  const getStatusText = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 0) return 'Expired';
    if (daysUntilExpiry <= 7) return 'Urgent';
    if (daysUntilExpiry <= 30) return 'Warning';
    return 'Normal';
  };

  const handleExport = () => {
    const dataToExport = getEmployeesToShow();
    if (dataToExport.length === 0) {
      alert('No data to export!');
      return;
    }

    const exportData = dataToExport.map(emp => ({
      'Staff No.': emp.staffNo,
      'Passport Number': emp.passportNumber,
      'Employee Name': emp.name,
      'Job': emp.job,
      'Nationality': emp.nationality,
      'Card Type': emp.cardType,
      'Card Number': emp.cardNumber,
      'Card Expiry Date': emp.cardExpiry.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}),
      'Passport Issue Date': emp.passportIssueDate,
      'Passport Expire Date': emp.passportExpireDate,
      'Email': emp.email,
      'Joining Date': emp.joiningDate,
      'Years': emp.years,
      'Days Remaining': emp.daysUntilExpiry,
      'Status': getStatusText(emp.daysUntilExpiry)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Report');
    XLSX.writeFile(wb, `Staff_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const employeesToShow = getEmployeesToShow();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFF8E1",
      fontFamily: "Tajawal, Arial, sans-serif"
    }}>
      {/* زر العودة */}
      <button
        onClick={() => window.location.href = "https://moalamir52.github.io/Yelo/#dashboard"}
        style={{
          margin: "24px 0 16px 24px",
          background: "#FFD600",
          color: "#673ab7",
          border: "2px solid #673ab7",
          borderRadius: 8,
          fontWeight: "bold",
          fontSize: 18,
          padding: "10px 28px",
          cursor: "pointer",
          boxShadow: "0 2px 8px #FFD60044"
        }}
      >
        ← Back to YELO
      </button>

      {/* العنوان الرئيسي */}
      <div style={{
        maxWidth: 900,
        margin: "32px auto",
        background: "#FFD600",
        borderRadius: 18,
        boxShadow: "0 4px 24px #FFD60055",
        padding: 32,
        textAlign: "center",
        border: "3px solid #673ab7"
      }}>
        <h1 style={{ color: "#673ab7", fontWeight: "bold", fontSize: 38, margin: 0 }}>
          Staff Residency Monitoring System
        </h1>
        <div style={{ color: "#222", fontSize: 18, marginTop: 8, marginBottom: 0 }}>
          Smart system for monitoring staff residency expiration dates
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div style={{
        maxWidth: 1600,
        margin: "32px auto",
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 4px 24px #0001",
        padding: 24,
        minHeight: 600
      }}>
        {/* شريط التحكم */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
            style={{
              border: "2px solid #FFD600",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 16,
              width: 220,
              textAlign: "left"
            }}
          />

          <button
            onClick={loadEmployeeData}
            disabled={loading}
            style={{
              background: "#fff",
              color: "#673ab7",
              border: "2px solid #FFD600",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: 16,
              padding: "8px 18px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
          <button
            onClick={handleExport}
            style={{
              background: "#fff",
              color: "#673ab7",
              border: "2px solid #FFD600",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: 16,
              padding: "8px 18px",
              cursor: "pointer"
            }}
          >
            Export
          </button>
          <button
            onClick={() => setView('all')}
            style={{
              background: view === 'all' ? "#FFD600" : "#fff",
              color: view === 'all' ? "#222" : "#673ab7",
              border: "2px solid #FFD600",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: 16,
              padding: "8px 18px",
              cursor: "pointer"
            }}
          >
            All Employees ({summary.total})
          </button>
          <button
            onClick={() => setView('expiring')}
            style={{
              background: view === 'expiring' ? "#FF9800" : "#fff",
              color: view === 'expiring' ? "white" : "#FF9800",
              border: "2px solid #FF9800",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: 16,
              padding: "8px 18px",
              cursor: "pointer"
            }}
          >
            Expiring in 30 Days ({summary.expiring})
          </button>
          <button
            onClick={() => setView('expired')}
            style={{
              background: view === 'expired' ? "#F44336" : "#fff",
              color: view === 'expired' ? "white" : "#F44336",
              border: "2px solid #F44336",
              borderRadius: 8,
              fontWeight: "bold",
              fontSize: 16,
              padding: "8px 18px",
              cursor: "pointer"
            }}
          >
            Expired ({summary.expired})
          </button>
          
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button
              onClick={() => setShowEmailDropdown(!showEmailDropdown)}
              style={{
                background: "#673ab7",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                fontSize: 16,
                padding: "8px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              📧 Send Email {showEmailDropdown ? '▲' : '▼'}
            </button>
            
            {showEmailDropdown && (
              <div style={{
                position: "absolute",
                top: "100%",
                right: 0,
                background: "white",
                border: "3px solid #FFD600",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(103, 58, 183, 0.2)",
                zIndex: 1000,
                minWidth: 250,
                marginTop: 5
              }}>
                <button
                  onClick={() => {
                    sendEmail('expired', employees);
                    setShowEmailDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#673ab7",
                    borderBottom: "1px solid #FFD600",
                    borderRadius: "9px 9px 0 0"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#FFF8E1"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  🚨 Expired Cases Only
                </button>
                <button
                  onClick={() => {
                    sendEmail('urgent', employees);
                    setShowEmailDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#673ab7",
                    borderBottom: "1px solid #FFD600"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#FFF8E1"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  ⚠️ Urgent Cases Only
                </button>
                <button
                  onClick={() => {
                    sendEmail('both', employees);
                    setShowEmailDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#673ab7",
                    borderRadius: "0 0 9px 9px"
                  }}
                  onMouseEnter={(e) => e.target.style.background = "#FFF8E1"}
                  onMouseLeave={(e) => e.target.style.background = "transparent"}
                >
                  📋 Both Cases
                </button>
              </div>
            )}
          </div>
        </div>

        {/* بطاقات الملخص */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{
            background: "#FFF8E1",
            border: "2px solid #FFD600",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            minWidth: 150,
            flex: 1
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#673ab7" }}>{summary.total}</div>
            <div style={{ color: "#673ab7", fontWeight: "bold" }}>Total Employees</div>
          </div>
          <div style={{
            background: "#FFF3E0",
            border: "2px solid #FF9800",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            minWidth: 150,
            flex: 1
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#E65100" }}>{summary.expiring}</div>
            <div style={{ color: "#FF9800", fontWeight: "bold" }}>Expiring in 30 Days</div>
          </div>
          <div style={{
            background: "#FFEBEE",
            border: "2px solid #F44336",
            borderRadius: 12,
            padding: 20,
            textAlign: "center",
            minWidth: 150,
            flex: 1
          }}>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#C62828" }}>{summary.expired}</div>
            <div style={{ color: "#F44336", fontWeight: "bold" }}>Expired</div>
          </div>
        </div>

        {/* جدول البيانات */}
        {employeesToShow.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 15,
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
              fontSize: 13
            }}>
              <thead>
                <tr style={{ background: "#673ab7", color: "white" }}>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>#</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Staff No.</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Passport Number</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Employee Name</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Job</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Nationality</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Card Type</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Card Number</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Card Expiry Date</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Days Remaining</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #ddd" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employeesToShow.map((emp, index) => {
                  const statusClass = getStatusClass(emp.daysUntilExpiry);
                  let rowStyle = { border: "1px solid #ddd" };
                  
                  if (statusClass === 'expired') {
                    rowStyle.backgroundColor = '#e91f3d88';
                  } else if (statusClass === 'urgent') {
                    rowStyle.backgroundColor = '#FFE0B2';
                  } else if (statusClass === 'warning') {
                    rowStyle.backgroundColor = '#FFF8E1';
                  } else {
                    rowStyle.backgroundColor = index % 2 === 0 ? '#f8f9fa' : 'white';
                  }
                  rowStyle.color = '#000';

                  return (
                    <tr key={emp.staffNo} style={rowStyle}>
                      <td 
                        style={{ 
                          padding: "8px", 
                          textAlign: "center", 
                          border: "1px solid #ddd", 
                          fontWeight: "bold",
                          cursor: "pointer",
                          color: "#673ab7",
                          textDecoration: "underline"
                        }}
                        onClick={() => setSelectedEmployee(emp)}
                      >
                        {index + 1}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{emp.staffNo}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{emp.passportNumber}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{formatName(emp.name)}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{formatName(emp.job)}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{formatName(emp.nationality)}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{formatName(emp.cardType)}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>{emp.cardNumber}</td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>
                        {emp.cardExpiry.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>
                        {emp.daysUntilExpiry} days
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #ddd", fontWeight: "bold" }}>
                        {getStatusText(emp.daysUntilExpiry)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: 40,
            color: "#666",
            fontSize: 18
          }}>
            {loading ? "Loading data..." : "No data to display"}
          </div>
        )}

        {/* نافذة تفاصيل الموظف */}
        {selectedEmployee && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(103, 58, 183, 0.3)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedEmployee(null);
                setShowEmailDropdown(false);
              }
            }}
          >
            <div 
              style={{
                background: "#FFF8E1",
                borderRadius: 18,
                padding: 0,
                maxWidth: 800,
                width: "95%",
                maxHeight: "90%",
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(103, 58, 183, 0.2)",
                border: "3px solid #FFD600"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                background: "#FFD600",
                padding: "20px 30px",
                borderRadius: "15px 15px 0 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderBottom: "3px solid #673ab7",
                position: "relative"
              }}>
                <h2 style={{ color: "#673ab7", margin: 0, fontSize: 28, fontWeight: "bold" }}>Employee Details</h2>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  style={{
                    background: "#673ab7",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 18,
                    fontWeight: "bold",
                    position: "absolute",
                    right: "30px"
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ padding: "25px 30px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 25 }}>
                  {[
                    ['Staff No.', selectedEmployee.staffNo],
                    ['Passport Number', selectedEmployee.passportNumber],
                    ['Employee Name', formatName(selectedEmployee.name)],
                    ['Job', formatName(selectedEmployee.job)],
                    ['Nationality', formatName(selectedEmployee.nationality)],
                    ['Card Type', formatName(selectedEmployee.cardType)],
                    ['Card Number', selectedEmployee.cardNumber],
                    ['Card Expiry', selectedEmployee.cardExpiry.toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'})],
                    ['Passport Issue Date', selectedEmployee.passportIssueDate],
                    ['Passport Expire Date', selectedEmployee.passportExpireDate],
                    ['Email', selectedEmployee.email],
                    ['Joining Date', selectedEmployee.joiningDate],
                    ['Years', selectedEmployee.years]
                  ].map(([label, value], index) => (
                    <div key={index} style={{
                      background: "white",
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "2px solid #FFD600",
                      boxShadow: "0 2px 8px rgba(255, 214, 0, 0.1)"
                    }}>
                      <div style={{ color: "#673ab7", fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>{label}</div>
                      <div style={{ color: "#333", fontSize: 16, fontWeight: "bold" }}>{value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  background: selectedEmployee.daysUntilExpiry <= 0 ? '#FFEBEE' : 
                             selectedEmployee.daysUntilExpiry <= 7 ? '#FFE0B2' :
                             selectedEmployee.daysUntilExpiry <= 30 ? '#FFF8E1' : '#E8F5E8',
                  border: `3px solid ${selectedEmployee.daysUntilExpiry <= 0 ? '#F44336' : 
                                      selectedEmployee.daysUntilExpiry <= 7 ? '#FF6F00' :
                                      selectedEmployee.daysUntilExpiry <= 30 ? '#FFD600' : '#4CAF50'}`,
                  borderRadius: 12,
                  padding: 20,
                  textAlign: "center"
                }}>
                  <div style={{ 
                    fontSize: 28, 
                    fontWeight: "bold", 
                    color: selectedEmployee.daysUntilExpiry <= 0 ? '#C62828' : 
                           selectedEmployee.daysUntilExpiry <= 7 ? '#BF360C' :
                           selectedEmployee.daysUntilExpiry <= 30 ? '#F57C00' : '#2E7D32',
                    marginBottom: 8 
                  }}>
                    {selectedEmployee.daysUntilExpiry} Days
                  </div>
                  <div style={{ 
                    fontSize: 16, 
                    fontWeight: "bold", 
                    color: selectedEmployee.daysUntilExpiry <= 0 ? '#C62828' : 
                           selectedEmployee.daysUntilExpiry <= 7 ? '#BF360C' :
                           selectedEmployee.daysUntilExpiry <= 30 ? '#F57C00' : '#2E7D32'
                  }}>
                    Status: {getStatusText(selectedEmployee.daysUntilExpiry)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;