import { FileText } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.tokenizer.title'),
  path: '/tokenizer',
  description: translate('tools.tokenizer.description'),
  keywords: ['tokenizer', 'token', 'count', 'llm', 'gpt', 'gpt-5', 'gpt-5.4', 'qwen', 'deepseek', 'openai', 'ai'],
  component: () => import('./tokenizer.vue'),
  icon: FileText,
});
