import React, { useRef, useEffect, useEffectEvent, useState } from "react";
import { EditorView, keymap } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#c678dd" },
  { tag: tags.string, color: "#98c379" },
  { tag: tags.number, color: "#d19a66" },
  { tag: tags.comment, color: "#5c6370", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#61afef" },
  { tag: tags.typeName, color: "#e5c07b" },
  { tag: [tags.tagName, tags.angleBracket], color: "#e06c75" },
  { tag: tags.attributeName, color: "#d19a66" },
  { tag: tags.propertyName, color: "#abb2bf" },
]);

const minimalTheme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "13px", backgroundColor: "transparent" },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
      lineHeight: "1.6",
      padding: "12px",
    },
    ".cm-content": { caretColor: "#79b8ff" },
    ".cm-cursor": { borderLeftColor: "#79b8ff", borderLeftWidth: "2px" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "#3a3a3a",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-gutters": { display: "none" },
    ".cm-line": { color: "#b8b8b8" },
  },
  { dark: true },
);

type CodeEditorProps = {
  defaultValue: string;
  onChange: (code: string) => void;
  label: string;
  className?: string;
};

export function CodeEditor({
  defaultValue,
  onChange,
  label,
  className,
}: CodeEditorProps): React.ReactElement {
  const [initialDefaultValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);

  const onEditorChange = useEffectEvent((doc: string) => {
    onChange(doc);
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const onChangeExtension = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onEditorChange(update.state.doc.toString());
      }
    });

    const editor = new EditorView({
      doc: initialDefaultValue,
      extensions: [
        minimalTheme,
        syntaxHighlighting(highlightStyle),
        javascript({ jsx: true }),
        history(),
        closeBrackets(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
        onChangeExtension,
      ],
      parent: containerRef.current,
    });

    return () => editor.destroy();
  }, [initialDefaultValue]);

  return (
    <div className={`pane${className ? ` ${className}` : ""}`}>
      <div className="pane-header">{label}</div>
      <div className="editor-container" ref={containerRef} />
    </div>
  );
}
