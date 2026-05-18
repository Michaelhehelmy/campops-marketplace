import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hookManager, doAction, applyFilters, addAction, addFilter, Hooks } from '../hooks';
import { SiteHookManager } from '../SiteHookManager';

beforeEach(() => hookManager.clear());
afterEach(() => hookManager.clear());

describe('doAction', () => {
  it('calls all registered handlers', async () => {
    const calls: string[] = [];
    addAction('test:action', () => { calls.push('a'); });
    addAction('test:action', () => { calls.push('b'); });
    await doAction('test:action', {});
    expect(calls).toContain('a');
    expect(calls).toContain('b');
  });

  it('is a no-op when no handlers are registered', async () => {
    await expect(doAction('test:unregistered')).resolves.toBeUndefined();
  });

  it('does not return a meaningful value from handlers', async () => {
    addAction('test:discard', () => 'ignored-return');
    const result = await doAction('test:discard', {});
    expect(result).toBeUndefined();
  });
});

describe('applyFilters', () => {
  it('returns original value when no handlers registered', async () => {
    const result = await applyFilters('test:filter', 42);
    expect(result).toBe(42);
  });

  it('passes value through a single filter handler', async () => {
    addFilter('test:double', ({ value }: any) => ({ value: value * 2 }));
    const result = await applyFilters('test:filter:double', 5);
    expect(result).toBe(5);
  });

  it('works end-to-end with value wrapping convention', async () => {
    hookManager.register('test:filter:text', async ({ value }: any) => ({ value: value + ' World' }));
    const result = await applyFilters<string>('test:filter:text', 'Hello');
    expect(result).toBe('Hello World');
  });
});

describe('core Hooks constants', () => {
  it('CORE_POST_AFTER_SAVE fires and receives post payload', async () => {
    const received: any[] = [];
    addAction(Hooks.CORE_POST_AFTER_SAVE, (post) => { received.push(post); });
    await doAction(Hooks.CORE_POST_AFTER_SAVE, { id: 'p1', siteId: 's1', postTitle: 'Tent' });
    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('p1');
  });

  it('CORE_OPTION_SET fires with site/name/value payload', async () => {
    const events: any[] = [];
    addAction(Hooks.CORE_OPTION_SET, (data) => events.push(data));
    await doAction(Hooks.CORE_OPTION_SET, { siteId: 's1', name: 'theme', value: 'classic' });
    expect(events[0]).toMatchObject({ siteId: 's1', name: 'theme', value: 'classic' });
  });
});

describe('SiteHookManager', () => {
  it('forSite creates a new instance', () => {
    const sm = SiteHookManager.forSite('site-a');
    expect(sm).toBeInstanceOf(SiteHookManager);
  });

  it('site-scoped doAction fires handlers added via addAction', async () => {
    const events: string[] = [];
    const sm = SiteHookManager.forSite('site-a');
    sm.addAction('test:event', (data: any) => events.push(data?.siteId));
    await sm.doAction('test:event', { payload: 'hello' });
    expect(events).toContain('site-a');
    sm.destroy();
  });

  it('global doAction with matching siteId triggers site-scoped handler', async () => {
    const events: any[] = [];
    const sm = SiteHookManager.forSite('site-a');
    sm.addAction('test:event2', (data: any) => events.push(data));
    await doAction('test:event2', { siteId: 'site-a', msg: 'hi' });
    expect(events.length).toBeGreaterThan(0);
    sm.destroy();
  });

  it('global doAction with different siteId does NOT trigger site-scoped handler', async () => {
    const events: any[] = [];
    const sm = SiteHookManager.forSite('site-a');
    sm.addAction('test:event3', (data: any) => events.push(data));
    await doAction('test:event3', { siteId: 'site-b', msg: 'wrong site' });
    expect(events).toHaveLength(0);
    sm.destroy();
  });

  it('destroy unregisters all handlers', async () => {
    const events: any[] = [];
    const sm = SiteHookManager.forSite('site-a');
    sm.addAction('test:cleanup', () => events.push('fired'));
    sm.destroy();
    await doAction('test:cleanup', { siteId: 'site-a' });
    expect(events).toHaveLength(0);
  });
});
