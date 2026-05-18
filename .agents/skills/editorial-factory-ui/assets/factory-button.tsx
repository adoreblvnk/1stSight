// editorial-factory-ui asset: canonical factory button treatment
// Motion React: https://motion.dev/docs/react
import type { ReactNode } from "react"
import { motion } from "motion/react"

type FactoryButtonProps = {
  children: ReactNode
  linesColor: string
  className?: string
}

export function FactoryButton({ children, linesColor, className }: FactoryButtonProps) {
  return (
    <motion.div whileTap={{ scale: 0.985 }} transition={{ duration: 0.08, ease: "linear" }}>
      <button className={className ?? "group relative h-9 overflow-hidden rounded-sm"}>
        <span className="relative z-10">{children}</span>
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-[0.08]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, var(--lines-color) 0, var(--lines-color) 1px, transparent 0, transparent 50%)",
              backgroundSize: "7.07px 7.07px",
              animation: "factory-slide 0.4s linear infinite",
              ["--lines-color" as string]: linesColor,
            }}
          />
        </div>
      </button>
    </motion.div>
  )
}
