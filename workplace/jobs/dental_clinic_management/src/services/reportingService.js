/**
 * Reporting functions
 * Handles the generation of various reports and analytics
 */

/**
 * Generate monthly patient report
 */
function generateMonthlyPatientReport(year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const patientsResult = getAllPatients();
    if (!patientsResult.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลคนไข้ได้" };
    }

    const patients = JSON.parse(patientsResult).patients;
    const monthlyPatients = patients.filter((patient) => {
      const registrationDate = new Date(patient.registration_date);
      return registrationDate >= startDate && registrationDate <= endDate;
    });

    const report = {
      month: `${month}/${year}`,
      totalPatients: monthlyPatients.length,
      patientsByBranch: {},
      patientsByGender: { male: 0, female: 0, other: 0 },
    };

    monthlyPatients.forEach((patient) => {
      // Group by branch
      const branch = patient.branch || 'ไม่ระบุ';
      report.patientsByBranch[branch] = (report.patientsByBranch[branch] || 0) + 1;

      // Group by gender
      const gender = patient.gender?.toLowerCase() || 'other';
      if (gender.includes('ชาย') || gender.includes('male')) {
        report.patientsByGender.male++;
      } else if (gender.includes('หญิง') || gender.includes('female')) {
        report.patientsByGender.female++;
      } else {
        report.patientsByGender.other++;
      }
    });

    return { success: true, report };
  } catch (error) {
    console.error("Error generating monthly patient report:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Generate monthly revenue report
 */
function generateMonthlyRevenueReport(year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const startDateString = startDate.toISOString().split('T')[0];
    const endDateString = endDate.toISOString().split('T')[0];

    const revenueResult = getRevenueByDateRange(startDateString, endDateString);
    if (!revenueResult.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลรายได้ได้" };
    }

    const revenues = revenueResult.revenues;
    
    const report = {
      month: `${month}/${year}`,
      totalRevenue: 0,
      revenueByBranch: {},
      revenueByPaymentType: {},
      revenueByDoctor: {},
      totalTransactions: revenues.length,
    };

    revenues.forEach((revenue) => {
      const totalAmount = (
        (revenue.cashAmount || 0) +
        (revenue.transferAmount || 0) +
        (revenue.socialSecurityAmount || 0) +
        (revenue.visaAmount || 0) +
        (revenue.xrayFee || 0) +
        (revenue.medicineFee || 0) +
        (revenue.otherProductFee || 0) -
        (revenue.discount || 0)
      );

      report.totalRevenue += totalAmount;

      // Group by branch
      const branch = revenue.branch || 'ไม่ระบุ';
      report.revenueByBranch[branch] = (report.revenueByBranch[branch] || 0) + totalAmount;

      // Group by payment type
      const paymentType = revenue.paymentType || 'ไม่ระบุ';
      report.revenueByPaymentType[paymentType] = (report.revenueByPaymentType[paymentType] || 0) + totalAmount;

      // Group by doctor
      const doctorId = revenue.doctorId || 'ไม่ระบุ';
      report.revenueByDoctor[doctorId] = (report.revenueByDoctor[doctorId] || 0) + totalAmount;
    });

    return { success: true, report };
  } catch (error) {
    console.error("Error generating monthly revenue report:", error);
    return { success: false, message: error.toString() };
  }
}