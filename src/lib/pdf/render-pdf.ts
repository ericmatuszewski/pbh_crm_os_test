// PDF rendering utility that handles the React reconciler issue
// by using dynamic imports with proper module resolution

// Type for props that can be passed to PDF components
type PDFComponentProps = Record<string, unknown>;

// Extended ReactPDF type with renderToBuffer (may not exist in all versions)
interface ReactPDFWithRenderToBuffer {
  renderToBuffer?: (element: React.ReactElement) => Promise<Uint8Array>;
  pdf: (element: React.ReactElement) => { toBlob: () => Promise<Blob> };
}

export async function renderPDFToBuffer<P extends PDFComponentProps>(
  Component: React.ComponentType<P>,
  props: P
): Promise<Buffer> {
  // Import React and ReactPDF dynamically to avoid bundler issues
  const [React, ReactPDF] = await Promise.all([
    import("react"),
    import("@react-pdf/renderer"),
  ]);

  const element = React.createElement(Component, props);

  try {
    // Try using renderToBuffer first (cast to extended type for version compatibility)
    const pdfModule = ReactPDF as unknown as ReactPDFWithRenderToBuffer;
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
