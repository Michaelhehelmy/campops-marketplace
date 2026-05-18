import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { slotManager } from '../SlotManager';
import singleSpaReact from 'single-spa-react';

vi.mock('single-spa-react', () => {
  return {
    default: vi.fn().mockImplementation((config) => {
      return {
        _mockConfig: config,
        bootstrap: vi.fn(),
        mount: vi.fn(),
        unmount: vi.fn(),
      };
    }),
  };
});

describe('SlotManager Component', () => {
  beforeEach(() => {
    slotManager.clear();
    vi.clearAllMocks();
  });

  it('registers a React component as a single-spa parcel', () => {
    const TestComponent = () => <div>Test Slot Component</div>;
    slotManager.register('test-slot', TestComponent);

    // Verify component was cached
    expect(slotManager.getComponent('test-slot')).toBe(TestComponent);

    // Verify single-spa-react wrapper was called
    expect(singleSpaReact).toHaveBeenCalledWith(
      expect.objectContaining({
        React: expect.any(Object),
        ReactDOM: expect.any(Object),
        renderType: 'createRoot',
        rootComponent: TestComponent,
        errorBoundary: expect.any(Function),
      })
    );

    // Verify parcel config was registered
    const parcel = slotManager.getParcel('test-slot');
    expect(parcel).toBeDefined();
    expect((parcel as any)._mockConfig.rootComponent).toBe(TestComponent);
  });

  it('renders the error boundary element correctly when errors are caught', () => {
    const TestComponent = () => <div>Test Error Boundary Component</div>;
    slotManager.register('error-slot', TestComponent);

    const callConfig = (singleSpaReact as any).mock.calls[0][0];
    const errorBoundary = callConfig.errorBoundary;

    // Call the error boundary function directly
    const errorEl = errorBoundary(new Error('Sample render error'));

    expect(React.isValidElement(errorEl)).toBe(true);
    expect(errorEl.props.className).toContain('text-red-500');
    expect(errorEl.props.children).toContain('Sample render error');
  });

  it('registers a raw parcel configuration direct without React wrapping', () => {
    const mockParcelConfig = {
      bootstrap: async () => {},
      mount: async () => {},
      unmount: async () => {},
    } as any;

    slotManager.registerParcel('direct-parcel', mockParcelConfig);

    expect(slotManager.getParcel('direct-parcel')).toBe(mockParcelConfig);
  });

  it('clears all registered parcels when clear is invoked', () => {
    slotManager.registerParcel('p-1', {} as any);
    slotManager.registerParcel('p-2', {} as any);

    expect(slotManager.getParcel('p-1')).toBeDefined();
    expect(slotManager.getParcel('p-2')).toBeDefined();

    slotManager.clear();

    expect(slotManager.getParcel('p-1')).toBeUndefined();
    expect(slotManager.getParcel('p-2')).toBeUndefined();
  });

  it('returns undefined if slot component is not registered', () => {
    expect(slotManager.getComponent('missing-comp')).toBeUndefined();
    expect(slotManager.getParcel('missing-parcel')).toBeUndefined();
  });
});
