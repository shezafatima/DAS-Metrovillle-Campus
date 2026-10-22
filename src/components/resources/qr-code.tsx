import { QR_QUIET_ZONE, qrMatrix, qrPath } from "@/lib/qr";

/**
 * A QR code drawn as inline SVG, navy modules on a white square with a 4-module quiet zone. It is built when the
 * page is built (a server component), so the browser downloads no script and no third-party service is called.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const matrix = qrMatrix(value);
  const box = matrix.length + QR_QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${box} ${box}`}
      shapeRendering="crispEdges"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={box} height={box} fill="#fff" />
      <path d={qrPath(matrix)} fill="var(--color-primary)" />
    </svg>
  );
}
