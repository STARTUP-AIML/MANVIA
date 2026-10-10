import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CanvasContainer } from "./CanvasContainer";
import { CareNetwork } from "./CareNetwork";
import { ECOSYSTEM_NODES } from "./constants";
import { useReducedMotion } from "./useReducedMotion";

interface InteractiveEcosystemProps {
  className?: string;
}

/**
 * Interactive Ecosystem 3D Section component.
 * Allows hovering or clicking nodes in 3D or via accessible badges,
 * highlighting the node, increasing glow, emphasizing connections,
 * and displaying contextual healthcare intelligence details.
 */
export const InteractiveEcosystem: React.FC<InteractiveEcosystemProps> = ({
  className = "",
}) => {
  const [activeNodeId, setActiveNodeId] = useState<string | null>("ai-companion");
  const prefersReducedMotion = useReducedMotion();
  const navigate = useNavigate();

  const activeNode =
    ECOSYSTEM_NODES.find((n) => n.id === activeNodeId) ?? ECOSYSTEM_NODES[0]!;

  return (
    <div
      className={`interactive-ecosystem-wrapper ${className}`}
      data-testid="interactive-ecosystem"
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* 3D Canvas Visualization Frame */}
      <div
        style={{
          width: "100%",
          height: "480px",
          borderRadius: "26px",
          background:
            "radial-gradient(ellipse at center, rgba(14, 165, 233, 0.09) 0%, rgba(14, 124, 115, 0.04) 50%, rgba(7, 25, 54, 0.02) 80%, transparent 100%)",
          border: "1.5px solid rgba(204, 235, 232, 0.8)",
          boxShadow: "0 16px 40px rgba(14, 124, 115, 0.07), 0 4px 12px rgba(15, 23, 42, 0.03)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <CanvasContainer
          cameraPosition={[0, 0, 7.2]}
          fov={42}
          ariaLabel="Interactive Healthcare Ecosystem 3D Visualization"
          fallback={
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                textAlign: "center",
                background: "linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0d9488, #2dd4bf)",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontSize: "32px",
                  marginBottom: "16px",
                  boxShadow: "0 8px 24px rgba(13, 148, 136, 0.25)",
                }}
              >
                ✦
              </div>
              <h3 style={{ margin: "0 0 6px 0", color: "#093733", fontSize: "1.25rem" }}>
                Connected Healthcare Ecosystem
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#4B6482",
                  maxWidth: "460px",
                  lineHeight: 1.5,
                }}
              >
                AI Companion, Proactive Wellness, Verified Indian Clinicians,
                Real-Time Appointments, and Longitudinal Health Records harmonized
                through MANVIA Care Intelligence.
              </p>
            </div>
          }
        >
          <CareNetwork
            activeNodeId={activeNodeId}
            onSelectNode={setActiveNodeId}
            reducedMotion={prefersReducedMotion}
          />
        </CanvasContainer>

        {/* Ambient Top Hint */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(204, 235, 232, 0.85)",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#0E7C73",
            boxShadow: "0 2px 8px rgba(14, 124, 115, 0.06)",
            pointerEvents: "none",
            zIndex: 4,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#14B8A6",
              boxShadow: "0 0 6px #14B8A6",
            }}
          />
          <span>Interactive 3D Universe • Click or hover nodes</span>
        </div>

        {/* Ambient Overlay Legend Badge */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            right: "16px",
            maxWidth: "520px",
            padding: "10px 16px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(204, 235, 232, 0.9)",
            boxShadow: "0 6px 20px rgba(14, 124, 115, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            zIndex: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: activeNode.glowColor,
                boxShadow: `0 0 10px ${activeNode.glowColor}`,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#0E7C73",
                  fontFamily: "'Figtree', sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeNode.label}
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {activeNode.category}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#3D615D",
                  fontFamily: "'Figtree', sans-serif",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {activeNode.description}
              </div>
            </div>
          </div>

          {activeNode.route && (
            <button
              type="button"
              onClick={() => navigate(activeNode.route!)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "12px",
                background: "#0E7C73",
                color: "#ffffff",
                fontSize: "11.5px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#093733";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0E7C73";
              }}
            >
              Explore Node <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Node Selector Tabs (Accessible 2-way controls) */}
      <div
        role="tablist"
        aria-label="Healthcare Ecosystem Services"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "center",
        }}
      >
        {ECOSYSTEM_NODES.map((node) => {
          const isSelected = activeNodeId === node.id;
          return (
            <button
              key={node.id}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => setActiveNodeId(node.id)}
              onMouseEnter={() => setActiveNodeId(node.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "22px",
                fontSize: "12.5px",
                fontWeight: 600,
                fontFamily: "'Figtree', sans-serif",
                border: isSelected
                  ? `1.5px solid ${node.color}`
                  : "1px solid #E2E8F0",
                background: isSelected ? "rgba(240, 253, 250, 0.95)" : "#ffffff",
                color: isSelected ? "#0E7C73" : "#475569",
                boxShadow: isSelected
                  ? "0 4px 14px rgba(14, 124, 115, 0.14)"
                  : "0 1px 3px rgba(0, 0, 0, 0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ color: node.color, fontSize: "14px" }}>{node.icon}</span>
              <span>{node.label}</span>
              {isSelected && (
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    backgroundColor: node.color,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
