declare module 'js-tiktoken/ranks/o200k_base' {
  const ranks: {
    bpe_ranks: string
    pat_str: string
    special_tokens: Record<string, number>
  };

  export default ranks;
}
