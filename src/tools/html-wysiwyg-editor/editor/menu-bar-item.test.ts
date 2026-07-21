import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, markRaw } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MenuBar from './menu-bar.vue';
import MenuBarItem from './menu-bar-item.vue';

const menuItemTitles = [
  'Bold',
  'Italic',
  'Strike',
  'Inline code',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Heading 4',
  'Bullet list',
  'Ordered list',
  'Code block',
  'Blockquote',
  'Hard break',
  'Clear format',
  'Undo',
  'Redo',
];

describe('MenuBarItem', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('names the icon button, hides the icon, and preserves its tooltip and action', async () => {
    const action = vi.fn();
    const icon = markRaw(defineComponent({
      render: () => h('svg'),
    }));
    const wrapper = mount(MenuBarItem as any, {
      props: {
        action,
        icon,
        title: 'Bold',
      },
    });
    await nextTick();

    const button = wrapper.get('button');
    const tooltip = wrapper.get('[role="tooltip"]');

    expect(button.attributes('aria-label')).toBe('Bold');
    expect(button.attributes('aria-describedby')).toBe(tooltip.attributes('id'));
    expect(button.find('[aria-hidden="true"]').exists()).toBe(true);
    expect(tooltip.text()).toBe('Bold');

    await button.trigger('click');
    expect(action).toHaveBeenCalledOnce();
  });

  it('gives all 16 WYSIWYG toolbar buttons their title as an accessible name', async () => {
    const wrapper = mount(MenuBar as any, {
      props: {
        editor: {
          isActive: () => false,
        },
      },
    });
    await nextTick();

    const buttons = wrapper.findAll('button');

    expect(buttons.map(button => button.attributes('aria-label'))).toEqual(menuItemTitles);
    expect(buttons.every(button => button.find('[aria-hidden="true"]').exists())).toBe(true);
  });
});
