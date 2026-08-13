import type { Thing, WithContext, Graph } from "schema-dts";

export default function JsonLd({
  schema
}: {
  schema: any
}) {
  const safeJsonLd = JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/&/g, "\\u0026")
    .replace(/'/g, "\\u0027");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd }}
    />
  );
}