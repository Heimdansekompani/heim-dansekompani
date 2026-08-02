import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

import {
  FONT_SIZE_CLASS_BY_VALUE,
  LINK_BUTTON_CLASS,
  TEXT_ALIGN_CLASS_BY_VALUE,
  isButtonLinkVariant,
  isSafeHref,
  isValidHexColor,
} from "@/lib/rich-text-constants";
import { cn } from "@/lib/utils";

/**
 * Renders Tiptap JSON content as trusted React elements — a hardcoded switch
 * over a known-safe set of node/mark types, never dangerouslySetInnerHTML.
 * Any unrecognized node or mark is silently dropped (fail closed) rather
 * than falling back to raw text/HTML rendering.
 */
export function RenderRichText({
  content,
  className,
}: {
  content: JSONContent | null | undefined;
  className?: string;
}) {
  if (!content) return null;

  return (
    <div className={cn("font-serif leading-relaxed text-white/80", className)}>
      {renderNode(content, "root")}
    </div>
  );
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const children = () =>
    node.content?.map((child, index) => renderNode(child, `${key}-${index}`));

  switch (node.type) {
    case "doc":
      return <Fragment key={key}>{children()}</Fragment>;

    case "paragraph": {
      const align = node.attrs?.textAlign;
      const className =
        typeof align === "string"
          ? TEXT_ALIGN_CLASS_BY_VALUE[align]
          : undefined;
      return (
        <p key={key} className={className}>
          {children() ?? <br />}
        </p>
      );
    }

    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-6">
          {children()}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="list-decimal pl-6">
          {children()}
        </ol>
      );

    case "listItem":
      return <li key={key}>{children()}</li>;

    case "hardBreak":
      return <br key={key} />;

    case "text":
      return (
        <Fragment key={key}>
          {renderMarks(node.text ?? "", node.marks)}
        </Fragment>
      );

    default:
      // Unrecognized node type: skip it rather than guessing how to render it.
      return null;
  }
}

function renderMarks(
  text: string,
  marks: JSONContent["marks"] = [],
): ReactNode {
  // reduceRight: ProseMirror renders a node's marks first-in-array outermost,
  // so wrap from the end to match the editor's DOM. The order matters — a
  // fontSize/color span must sit *inside* a button link's <a> to override its
  // baked-in text-sm/text-black, exactly as it does in the editor.
  return marks.reduceRight<ReactNode>((withMarks, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{withMarks}</strong>;

      case "italic":
        return <em>{withMarks}</em>;

      case "underline":
        return <u>{withMarks}</u>;

      case "link": {
        const href = mark.attrs?.href;
        if (!isSafeHref(href)) return withMarks;
        const isExternal = /^https?:/.test(href);
        // Unknown/absent variant falls back to a plain link (fail closed,
        // like every other unrecognized value in here).
        const variant = mark.attrs?.variant;
        const className = isButtonLinkVariant(variant)
          ? LINK_BUTTON_CLASS[variant]
          : "underline underline-offset-2 hover:text-white";
        return (
          <a
            href={href}
            className={className}
            {...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {withMarks}
          </a>
        );
      }

      case "textStyle": {
        const color = mark.attrs?.color;
        const fontSize = mark.attrs?.fontSize;

        const style: CSSProperties = {};
        if (isValidHexColor(color)) {
          style.color = color;
        }

        const fontSizeClass =
          typeof fontSize === "string"
            ? FONT_SIZE_CLASS_BY_VALUE[fontSize]
            : undefined;

        if (!fontSizeClass && Object.keys(style).length === 0) {
          return withMarks;
        }

        return (
          <span
            style={Object.keys(style).length > 0 ? style : undefined}
            className={fontSizeClass}
          >
            {withMarks}
          </span>
        );
      }

      default:
        // Unrecognized mark type: drop the mark, keep the text.
        return withMarks;
    }
  }, text);
}
