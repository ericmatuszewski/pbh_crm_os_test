// PDF rendering utility that handles the React reconciler issue
// by using dynamic imports with proper module resolution

export async function renderPDFToBuffer(
  Component: React.ComponentType<any>,
  props: Record<string, any>
): Promise<Buffer> {
  // Import React and ReactPDF dynamically to avoid bundler issues
  const [React, ReactPDF] = await Promise.all([
    import("react"),
    import("@react-pdf/renderer"),
  ]);

  const element = React.createElement(Component, props);

  try {
    // Try using renderToBuffer first (cast to any to handle type mismatch)
    const pdfModule = ReactPDF as any;
    if (typeof pdfModule.renderToBuffer === "function") {
      const buffer = await pdfModule.renderToBuffer(element);
      return Buffer.from(buffer);
    }
    throw new Error("renderToBuffer not available");
  } catch {
    // Fallback to pdf().toBuffer()
    const doc = ReactPDF.pdf(element);
    const blob = await doc.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
