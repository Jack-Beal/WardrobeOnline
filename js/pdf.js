// PDF export via jsPDF. (Feature 11)

function exportWardrobePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(`My Wardrobe Export — ${today}`, 20, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Generated for AI analysis', 20, 28);

  // Group items by category
  const groups = {};
  (allItems || []).forEach(item => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
  });

  let y = 38;
  const lineH = 6;
  const pageH = 280;

  Object.keys(groups).sort().forEach(category => {
    if (y > pageH - 30) { doc.addPage(); y = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(category, 20, y);
    y += lineH + 2;

    groups[category].forEach(item => {
      if (y > pageH - 10) { doc.addPage(); y = 20; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.name, 22, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const details = [
        item.colour,
        item.brand,
        `Worn ${item.wear_count || 0}×`,
        item.care_notes,
      ].filter(Boolean).join(' · ');
      doc.text(details, 22, y + 4);
      y += lineH + 5;
    });

    y += 4;
  });

  doc.save(`wardrobe-export-${Date.now()}.pdf`);
}
