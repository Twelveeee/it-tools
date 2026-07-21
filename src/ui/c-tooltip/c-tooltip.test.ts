import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CTooltip from './c-tooltip.vue';

describe('CTooltip', () => {
  it('shows its tooltip for keyboard focus', async () => {
    const wrapper = mount(CTooltip as any, {
      props: { tooltip: 'Copy value' },
      slots: { default: '<button>Copy</button>' },
    });
    const target = wrapper.get('button');
    const tooltip = wrapper.get('[role="tooltip"]');
    await nextTick();

    expect(target.attributes('aria-describedby')).toBe(tooltip.attributes('id'));
    expect(tooltip.attributes('aria-hidden')).toBe('true');
    await target.trigger('focusin');
    expect(tooltip.attributes('aria-hidden')).toBe('false');
  });
});
