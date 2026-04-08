import { Code } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.php-unserialize.title'),
  path: '/php-unserialize',
  description: translate('tools.php-unserialize.description'),
  keywords: ['php', 'serialize', 'unserialize', 'print_r', 'var_dump', 'var_export'],
  component: () => import('./php-unserialize.vue'),
  icon: Code,
});
