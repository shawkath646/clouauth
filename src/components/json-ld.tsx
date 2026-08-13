import type { Thing, WithContext, Graph } from "schema-dts";

export default function JsonLd<T extends Thing | Graph>({
  schema
}: {
  schema: WithContext<T>
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