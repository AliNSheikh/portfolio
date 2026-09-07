import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement> & { size?: number };
function Base({ size = 22, children, ...props }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}
export function Github(props: Props) {
  return (
    <Base {...props}>
      <path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.8c.1-1.1-.4-2.1-1-2.6 3.3-.4 6.8-1.6 6.8-7.2 0-1.5-.5-2.7-1.4-3.8.1-.4.6-1.8-.1-3.7 0 0-1.1-.4-3.8 1.4a13.3 13.3 0 0 0-7 0C5.8.5 4.7.9 4.7.9 4 2.8 4.5 4.2 4.6 4.6 3.7 5.7 3.2 6.9 3.2 8.4c0 5.6 3.5 6.8 6.8 7.2-.6.5-1.1 1.5-1 2.6V22" />
    </Base>
  );
}
export function Instagram(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" />
    </Base>
  );
}
export function Linkedin(props: Props) {
  return (
    <Base {...props}>
      <rect x="3" y="9" width="4" height="12" />
      <circle cx="5" cy="4.5" r="2" />
      <path d="M11 21V9h4v2c1-3 6-2.5 6 2v8h-4v-7c0-2-2-2-2 0v7Z" />
    </Base>
  );
}
