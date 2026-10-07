import React from 'react';

const compileTemplateToHtml = (templateStr, data, isTemplatePreview = false) => {
  if (!templateStr) return "";
  let res = templateStr;
  res = res
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  if (isTemplatePreview) {
    res = res.replace(/Dear\s+(—|sample employee|Sample Employee|\[Employee Name\])/gi, "Dear {employeeName}");
    res = res.replace(/(effective from\s+)?[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+to\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}/gi, (match, p1) => (p1 ? p1 : "") + "{internshipStartDate} to {internshipEndDate}");
    res = res.replace(/(Working Hours|workingHours)\s*:\s*(<strong>)?(—|10:00 AM to 06:30 PM)*(<\/strong>)?/gi, "Working Hours : {workingHours}");
    res = res.replace(/(Internship Duration|internshipDuration)\s*:\s*(<strong>)?(—|\s*)*(<\/strong>)?/gi, "Internship Duration : {internshipDuration}");
    res = res.replace(/Department\s*:\s*(<strong>)?(—)*(<\/strong>)?/gi, "Department : {department}");
    res = res.replace(/(Reporting to|Reporting To|reportingTo)\s*:\s*(<strong>)?(—)*(<\/strong>)?/gi, "Reporting To : {reportingTo}");
    res = res.replace(/(Stipend|stipend)\s*:\s*(<strong>)?(₹0 per month|₹10,000 per month|—)*(<\/strong>)?/gi, "Stipend : {stipend}");
    res = res.replace(/(Position|Postition)\s*:\s*(<strong>)?(—|\.-|—\.)+(<\/strong>)?/gi, "Position : {designation}");

    return res;
  }

  const safeParseDate = (dateVal) => {
    if (!dateVal || dateVal === "—") return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  };

  const formattedDoj = safeParseDate(data.dateOfJoining);
  const formattedStartDate = safeParseDate(data.internshipStartDate);
  const formattedEndDate = safeParseDate(data.internshipEndDate);
  const formattedConvertedDoj = safeParseDate(data.convertedJoiningDate);

  const formattedStipend = parseFloat(data.stipend || 0).toLocaleString("en-IN");
  const formattedCtc = parseFloat(data.ctc || 0).toLocaleString("en-IN");
  const formattedConvertedCtc = parseFloat(data.convertedCtc || 0).toLocaleString("en-IN");

  let formattedProbation = "";
  if (data.hasProbation === "yes") {
    const val = data.probationValue || data.probationPeriod || "";
    const unit = data.probationUnit || "months";
    formattedProbation = val ? `${val} ${unit}` : "";
  } else if (data.hasProbation === "no") {
    formattedProbation = "";
  } else if (data.probationPeriod) {
    formattedProbation = data.probationPeriod.includes("month") || data.probationPeriod.includes("year")
      ? data.probationPeriod
      : `${data.probationPeriod} months`;
  }

  const values = {
    "{employeeName}": data.employeeName || "—",
    "{designation}": data.designation || "—",
    "{position}": data.designation || "—",
    "{Position}": data.designation || "—",
    "{Postition}": data.designation || "—",
    "{convertedDesignation}": data.designation || "—",
    "{department}": data.department || "—",
    "{officeLocation}": data.officeLocation || "—",
    "{internshipStartDate}": formattedStartDate,
    "{internshipEndDate}": formattedEndDate,
    "{internshipDuration}": data.internshipDuration || "—",
    "{workingHours}": data.workingHours || "—",
    "{stipend}": `₹${formattedStipend}`,
    "{dateOfJoining}": formattedDoj,
    "{startDate}": formattedDoj,
    "{start Date}": formattedDoj,
    "{startdate}": formattedDoj,
    "{Start Date}": formattedDoj,
    "{convertedJoiningDate}": formattedConvertedDoj,
    "{probationPeriod}": formattedProbation || "",
    "{ctc}": `INR ${formattedCtc}`,
    "{convertedCtc}": `INR ${formattedConvertedCtc}`,
    "{reportingTo}": data.reportingTo || "—",
    "{Reporting to}": data.reportingTo || "—",
    "{reporting}": data.reportingTo || "—",
    "{monthlySalary}": data.monthlySalary || "—",
    "{Monthly Salary}": data.monthlySalary || "—",
    "{job type}": data.jobType || "Fulltime",
    "{jobType}": data.jobType || "Fulltime",
    "{doj}": formattedDoj,
    "{INR amount /-}": data.monthlySalary || "—",
    "{dateOfIssue}": safeParseDate(data.dateOfIssue),
  };

  Object.entries(values).forEach(([placeholder, val]) => {
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    res = res.replace(regex, val);
  });

  return res;
};

const fmtDate = (dateStr) => {
  if (!dateStr || dateStr === "—") return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const AdditionalInformationPage = ({
  includeKeyResponsibilities,
  includeAcknowledgment,
  formData,
  templateTexts,
  onReady,
  isTemplatePreview = false
}) => {
  if (!includeKeyResponsibilities && !includeAcknowledgment && !onReady) return null;
  // If rendered as part of the document flow, check checkboxes.
  // If rendered directly (for template preview/edit), show both.
  const isDirectPreview = !includeKeyResponsibilities && !includeAcknowledgment;
  const showKR = includeKeyResponsibilities || isDirectPreview;
  const showAck = includeAcknowledgment || isDirectPreview;

  const handleRef = (el) => {
    if (el && onReady) {
      onReady(el.innerHTML);
    }
  };

  // Load template HTML for Page 2
  const rawHtml = templateTexts?.["additional-info"]?.html || "";

  // Process the HTML to include/exclude sections based on checkboxes
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const children = Array.from(doc.body.children);
  
  let currentSection = "other";
  
  children.forEach((child) => {
    const text = (child.textContent || "").toLowerCase().trim();
    const isHeading = child.tagName.startsWith("H") || child.querySelector("strong") || child.tagName === "P";
    
    if (isHeading && (text.includes("key responsibilities") || text.includes("responsibilities"))) {
      currentSection = "responsibilities";
      child.setAttribute("style", "margin-top: 65px !important; margin-bottom: 12px !important; font-weight: 700;");
    } else if (isHeading && (text.includes("acknowledgment") || text.includes("acceptance"))) {
      currentSection = "acknowledgment";
      child.setAttribute("style", "margin-top: 28px !important; margin-bottom: 14px !important; font-weight: 700;");
    } else if (currentSection === "acknowledgment") {
      child.setAttribute("style", "margin-top: 8px !important; margin-bottom: 14px !important; line-height: 1.6;");
    }
    
    let keep = true;
    if (currentSection === "responsibilities" && !showKR) {
      keep = false;
    }
    if (currentSection === "acknowledgment" && !showAck) {
      keep = false;
    }
    
    if (!keep) {
      child.remove();
    }
  });

  const processedHtml = doc.body.innerHTML;

  // Compile placeholders inside the HTML using standard substitution
  const compiledHtml = compileTemplateToHtml(processedHtml, formData, isTemplatePreview);

  const pageContent = (
    <div className="appointment-letter-page" style={{ pageBreakBefore: "always" }}>
      <img src="/Letterpad.svg" className="letter-bg-img" alt="" aria-hidden="true" />
      
      <div className="al-header-container" style={{ minHeight: "115px", height: "115px" }} />

      <div className="al-content-container" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", paddingTop: "5px" }}>
        <div dangerouslySetInnerHTML={{ __html: compiledHtml }} />
      </div>

      <div className="al-footer-container" />
    </div>
  );

  if (onReady) {
    return (
      <div ref={handleRef} className="appointment-letter-container">
        {pageContent}
      </div>
    );
  }

  return pageContent;
};

export default AdditionalInformationPage;
