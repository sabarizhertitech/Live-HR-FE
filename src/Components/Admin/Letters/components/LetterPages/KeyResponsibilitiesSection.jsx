import React from 'react';

const KeyResponsibilitiesSection = ({ customText, fontSize }) => {
  const fallbackBullets = [
    "Design and Develop: Build and maintain efficient, reusable, and reliable code for both front-end and back-end components of web and mobile applications.",
    "Collaborate with Teams: Work closely with other developers to define, design, and implement new features and enhancements.",
    "API Development & Integration: Design and implement robust APIs to facilitate interaction between different systems and components.",
    "Database Management: Develop and manage databases using SQL and NoSQL technologies (e.g., MySQL, MongoDB).",
    "Performance Optimization: Ensure the application's performance, scalability, and security by writing optimized code and testing across devices and browsers.",
    "Troubleshooting & Debugging: Identify bottlenecks, bugs, and other issues and provide timely solutions.",
    "Maintain & Update Codebase: Continuously monitor, maintain, and improve the existing codebase.",
    "Testing: Write and maintain automated tests for applications to ensure code reliability and robustness.",
    "Stay Updated: Keep up with the latest industry trends, technologies, and best practices in both front-end and back-end development."
  ];

  const bulletItems = customText
    ? customText.split("\n").map(line => line.trim()).filter(Boolean)
    : fallbackBullets;

  return (
    <div className="al-key-responsibilities-sec" style={{ marginTop: "5px" }}>
      <h3 className="al-sec-title" style={{ textAlign: "left", fontWeight: "bold", fontSize: "16px", marginBottom: "15px", textTransform: "uppercase", color: "#0f172a", fontFamily: "'Inter', sans-serif" }}>
        Key Responsibilities
      </h3>
      <ul className="al-bullet-list" style={{ listStyleType: "none", paddingLeft: 0, margin: 0 }}>
        {bulletItems.map((item, idx) => (
          <li key={idx} style={{ display: "flex", alignItems: "flex-start", marginBottom: "8px", fontSize: fontSize || "12px", lineHeight: "1.5", color: "#333333", fontFamily: "'Inter', sans-serif" }}>
            <span style={{ marginRight: "8px", flexShrink: 0 }}>➢</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default KeyResponsibilitiesSection;
