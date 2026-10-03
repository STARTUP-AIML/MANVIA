/**
 * MANVIA Root Application Component
 */

import React from "react";
import { BrowserRouter, useInRouterContext } from "react-router-dom";
import { AppProviders } from "./providers";
import { AppRoutes } from "./router";

export const AppContent: React.FC = () => {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
};

export const App: React.FC = () => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return <AppContent />;
  }
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
