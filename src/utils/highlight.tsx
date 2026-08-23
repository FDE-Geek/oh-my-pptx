import type { ReactNode } from 'react'

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'class', 'extends', 'import', 'from', 'export', 'default', 'new', 'await',
  'async', 'try', 'catch', 'finally', 'throw', 'typeof', 'interface', 'type',
  'enum', 'implements', 'public', 'private', 'readonly', 'static', 'def',
  'elif', 'lambda', 'None', 'True', 'False', 'null', 'undefined', 'true',
  'false', 'this', 'super', 'switch', 'case', 'break', 'continue', 'in', 'of',
  'echo', 'export', 'local', 'do', 'done', 'then', 'fi',
])

interface Token {
  text: string
  kind: 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'func' | 'tag'
}

const TOKEN_RE =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+|.)/g

function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  const re = new RegExp(TOKEN_RE)
  let match: RegExpExecArray | null
  let lastKind: Token['kind'] = 'plain'
  let lastText = ''

  const push = (text: string, kind: Token['kind']) => {
    if (kind === lastKind) {
      lastText += text
      return
    }
    if (lastText) tokens.push({ text: lastText, kind: lastKind })
    lastKind = kind
    lastText = text
  }

  while ((match = re.exec(code)) !== null) {
    const [full, comment, str, num, word] = match
    if (comment) push(full, 'comment')
    else if (str) push(full, 'string')
    else if (num) push(full, 'number')
    else if (word) {
      const after = code[re.lastIndex]
      if (KEYWORDS.has(word)) push(full, 'keyword')
      else if (after === '(') push(full, 'func')
      else push(full, 'plain')
    } else push(full, 'plain')
  }
  if (lastText) tokens.push({ text: lastText, kind: lastKind })
  return tokens
}

const CLASS: Record<Token['kind'], string> = {
  plain: '',
  comment: 'text-sfg italic',
  string: 'text-[#98c379]',
  keyword: 'text-[#c678dd]',
  number: 'text-[#d19a66]',
  func: 'text-[#61b0f1]',
  tag: 'text-[#e06c75]',
}

export function highlight(code: string): ReactNode[] {
  return tokenize(code).map((token, i) => (
    <span key={i} className={CLASS[token.kind]}>
      {token.text}
    </span>
  ))
}
