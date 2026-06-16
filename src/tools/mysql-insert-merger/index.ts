import { DatabaseImport } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.mysql-insert-merger.title'),
  path: '/mysql-insert-merger',
  description: translate('tools.mysql-insert-merger.description'),
  keywords: ['mysql', 'insert', 'merge', 'sql', 'batch', 'database'],
  component: () => import('./mysql-insert-merger.vue'),
  icon: DatabaseImport,
  createdAt: new Date('2026-06-16'),
});
