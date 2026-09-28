// Captures the dashboard DOM node and saves it as PNG or a single-page PDF.
// Libraries are loaded lazily so they don't bloat the initial bundle.
export async function exportReport(node, { format = "pdf", dark = false, title = "report" }) {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(node, {
    backgroundColor: dark ? "#10161F" : "#EDEFE9",
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    windowWidth: Math.max(node.scrollWidth, 1100),
  });
  const base = title.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  if (format === "png") {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${base}_report.png`;
    a.click();
    return;
  }
  const { jsPDF } = await import("jspdf");
  const w = canvas.width, h = canvas.height;
  const pdf = new jsPDF({ orientation: w > h ? "l" : "p", unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
  pdf.save(`${base}_report.pdf`);
}
