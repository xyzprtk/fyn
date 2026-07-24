"use client"

import * as React from "react"
import { motion, type MotionProps } from "motion/react"

import { Button } from "@/components/ui/button"

type MotionButtonProps = React.ComponentProps<typeof Button> & MotionProps

const MotionButtonBase = motion.create(Button)

/**
 * shadcn Button with the standard fyn spring + tactile press.
 * Use this instead of Button for anything clickable that isn't a link.
 */
export function MotionButton({
  whileTap = { scale: 0.98 },
  transition = { type: "spring", stiffness: 260, damping: 24 },
  ...props
}: MotionButtonProps) {
  return (
    <MotionButtonBase
      whileTap={whileTap}
      transition={transition}
      {...props}
    />
  )
}
