import { DatabaseImport } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.mysql-in-query.title'),
  path: '/mysql-in-query',
  description: translate('tools.mysql-in-query.description'),
  keywords: ['mysql', 'in', 'query', 'sql', 'list', 'quote', 'string'],
  component: () => import('./mysql-in-query.vue'),
  icon: DatabaseImport,
  createdAt: new Date('2026-04-02'),
});
