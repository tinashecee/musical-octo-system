import type { TemplateId } from "./types";
import { TEMPLATE_IDS } from "./types";

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Centred header and a ruled table" },
  { id: "modern", name: "Modern", description: "Green accent and a clear total" },
  { id: "minimal", name: "Minimal", description: "Quiet type and open space" },
  { id: "corporate", name: "Corporate", description: "Dark band for a formal house style" },
];

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}
