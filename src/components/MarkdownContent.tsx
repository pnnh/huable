import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";

const marked = new Marked(
    markedHighlight({
        emptyLangClass: "hljs",
        langPrefix: "hljs language-",
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
        },
    })
);

const SANITIZE_OPTIONS: IOptions = {
    allowedTags: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "ul", "ol", "li",
        "strong", "em", "del", "s",
        "code", "pre", "span",
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
        span: ["class"],
    },
    allowedClasses: {
        code: ["hljs", "language-*"],
        span: ["hljs-*"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
        img: ["http", "https"],
    },
    // Relative URLs (e.g. /api/files/{noteId}/{filename}) are allowed by default
    // in sanitize-html when the URL has no scheme (naughtyHref returns false).
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
