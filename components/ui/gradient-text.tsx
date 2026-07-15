"use client";

import React from "react";

type GradientTextProps = {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  showBlend?: boolean;
};

export function GradientText({
  as: Component = "span",
  children,
  className = "",
  showBlend = true,
  ...props
}: GradientTextProps) {
  return (
    <Component
      className={`gradient-text ${className}`.trim()}
      {...props}
    >
      <span className="gradient-text__content">{children}</span>
      {showBlend && (
        <span aria-hidden="true" className="gradient-text__blend">
          <span className="gradient-text__blob gradient-text__blob--1" />
          <span className="gradient-text__blob gradient-text__blob--3" />
          <span className="gradient-text__blob gradient-text__blob--5" />
          <span className="gradient-text__blob gradient-text__blob--6" />
        </span>
      )}
    </Component>
  );
}
