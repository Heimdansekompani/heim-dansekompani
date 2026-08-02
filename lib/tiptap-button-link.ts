import { Link } from "@tiptap/extension-link";

import {
  LINK_BUTTON_CLASS,
  isButtonLinkVariant,
} from "@/lib/rich-text-constants";

// The stock Link mark plus a `variant` attribute ("link" | "button" |
// "button-outline"). Keeps the mark name "link" so already-authored content
// and the public renderer's switch case are untouched; plain links carry no
// data-variant attribute at all (dirty-state and selector parity — the
// editor's default underline styling targets a:not([data-variant])).
export const ButtonLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      variant: {
        default: "link",
        parseHTML: (element) => element.getAttribute("data-variant") ?? "link",
        renderHTML: (attributes) => {
          if (!isButtonLinkVariant(attributes.variant)) return {};
          return {
            "data-variant": attributes.variant,
            class: LINK_BUTTON_CLASS[attributes.variant],
          };
        },
      },
    };
  },
});
