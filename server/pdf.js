const PDFDocument = require("pdfkit");

/**
 * Generate LOI PDF with bilingual terms
 * @param {Object} params - PDF generation parameters
 * @param {Object} params.loi - LOI data
 * @param {Object} params.partyA - Party A details
 * @param {Object} params.partyB - Party B details
 * @param {Array} params.signatures - Signature data
 * @param {Object} params.bilingualTerms - Bilingual terms {en: {...}, local: {...}}
 * @returns {Buffer} - PDF buffer
 */
function generateLoiPdf({ loi, partyA, partyB, signatures, bilingualTerms }) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  const buffers = [];
  doc.on("data", buffers.push.bind(buffers));

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    doc.on("error", reject);

    try {
      generatePdfContent(doc, {
        loi,
        partyA,
        partyB,
        signatures,
        bilingualTerms,
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generatePdfContent(
  doc,
  { loi, partyA, partyB, signatures, bilingualTerms },
) {
  // Header
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("LETTER OF INTENT", { align: "center" });

  doc.moveDown(2);

  // LOI ID and Date
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`LOI ID: ${loi.id}`, { align: "left" })
    .text(`Date: ${new Date(loi.createdAt).toLocaleDateString()}`, {
      align: "right",
    });

  doc.moveDown(1);

  // Parties
  doc.fontSize(14).font("Helvetica-Bold").text("PARTIES:", { underline: true });

  doc.moveDown(0.5);
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Organisation A: ${partyA.name || "N/A"}`, { indent: 20 })
    .text(`VPI: ${loi.partyA_vpi}`, { indent: 20 });

  doc.moveDown(0.5);
  doc
    .text(`Organisation B: ${partyB.name || "N/A"}`, { indent: 20 })
    .text(`VPI: ${loi.partyB_vpi}`, { indent: 20 });

  doc.moveDown(1);

  // Terms - English
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("TERMS AND CONDITIONS (English):", { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");

  if (bilingualTerms.en) {
    Object.entries(bilingualTerms.en).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, { indent: 20 });
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1);

  // Terms - Local Language
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`TERMS AND CONDITIONS (${loi.lang.toUpperCase()}):`, {
      underline: true,
    });

  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");

  if (bilingualTerms.local) {
    Object.entries(bilingualTerms.local).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, { indent: 20 });
      doc.moveDown(0.3);
    });
  }

  doc.moveDown(1);

  // Signatures
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("SIGNATURES:", { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(11).font("Helvetica");

  signatures.forEach((sig, index) => {
    doc.text(`Signature ${index + 1}:`, { indent: 20 });
    doc.text(`Signer VPI: ${sig.signer_vpi}`, { indent: 40 });
    doc.text(`Signed At: ${new Date(sig.signedAt).toLocaleString()}`, {
      indent: 40,
    });
    doc.text(`Signature Hash: ${sig.signature_hash}`, { indent: 40 });
    doc.moveDown(0.5);
  });

  // Footer
  doc.moveDown(2);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      "This document is digitally signed and verified through Vyaamik Samadhaan platform.",
      { align: "center" },
    );

  doc.text(`Document Hash: ${loi.hash}`, { align: "center" });
}

/**
 * Generate a simple PDF for testing
 * @param {string} title - PDF title
 * @param {string} content - PDF content
 * @returns {Buffer} - PDF buffer
 */
function generateSimplePdf(title, content) {
  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));

  return new Promise((resolve, reject) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve(pdfBuffer);
    });

    doc.on("error", reject);

    try {
      doc.fontSize(20).text(title, { align: "center" });
      doc.moveDown(2);
      doc.fontSize(12).text(content);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateLoiPdf,
  generateSimplePdf,
};
