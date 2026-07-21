import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import CModal from './c-modal.vue';

describe('CModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders dialog semantics with an accessible name', async () => {
    const wrapper = mount(CModal as any, {
      props: { open: true, ariaLabel: 'Search tools' },
      slots: { default: '<button>First action</button>' },
      attachTo: document.body,
    });
    await nextTick();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-label')).toBe('Search tools');

    wrapper.unmount();
  });

  it('closes on Escape', async () => {
    const wrapper = mount(CModal as any, {
      props: { open: true },
      slots: { default: '<button>Action</button>' },
    });

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
  });

  it('wraps focus inside the dialog', async () => {
    const wrapper = mount(CModal as any, {
      props: { open: true },
      slots: { default: '<button id="first">First</button><button id="last">Last</button>' },
      attachTo: document.body,
    });
    await nextTick();

    const first = wrapper.get<HTMLButtonElement>('#first');
    const last = wrapper.get<HTMLButtonElement>('#last');
    last.element.focus();
    await last.trigger('keydown', { key: 'Tab' });

    expect(document.activeElement).toBe(first.element);

    const dialog = wrapper.get<HTMLElement>('[role="dialog"]');
    dialog.element.focus();
    await dialog.trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last.element);

    wrapper.unmount();
  });
});
