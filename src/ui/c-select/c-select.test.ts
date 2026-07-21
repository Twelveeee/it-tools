import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import CSelect from './c-select.vue';

const options = [
  { label: 'Alpha', value: 'alpha' },
  { label: 'Beta', value: 'beta' },
];

describe('CSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('exposes combobox and listbox semantics', async () => {
    const wrapper = mount(CSelect as any, { props: { label: 'Choice', options } });
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.attributes('aria-label')).toBe('Choice');
    expect(combobox.attributes('aria-expanded')).toBe('false');

    await combobox.trigger('keydown', { key: 'Enter' });
    expect(combobox.attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[role="listbox"]').isVisible()).toBe(true);
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2);
  });

  it('does not select or throw when Enter is pressed with no filtered results', async () => {
    const wrapper = mount(CSelect as any, { props: { label: 'Choice', options, searchable: true } });

    await wrapper.get('.c-select-input').trigger('keydown', { key: 'Enter' });
    const searchInput = wrapper.get('input[role="combobox"]');
    await searchInput.setValue('no matching option');
    await searchInput.trigger('input');
    await searchInput.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('update:value')).toBeUndefined();
    expect(wrapper.get('[role="status"]').text()).toContain('No results found');
  });

  it('clamps keyboard selection to the filtered options', async () => {
    const wrapper = mount(CSelect as any, { props: { label: 'Choice', options, searchable: true } });

    await wrapper.get('.c-select-input').trigger('keydown', { key: 'Enter' });
    const searchInput = wrapper.get('input[role="combobox"]');
    await searchInput.setValue('Beta');
    await searchInput.trigger('input');
    await searchInput.trigger('keydown', { key: 'ArrowDown' });
    await searchInput.trigger('keydown', { key: 'Enter' });

    expect(wrapper.emitted('update:value')?.[0]).toEqual(['beta']);
  });

  it('prevents pointer and keyboard interaction when disabled', async () => {
    const wrapper = mount(CSelect as any, { props: { label: 'Choice', options, disabled: true } });
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.attributes('aria-disabled')).toBe('true');
    expect(combobox.attributes('aria-expanded')).toBe('false');
    expect(combobox.attributes('tabindex')).toBe('-1');
    expect(combobox.classes()).toContain('is-disabled');

    await combobox.trigger('click');
    await combobox.trigger('keydown', { key: 'Enter' });
    await combobox.trigger('keydown', { key: ' ' });
    await combobox.trigger('keydown', { key: 'ArrowDown' });

    expect(combobox.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[role="listbox"]').isVisible()).toBe(false);
    expect(wrapper.emitted('update:value')).toBeUndefined();
  });

  it('closes an open select when it becomes disabled and works again when enabled', async () => {
    const wrapper = mount(CSelect as any, { props: { label: 'Choice', options } });
    const combobox = wrapper.get('[role="combobox"]');

    await combobox.trigger('keydown', { key: 'Enter' });
    expect(combobox.attributes('aria-expanded')).toBe('true');

    await wrapper.setProps({ disabled: true });
    expect(combobox.attributes('aria-disabled')).toBe('true');
    expect(combobox.attributes('aria-expanded')).toBe('false');
    expect(combobox.attributes('tabindex')).toBe('-1');
    expect(wrapper.get('[role="listbox"]').isVisible()).toBe(false);

    await wrapper.setProps({ disabled: false });
    await combobox.trigger('keydown', { key: 'Enter' });
    expect(combobox.attributes('aria-disabled')).toBe('false');
    expect(combobox.attributes('aria-expanded')).toBe('true');
  });
});
