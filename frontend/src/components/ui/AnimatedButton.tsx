import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "disabled";

interface AnimatedButtonProps {
  children: ReactNode;
  href?: string;
  to?: string; // internal react-router route
  variant?: Variant;
  icon?: ReactNode;
  className?: string;
  external?: boolean;
  disabledHint?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-300 ease-snap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 select-none";

const styles: Record<Variant, string> = {
  primary:
    "bg-isel-navy text-white hover:bg-isel-gold hover:text-isel-navy focus-visible:outline-isel-gold",
  secondary:
    "border-2 border-isel-navy text-isel-navy hover:bg-isel-navy hover:text-white focus-visible:outline-isel-navy",
  ghost:
    "border-2 border-white/60 text-white hover:border-isel-gold hover:bg-isel-gold hover:text-isel-navy focus-visible:outline-isel-gold",
  disabled: "cursor-not-allowed border-2 border-dashed border-isel-ink/25 text-isel-ink/40",
};

/**
 * Solid-color interactive button (no gradients, per design guidelines).
 * Handles three cases: external link (<a target=_blank>), internal route
 * (react-router <Link>), and a disabled "coming soon" state (Inscripción).
 */
export function AnimatedButton({
  children,
  href,
  to,
  variant = "primary",
  icon,
  className = "",
  external = true,
  disabledHint,
}: AnimatedButtonProps) {
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (variant === "disabled") {
    return (
      <span className={`${base} ${styles.disabled} ${className}`} title={disabledHint ?? "Próximamente"}>
        {content}
      </span>
    );
  }

  const motionProps = {
    whileHover: { y: -2, scale: 1.02 },
    whileTap: { scale: 0.96 },
    transition: { type: "spring", stiffness: 420, damping: 22 } as const,
  };

  if (to) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`${base} ${styles[variant]} ${className}`}
      {...motionProps}
    >
      {content}
    </motion.a>
  );
}
