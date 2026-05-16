import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { PluginSlotProvider } from "@/components/PluginSlot";
import { PluginRegistryProvider } from "@/lib/pluginRegistry";
import { AuthProvider } from "@/contexts/AuthContext";

// Test utilities for rendering with providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PluginRegistryProvider>
          <PluginSlotProvider>
            <AuthProvider>{children}</AuthProvider>
          </PluginSlotProvider>
        </PluginRegistryProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
};

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };
export { createTestQueryClient };
export { AllTheProviders };
