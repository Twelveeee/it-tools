import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import CButton from './c-button.vue';

describe('CButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders a non-submitting native button by default', () => {
    const wrapper = mount(CButton as any, { slots: { default: 'Run' } });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
  });

  it('uses native disabled semantics and does not emit clicks', async () => {
    const wrapper = mount(CButton as any, {
      props: { disabled: true },
      slots: { default: 'Run' },
    });

    expect(wrapper.attributes('disabled')).toBeDefined();
    expect(wrapper.attributes('aria-disabled')).toBe('true');

    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('removes navigation from disabled links', () => {
    const wrapper = mount(CButton as any, {
      props: { disabled: true, href: 'https://example.com' },
      slots: { default: 'Disabled link' },
    });

    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.attributes('href')).toBeUndefined();
    expect(wrapper.attributes('role')).toBe('link');
    expect(wrapper.attributes('tabindex')).toBe('-1');
  });

  it('renders router destinations as focusable links with an href', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/about', component: { template: '<div />' } },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(CButton as any, {
      global: { plugins: [router] },
      props: { to: '/about' },
      slots: { default: 'About' },
    });

    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.html()).toContain('href="/about"');
    expect(wrapper.element.tabIndex).toBe(0);
  });
});
