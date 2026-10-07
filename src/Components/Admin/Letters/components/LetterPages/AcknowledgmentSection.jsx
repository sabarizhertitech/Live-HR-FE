import React from 'react';

const AcknowledgmentSection = ({ employeeName, designation, customText, fontSize }) => {
  const defaultText = "I, {employeeName}, accept the employment offered to me as {designation} with Ertitech Solutions Private Limited under the terms and conditions outlined in this letter.";
  
  const textToCompile = customText || defaultText;
  const htmlContent = textToCompile
    .replace(/\{employeeName\}/g, `<strong>${employeeName || "—"}</strong>`)
    .replace(/\{designation\}/g, `<strong>${designation || "—"}</strong>`);

  return (
    <div className="al-acknowledgment-sec" style={{ marginTop: "20px" }}>
      <h3 className="al-sec-title" style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginBottom: "15px", textTransform: "uppercase", color: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
        Acknowledgment and Acceptance
      </h3>
      <p
        style={{ fontSize: fontSize || "13px", lineHeight: "1.6", marginBottom: "35px", textAlign: "justify", color: "#333333", fontFamily: "'Inter', sans-serif" }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      
      <div className="al-emp-signature-block" style={{ marginTop: "25px", textAlign: "left", fontFamily: "'Inter', sans-serif" }}>
        <p style={{ fontSize: "13px", margin: "0 0 45px 0", color: "#333333" }}>Employee Signature</p>
        <div style={{ width: "250px", borderBottom: "1px solid #333333" }} />
      </div>
    </div>
  );
};

export default AcknowledgmentSection;
