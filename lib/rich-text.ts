const UNSAFE_TAG_PATTERN = /<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1>|<\/?(script|style|iframe|object|embed|svg|math)[^>]*>/gi;

const UNSAFE_SINGLE_TAG_PATTERN = /<\s*\/?\s*(link|meta|base|form|input|button|select|textarea|option|noscript|template)[^>]*>/gi;

export function sanitizeRichTextContent(content: string) {
  if (!content) return "";

  let sanitized = content
    .replace(UNSAFE_TAG_PATTERN, "")
    .replace(UNSAFE_SINGLE_TAG_PATTERN, "");

  // Line breaks must stay as real HTML so the editor renders them.
  sanitized = sanitized.replace(/<\s*br\s*\/?\s*>/gi, "<br>");
  sanitized = sanitized.replace(/<\s*hr\s*\/?\s*>/gi, "<br>");

  // Normalize inline formatting tags (opening and closing tags mapped separately).
  sanitized = sanitized
    .replace(/<\s*b\s*>/gi, "<strong>")
    .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
    .replace(/<\s*strong\b[^>]*>/gi, "<strong>")
    .replace(/<\s*\/\s*strong\s*>/gi, "</strong>")
    .replace(/<\s*i\s*>/gi, "<em>")
    .replace(/<\s*\/\s*i\s*>/gi, "</em>")
    .replace(/<\s*em\b[^>]*>/gi, "<em>")
    .replace(/<\s*\/\s*em\s*>/gi, "</em>")
    .replace(/<\s*u\s*>/gi, "<u>")
    .replace(/<\s*\/\s*u\s*>/gi, "</u>")
    .replace(/<\s*(strike|s|del)\s*>/gi, "<s>")
    .replace(/<\s*\/\s*(strike|s|del)\s*>/gi, "</s>");

  // Normalize paragraph-level blocks so the editor keeps them consistent.
  sanitized = sanitized
    .replace(/<\s*(p|div|h[1-6])\b[^>]*>/gi, "<div>")
    .replace(/<\s*\/\s*(p|div|h[1-6])\s*>/gi, "</div>")
    .replace(/<\s*blockquote\b[^>]*>/gi, "<blockquote>")
    .replace(/<\s*\/\s*blockquote\s*>/gi, "</blockquote>")
    .replace(/<\s*(ul|ol)\b[^>]*>/gi, "<$1>")
    .replace(/<\s*\/\s*(ul|ol)\s*>/gi, "</$1>")
    .replace(/<\s*li\b[^>]*>/gi, "<li>")
    .replace(/<\s*\/\s*li\s*>/gi, "</li>");

  sanitized = sanitized.replace(/\r\n/g, "\n");

  return sanitized.trim();
}

export function stripRichTextFormatting(content: string) {
  if (!content) return "";

  const plain = sanitizeRichTextContent(content)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(div|p|li|ul|ol|blockquote|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*\/?[^>]+\s*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return plain;
}

export function getPlainTextLength(content: string) {
  return stripRichTextFormatting(content).length;
}

export function normalizeSocialPostText(content: string) {
  const plain = stripRichTextFormatting(content || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return plain;
}
