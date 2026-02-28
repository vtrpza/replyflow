import posthog from "posthog-js";

export type InputLengthBucket = "xs" | "sm" | "md" | "lg";

interface ReplyCreatedProps {
  is_first_reply: boolean;
  reply_type: string;
  input_length_bucket: InputLengthBucket;
}

interface ReplyCopiedProps {
  reply_type: string;
}

interface CtaClickedProps {
  location: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function computeInputLengthBucket(charCount: number): InputLengthBucket {
  if (charCount < 200) return "xs";
  if (charCount < 500) return "sm";
  if (charCount < 2000) return "md";
  return "lg";
}

export const analytics = {
  replyCreated(props: ReplyCreatedProps): void {
    if (!isBrowser()) return;
    posthog.capture("reply_created", props);
  },

  replyCopied(props: ReplyCopiedProps): void {
    if (!isBrowser()) return;
    posthog.capture("reply_copied", props);
  },

  ctaClicked(props: CtaClickedProps): void {
    if (!isBrowser()) return;
    posthog.capture("cta_clicked", props);
  },

  register(props: Record<string, unknown>): void {
    if (!isBrowser()) return;
    posthog.register(props);
  },
};
