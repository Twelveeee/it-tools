import { describe, expect, it } from 'vitest';
import { transformMysqlInserts } from './mysql-insert-merger.service';
import type { TransformMysqlInsertsOptions } from './mysql-insert-merger.service';

const sampleInput = "INSERT INTO `demo_app`.`demo_event_log` (`id`, `keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES (101, 'sample topic alpha', 9001, 'demo', 'example category', 123456, 7890, 12, '2026-01-01 10:00:00', '2026-01-01 10:00:00', '2026-01-01 10:05:00', '2026-01-01 10:10:00');\nINSERT INTO `demo_app`.`demo_event_log` (`id`, `keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES (102, 'sample topic beta', 9002, 'demo', 'sample category', 234567, 8901, 8, '2026-01-01 10:15:00', '2026-01-01 10:15:00', '2026-01-01 10:20:00', '2026-01-01 10:25:00');";

const defaultOptions: TransformMysqlInsertsOptions = {
  removeDatabaseName: true,
  removeId: true,
  batchSize: 1000,
};

function expectOutput(input: string, options = defaultOptions) {
  const result = transformMysqlInserts(input, options);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.value;
}

describe('mysql insert merger service', () => {
  it('removes database names and id columns while merging matching inserts by default', () => {
    expect(expectOutput(sampleInput)).toBe("INSERT INTO `demo_event_log` (`keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES ('sample topic alpha', 9001, 'demo', 'example category', 123456, 7890, 12, '2026-01-01 10:00:00', '2026-01-01 10:00:00', '2026-01-01 10:05:00', '2026-01-01 10:10:00'), ('sample topic beta', 9002, 'demo', 'sample category', 234567, 8901, 8, '2026-01-01 10:15:00', '2026-01-01 10:15:00', '2026-01-01 10:20:00', '2026-01-01 10:25:00');");
  });

  it('keeps database names when removeDatabaseName is disabled', () => {
    expect(expectOutput(sampleInput, {
      ...defaultOptions,
      removeDatabaseName: false,
    })).toContain('INSERT INTO `demo_app`.`demo_event_log`');
  });

  it('keeps id columns and values when removeId is disabled', () => {
    expect(expectOutput(sampleInput, {
      ...defaultOptions,
      removeId: false,
    })).toContain('(`id`, `keyword`');
    expect(expectOutput(sampleInput, {
      ...defaultOptions,
      removeId: false,
    })).toContain('VALUES (101,');
  });

  it('does not merge inserts when batch size is empty', () => {
    expect(expectOutput(sampleInput, {
      ...defaultOptions,
      batchSize: null,
    })).toBe("INSERT INTO `demo_event_log` (`keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES ('sample topic alpha', 9001, 'demo', 'example category', 123456, 7890, 12, '2026-01-01 10:00:00', '2026-01-01 10:00:00', '2026-01-01 10:05:00', '2026-01-01 10:10:00');\nINSERT INTO `demo_event_log` (`keyword`, `pid`, `source`, `source_cate`, `raw_heat_value`, `heat_value`, `max_rank`, `first_rank_time`, `last_rank_time`, `created_at`, `updated_at`) VALUES ('sample topic beta', 9002, 'demo', 'sample category', 234567, 8901, 8, '2026-01-01 10:15:00', '2026-01-01 10:15:00', '2026-01-01 10:20:00', '2026-01-01 10:25:00');");
  });

  it('splits merged output by batch size', () => {
    const input = [
      'INSERT INTO `db`.`topics` (`id`, `keyword`) VALUES (1, \'alpha\');',
      'INSERT INTO `db`.`topics` (`id`, `keyword`) VALUES (2, \'beta\');',
      'INSERT INTO `db`.`topics` (`id`, `keyword`) VALUES (3, \'gamma\');',
    ].join('\n');

    expect(expectOutput(input, {
      ...defaultOptions,
      batchSize: 2,
    })).toBe("INSERT INTO `topics` (`keyword`) VALUES ('alpha'), ('beta');\nINSERT INTO `topics` (`keyword`) VALUES ('gamma');");
  });

  it('does not split on punctuation inside string values', () => {
    const input = String.raw`INSERT INTO db.topics (id, keyword, note) VALUES (1, 'comma, paren ) and semicolon; stay', 'escaped \' quote and \\ slash');`;

    expect(expectOutput(input)).toBe(String.raw`INSERT INTO topics (keyword, note) VALUES ('comma, paren ) and semicolon; stay', 'escaped \' quote and \\ slash');`);
  });

  it('does not merge inserts with different tables or columns', () => {
    const input = [
      'INSERT INTO `db`.`topics` (`id`, `keyword`) VALUES (1, \'alpha\');',
      'INSERT INTO `db`.`topic_archive` (`id`, `keyword`) VALUES (2, \'beta\');',
      'INSERT INTO `db`.`topics` (`id`, `keyword`, `source`) VALUES (3, \'gamma\', \'weibo\');',
    ].join('\n');

    expect(expectOutput(input)).toBe("INSERT INTO `topics` (`keyword`) VALUES ('alpha');\nINSERT INTO `topic_archive` (`keyword`) VALUES ('beta');\nINSERT INTO `topics` (`keyword`, `source`) VALUES ('gamma', 'weibo');");
  });

  it('returns empty output for empty input', () => {
    expect(expectOutput('   \n  ')).toBe('');
  });

  it('returns an error for unsupported insert shapes', () => {
    const result = transformMysqlInserts('INSERT INTO topics SELECT * FROM other_topics;', defaultOptions);

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('INSERT INTO');
  });
});
