import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";

export const previewTheme = {
    ...vs,
    'code[class*="language-"]': {
        ...vs['code[class*="language-"]'],
        color: "#fff",
        background: "#222",
        padding: "0",
        margin: "0",
        borderRadius: "0",
        border: "none",
        fontSize: "14px",
        fontFamily: "inherit",
        lineHeight: "1.5",
    },
};