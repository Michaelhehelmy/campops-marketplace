import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  Component,
  type ErrorInfo,
} from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slots, type SlotName } from "@/lib/pluginRegistry";
import { componentRegistry } from "@/lib/ComponentRegistry";
import { usePluginRegistry } from "@/lib/pluginRegistry";

// ─── Re-export slot catalogue for convenience ─────────────────────────────────

export { Slots, type SlotName };

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotComponent = React.ComponentType<Record<string, any>>;

interface SlotEntry {
  component: SlotComponent;
  pluginId: string;
}

interface SlotRegistry {
  components: Map<string, SlotEntry[]>;
  register(slotName: string, component: SlotComponent, pluginId?: string): () => void;
  getEntries(slotName: string): SlotEntry[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SlotContext = createContext<SlotRegistry | null>(null);

const NULL_REGISTRY: SlotRegistry = {
  components: new Map(),
  register: () => () => {},
  getEntries: () => [],
};

function useSlotRegistry(): SlotRegistry {
  const ctx = useContext(SlotContext);
  if (!ctx) {
    if (process.env.NODE_ENV === "test") return NULL_REGISTRY;
    throw new Error("PluginSlot used outside <PluginSlotProvider>");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap the app root with this provider to enable plugin UI slots.
 * Place it inside QueryClientProvider and AuthProvider.
 */
export function PluginSlotProvider({ children }: { children: React.ReactNode }) {
  const [v, forceUpdate] = useState(0);
  const components = React.useRef<Map<string, SlotEntry[]>>(new Map());

  const register = useCallback(
    (slotName: string, component: SlotComponent, pluginId = "unknown"): (() => void) => {
      const list = components.current.get(slotName) ?? [];
      const entry: SlotEntry = { component, pluginId };
      list.push(entry);
      components.current.set(slotName, list);
      forceUpdate((n) => n + 1);

      return () => {
        const current = components.current.get(slotName) ?? [];
        components.current.set(
          slotName,
          current.filter((e) => e !== entry)
        );
        forceUpdate((n) => n + 1);
      };
    },
    []
  );

  const getEntries = useCallback((slotName: string): SlotEntry[] => {
    return components.current.get(slotName) ?? [];
  }, []);

  const registry: SlotRegistry = React.useMemo(
    () => ({ components: components.current, register, getEntries, _v: v }),
    [register, getEntries, v]
  );

  return <SlotContext.Provider value={registry}>{children}</SlotContext.Provider>;
}

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface PluginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PluginErrorBoundary extends Component<
  { pluginId: string; slotName: string; children: React.ReactNode },
  PluginErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): PluginErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[PluginSlot] Component from plugin "${this.props.pluginId}" crashed in slot "${this.props.slotName}":`,
      error,
      info
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Plugin component failed to load
          {import.meta.env.DEV && (
            <span className="ml-1 opacity-60">({this.state.error?.message})</span>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── PluginSlot ───────────────────────────────────────────────────────────────

interface PluginSlotProps {
  /** One of the registered slot names from the Slots catalogue */
  name: SlotName | string;
  /** Props forwarded to every component in the slot */
  props?: Record<string, any>;
  /** Rendered when no plugin has registered into this slot */
  fallback?: React.ReactNode;
  /** Override the loading skeleton (shown while lazy component loads) */
  loadingFallback?: React.ReactNode;
  /** CSS class applied to the wrapping fragment container */
  className?: string;
}

const DefaultSkeleton = () => <Skeleton className="h-24 w-full rounded-2xl" />;

/**
 * Renders all components registered for a named slot.
 *
 * - Combines components registered via usePluginSlot (imperative)
 * - AND components registered in the backend registry (declarative)
 *
 * @example
 * ```tsx
 * <PluginSlot name={Slots.DASHBOARD_WIDGETS} props={{ propertyId }} />
 * ```
 */
export function PluginSlot({
  name,
  props = {},
  fallback = null,
  loadingFallback,
  className,
}: PluginSlotProps) {
  const { registry } = usePluginRegistry();
  const slotRegistry = useSlotRegistry();

  // 1. Get components registered imperatively via usePluginSlot
  const localEntries = slotRegistry.getEntries(name);

  // 2. Get component keys registered declaratively in the backend registry
  const remoteKeys = registry?.slots?.[name] ?? [];
  const remoteEntries = remoteKeys
    .map((key) => {
      const component = componentRegistry.resolve(key);
      if (!component) {
        console.warn(`[PluginSlot] Could not resolve component for key: ${key}`);
        return null;
      }
      return { component, pluginId: key.split(":")[0] };
    })
    .filter(Boolean) as SlotEntry[];

  // 3. Merge all entries
  const allEntries = [...localEntries, ...remoteEntries];

  if (allEntries.length === 0) return <>{fallback}</>;

  const skeleton = loadingFallback ?? <DefaultSkeleton />;

  return (
    <div className={className}>
      {allEntries.map((entry, i) => {
        const { component: Comp, pluginId } = entry;
        return (
          <PluginErrorBoundary key={`${name}-${pluginId}-${i}`} pluginId={pluginId} slotName={name}>
            <React.Suspense fallback={skeleton}>
              <Comp {...props} />
            </React.Suspense>
          </PluginErrorBoundary>
        );
      })}
    </div>
  );
}

// ─── usePluginSlot ────────────────────────────────────────────────────────────

/**
 * Register a component into a named slot.
 * The component is automatically unregistered when the calling component unmounts.
 *
 * @example
 * ```tsx
 * usePluginSlot(Slots.DASHBOARD_WIDGETS, MyWidget, "my-plugin");
 * ```
 */
export function usePluginSlot(
  slotName: SlotName | string,
  component: SlotComponent,
  pluginId = "unknown"
): void {
  const { register } = useSlotRegistry();
  React.useEffect(() => {
    const cleanup = register(slotName, component, pluginId);
    return cleanup;
  }, [slotName, component, pluginId, register]);
}

// ─── Legacy alias ─────────────────────────────────────────────────────────────

/** @deprecated Use Slots from @/lib/pluginRegistry instead */
export const AdminSlots = {
  DASHBOARD_WIDGETS: Slots.DASHBOARD_WIDGETS,
  SIDEBAR_NAV_ITEMS: Slots.NAV_MAIN,
  SETTINGS_PAGES: Slots.ADMIN_SETTINGS_TABS,
  RESERVATION_DETAIL_TABS: Slots.RESERVATION_DETAIL,
  GUEST_PROFILE_SECTIONS: Slots.GUEST_PROFILE_SECTIONS,
  POS_ORDER_ACTIONS: Slots.POS_ACTIONS,
} as const;
