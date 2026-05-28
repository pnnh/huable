import { marked } from "marked";

type Props = { content: string; className?: string };

export default function MarkdownContent({ content, className = "" }: Props) {
    // marked.parse() is synchronous when not passed a callback
    const html = marked.parse(content) as string;

    return (
        <div
            className={`prose max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
