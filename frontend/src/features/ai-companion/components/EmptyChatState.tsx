/**
 * MANVIA AI Companion Empty Chat State
 * Welcoming empty conversation view with supportive guidance and safe prompt chips.
 * All suggested prompts focus on lifestyle, wellness, and sleep hygiene,
 * strictly avoiding diagnostic or medical claims.
 */

import React from "react";
import { Card } from "@/components/ui/Card";

export interface EmptyChatStateProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

const SUGGESTED_PROMPTS = [
  {
    icon: "🌙",
    label: "Sleep Routine",
    prompt: "How can I improve my sleep routine naturally?",
  },
  {
    icon: "🧘",
    label: "Stress Relief",
    prompt: "Tips for managing daily stress and taking mindful breaks",
  },
  {
    icon: "💧",
    label: "Hydration",
    prompt: "Healthy hydration habits for workdays",
  },
  {
    icon: "🥗",
    label: "Nutrition Basics",
    prompt: "Understanding balanced nutrition and mindful eating basics",
  },
];

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <div
      className="manvia-ai-empty-state"
      data-testid="ai-empty-chat-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "var(--color-primary-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "2rem",
          marginBottom: "var(--space-4)",
        }}
        aria-hidden="true"
      >
        🤖
      </div>

      <h2
        className="heading-2"
        style={{
          marginBottom: "var(--space-2)",
          color: "var(--color-text-primary)",
        }}
      >
        Hi, I&apos;m your MANVIA AI Companion
      </h2>

      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-md)",
          lineHeight: "var(--line-height-relaxed)",
          marginBottom: "var(--space-6)",
          maxWidth: "480px",
        }}
      >
        I provide educational guidance on sleep hygiene, stress reduction, and
        daily healthy habits. How can I help you today?
      </p>

      <div
        style={{
          width: "100%",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "var(--space-3)",
            textAlign: "center",
          }}
        >
          Suggested Questions
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <Card
              key={idx}
              interactive
              onClick={() => !disabled && onSelectPrompt(item.prompt)}
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                padding: "var(--space-3) var(--space-4)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--color-border-subtle)",
                transition: "all var(--transition-fast)",
                backgroundColor: "var(--color-bg-surface)",
              }}
              data-testid={`suggested-prompt-${idx}`}
            >
              <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
                {item.icon}
              </span>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-primary)",
                    marginBottom: "2px",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--color-text-secondary)",
                    lineHeight: "var(--line-height-normal)",
                  }}
                >
                  {item.prompt}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
