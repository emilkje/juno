import hljs from "highlight.js";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";

export function configure() {
    marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    }));
}