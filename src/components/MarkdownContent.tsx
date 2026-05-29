import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";

const SANITIZE_OPTIONS: IOptions = {
    allowedTags: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "ul", "ol", "li",
        "strong", "em", "del", "s",
        "code", "pre",
        "blockquote",
        "a",
        "img",
        "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
        a: ["href", "title"],
        img: ["src", "alt", "title"],
        th: ["align"],
        td: ["align"],
        code: ["class"],
        pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
        img: ["http", "https"],
    },
    // Allow relative URLs (e.g. /api/files/{noteId}/{filename}) for images and links
    allowedRelativeUrls: true,
    allowProtocolRelative: false,
};

type Props = { content: string; className?: string };

export default function MarkdownContent({ content, className = "" }: Props) {
    const rawHtml = marked.parse(content) as string;
    const safeHtml = sanitizeHtml(rawHtml, SANITIZE_OPTIONS);

    return (
        <div
            className={`prose max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
    );
}
