import qrcode from "qrcode-generator";

/** Quiet zone, in modules, on every side (the QR specification asks for 4). */
export const QR_QUIET_ZONE = 4;

/** The QR matrix for `value` at error-correction level M. `true` is a dark module. Computed on our side; no third-party service. */
export function qrMatrix(value: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const size = qr.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => qr.isDark(row, col)));
}

/** One SVG path for every dark module (a 1x1 square each), in the coordinates of the quiet-zone-padded viewBox. */
export function qrPath(matrix: boolean[][]): string {
  const parts: string[] = [];
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) parts.push(`M${c + QR_QUIET_ZONE} ${r + QR_QUIET_ZONE}h1v1h-1z`);
    }),
  );
  return parts.join("");
}
