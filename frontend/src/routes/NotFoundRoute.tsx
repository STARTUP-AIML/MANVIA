/**
 * MANVIA 404 Not Found Route
 */

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const NotFoundRoute: React.FC = () => {
  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          textAlign: "center",
        }}
      >
        <span
          style={{ fontSize: "3rem", marginBottom: "var(--space-2)" }}
          aria-hidden="true"
        >
          🧭
        </span>
        <h1 className="heading-1">Page Not Found</h1>
        <p
          className="body-regular"
          style={{ maxWidth: 440, margin: "var(--space-2) 0 var(--space-6)" }}
        >
          The requested page could not be located. It may have moved or does not
          exist.
        </p>
        <Link to="/" style={{ textDecoration: "none" }}>
          <Button variant="primary" size="md">
            Return to Home
          </Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
};
