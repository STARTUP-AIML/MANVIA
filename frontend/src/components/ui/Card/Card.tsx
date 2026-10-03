/**
 * MANVIA Card Primitive
 * Modular surface container for healthcare and clinical UI blocks.
 */

import React, { type HTMLAttributes, type ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`manvia-card ${interactive ? "manvia-card-interactive" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`manvia-card-header ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <h3 className={`heading-3 ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<
  HTMLAttributes<HTMLParagraphElement>
> = ({ children, className = "", ...props }) => {
  return (
    <p
      className={`body-small ${className}`}
      style={{ marginTop: "0.25rem" }}
      {...props}
    >
      {children}
    </p>
  );
};

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`manvia-card-body ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className={`manvia-card-footer ${className}`} {...props}>
      {children}
    </div>
  );
};
