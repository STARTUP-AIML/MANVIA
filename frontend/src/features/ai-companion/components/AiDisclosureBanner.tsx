/**
 * MANVIA AI Disclosure & Safety Banner
 * Non-negotiable healthcare disclosure:
 * Prominently communicates that MANVIA AI is an automated non-clinical assistant,
 * NOT a human doctor, physician, or clinician, and cannot provide medical diagnosis.
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { AI_DISCLOSURE_NOTICE } from "../types";

export interface AiDisclosureBannerProps {
  compact?: boolean;
}

export const AiDisclosureBanner: React.FC<AiDisclosureBannerProps> = ({
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside
      className="manvia-ai-disclosure-banner"
      role="region"
      aria-label="AI Healthcare Disclaimer"
      style={{
        backgroundColor: "var(--color-info-subtle)",
        border: "1px solid var(--color-info-border)",
        borderRadius: "var(--radius-lg)",
        padding: compact ? "var(--space-3) var(--space-4)" : "var(--space-4)",
        marginBottom: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
      }}
      data-testid="ai-disclosure-banner"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{ fontSize: "1.25rem", lineHeight: 1 }}
            aria-hidden="true"
          >
            🤖
          </span>
          <span
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            You are chatting with MANVIA AI
          </span>
          <Badge variant="info" data-testid="ai-non-diagnostic-badge">
            AI • Non-Diagnostic
          </Badge>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            cursor: "pointer",
            padding: "var(--space-1) var(--space-2)",
            textDecoration: "underline",
          }}
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Hide full disclaimer" : "Read full medical notice"}
        </button>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--line-height-relaxed)",
        }}
      >
        MANVIA AI is an automated wellness companion for education and guidance.
        It is <strong>not a medical doctor</strong> and cannot diagnose
        illnesses or prescribe treatments.
      </p>

      {isExpanded && (
        <div
          style={{
            marginTop: "var(--space-2)",
            paddingTop: "var(--space-2)",
            borderTop: "1px solid var(--color-border-subtle)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-muted)",
            lineHeight: "var(--line-height-relaxed)",
          }}
          data-testid="full-ai-disclosure-notice"
        >
          <p style={{ margin: "0 0 var(--space-2) 0" }}>
            {AI_DISCLOSURE_NOTICE}
          </p>
          <p
            style={{
              margin: 0,
              color: "var(--color-danger)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            🚨 Emergency Notice: If you are experiencing chest pain, severe
            shortness of breath, thoughts of self-harm, or any medical
            emergency, please immediately contact your local emergency services
            (e.g. 911 / 999 / 112) or go to the nearest emergency room.
          </p>
        </div>
      )}
    </aside>
  );
};
