interface RegExpGroupIndices {
  [name: string]: [number, number]
}
interface RegExpIndices extends Array<[number, number]> {
  groups: RegExpGroupIndices
}
interface RegExpExecArrayWithIndices extends RegExpExecArray {
  indices: RegExpIndices
}
interface GroupCapture {
  name: string
  value: string
  start: number
  end: number
}

export interface RegexMatch {
  index: number
  value: string
  captures: GroupCapture[]
  groups: GroupCapture[]
}

export function matchRegex(regex: string, text: string, flags: string, maxResults = 1_000): RegexMatch[] {
  if (regex === '' || text === '') {
    return [];
  }

  let lastIndex = -1;
  const re = new RegExp(regex, flags);
  const results: RegexMatch[] = [];
  let match = re.exec(text) as RegExpExecArrayWithIndices | null;
  while (match !== null && results.length < maxResults) {
    if (re.lastIndex === lastIndex || match[0] === '') {
      break;
    }
    const indices = match.indices;
    const captures: Array<GroupCapture> = [];
    Object.entries(match).forEach(([captureName, captureValue]) => {
      if (captureName !== '0' && captureName.match(/\d+/)) {
        const captureIndices = indices[Number(captureName)];
        if (!captureIndices) {
          return;
        }
        captures.push({
          name: captureName,
          value: captureValue,
          start: captureIndices[0],
          end: captureIndices[1],
        });
      }
    });
    const groups: Array<GroupCapture> = [];
    Object.entries(match.groups || {}).forEach(([groupName, groupValue]) => {
      const groupIndices = indices.groups?.[groupName];
      if (!groupIndices) {
        return;
      }
      groups.push({
        name: groupName,
        value: groupValue,
        start: groupIndices[0],
        end: groupIndices[1],
      });
    });
    results.push({
      index: match.index,
      value: match[0],
      captures,
      groups,
    });
    lastIndex = re.lastIndex;
    match = re.exec(text) as RegExpExecArrayWithIndices | null;
  }
  return results;
}
