/**
 * MANVIA Application Footer
 */

import React from "react";
import { Container } from "./Container";

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        marginTop: "auto",
        borderTop: "1px solid var(--color-border-subtle)",
        backgroundColor: "var(--color-bg-surface)",
        padding: "var(--space-8) 0",
      }}
    >
      <Container>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <div
              style={{ fontWeight: 700, color: "var(--color-text-primary)" }}
            >
              MANVIA
            </div>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--color-text-muted)",
              }}
            >
              Care that feels human. All rights reserved.
            </div>
          </div>
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--color-text-muted)",
              display: "flex",
              gap: "1.5rem",
            }}
          >
            <span>Integrated Care</span>
            <span>Security First</span>
            <span>Privacy Assured</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};
