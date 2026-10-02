/**
 * MANVIA Container Primitive
 */

import React, { type HTMLAttributes, type ReactNode } from "react";

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  fluid?: boolean;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  fluid = false,
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      className={`manvia-container ${className}`}
      style={fluid ? { maxWidth: "100%", ...style } : style}
      {...props}
    >
      {children}
    </div>
  );
};
