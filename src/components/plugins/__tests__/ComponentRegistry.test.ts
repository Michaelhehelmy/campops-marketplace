/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { componentRegistry } from '../ComponentRegistry';

describe('ComponentRegistry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    const registry = componentRegistry as any;
    registry.components.clear();
  });

  it('should register a component', () => {
    const TestComponent = () => null;
    componentRegistry.register('test:TestComponent', TestComponent);
    expect(componentRegistry.get('test:TestComponent')).toBe(TestComponent);
  });

  it('should return undefined for non-existent component', () => {
    expect(componentRegistry.get('missing')).toBeUndefined();
  });

  it('should retrieve all registered components', () => {
    const Component1 = () => null;
    const Component2 = () => null;

    componentRegistry.register('test:Component1', Component1);
    componentRegistry.register('test:Component2', Component2);

    const all = componentRegistry.getAll();
    expect(all.size).toBe(2);
    expect(all.get('test:Component1')).toBe(Component1);
    expect(all.get('test:Component2')).toBe(Component2);
  });

  it('should return a copy of the components map to prevent external mutation', () => {
    const TestComponent = () => null;
    componentRegistry.register('test:TestComponent', TestComponent);

    const all1 = componentRegistry.getAll();
    const all2 = componentRegistry.getAll();

    expect(all1).not.toBe(all2);
    expect(all1.get('test:TestComponent')).toBe(TestComponent);
  });

  it('should export itself to window', () => {
    expect((window as any).componentRegistry).toBe(componentRegistry);
  });
});
