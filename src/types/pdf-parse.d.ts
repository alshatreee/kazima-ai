// Minimal ambient module declaration so the production build does not fail
// on the absence of `@types/pdf-parse`. The real module exports a default
// async function that takes a Buffer and resolves to an object with `text`,
// `numpages`, `info`, and `metadata` fields. We do not depend on richer
// typings here.
declare module "pdf-parse" {
  type PdfParseFn = (
    buffer: Buffer,
    options?: Record<string, unknown>,
  ) => Promise<{
    text: string;
    numpages: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: Record<string, unknown> | null;
    version?: string;
  }>;
  const fn: PdfParseFn;
  export default fn;
}
