// editorial-factory-ui asset: canonical empty state treatment
// Motion React: https://motion.dev/docs/react
import { motion } from "motion/react"

export function EditorialFactoryEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: "circOut" }}
    >
      <div>
        <div>
          <span className="font-mono text-6xl font-light text-border">[ ]</span>
        </div>
        <h2>Headline</h2>
        <p>Brief description in IBM Plex Mono.</p>
        <button>Action Label</button>
      </div>
    </motion.div>
  )
}
