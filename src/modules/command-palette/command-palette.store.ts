import { defineStore } from 'pinia';
import Fuse from 'fuse.js';
import _ from 'lodash';
import type { PaletteOption } from './command-palette.types';
import { useToolStore } from '@/tools/tools.store';
import { useStyleStore } from '@/stores/style.store';

import SunIcon from '~icons/mdi/white-balance-sunny';
import DiceIcon from '~icons/mdi/dice-5';
import InfoIcon from '~icons/mdi/information-outline';

export const useCommandPaletteStore = defineStore('command-palette', () => {
  const toolStore = useToolStore();
  const styleStore = useStyleStore();
  const router = useRouter();
  const searchPrompt = ref('');

  const searchOptions = computed<PaletteOption[]>(() => [
    ...toolStore.tools.map(tool => ({
      ...tool,
      to: tool.path,
      toolCategory: tool.category,
      category: 'Tools',
    })),
    {
      name: 'Random tool',
      description: 'Get a random tool from the list.',
      action: () => {
        const tool = _.sample(toolStore.tools);
        if (tool) {
          router.push(tool.path);
        }
      },
      icon: DiceIcon,
      category: 'Tools',
      keywords: ['random', 'tool', 'pick', 'choose', 'select'],
      closeOnSelect: true,
    },
    {
      name: 'Toggle dark mode',
      description: 'Toggle dark mode on or off.',
      action: () => styleStore.toggleDark(),
      icon: SunIcon,
      category: 'Actions',
      keywords: ['dark', 'theme', 'toggle', 'mode', 'light', 'system'],
    },
    {
      name: 'About',
      description: 'Learn more about IT-Tools.',
      to: '/about',
      category: 'Pages',
      keywords: ['about', 'learn', 'more', 'info', 'information'],
      icon: InfoIcon,
    },
  ]);

  const filteredSearchResult = computed(() => {
    const options = searchPrompt.value === ''
      ? searchOptions.value
      : new Fuse(searchOptions.value, {
        keys: [{ name: 'name', weight: 2 }, 'description', 'keywords', 'category'],
        threshold: 0.3,
      }).search(searchPrompt.value).map(({ item }) => item);

    return _.chain(options).groupBy('category').mapValues(categoryOptions => _.take(categoryOptions, 5)).value();
  });

  return {
    filteredSearchResult,
    searchPrompt,
  };
});
