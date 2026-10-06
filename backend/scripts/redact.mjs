/** Redact before writing logs, even for local Supabase. No environment file reader. */
export function redact(value) {
  return String(value)
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED JWT]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+\b/g, '[REDACTED KEY]')
    .replace(/\b(?:sk-(?:ant-)?|sbp_)[A-Za-z0-9_-]{8,}\b/g, '[REDACTED KEY]')
    .replace(/(postgres(?:ql)?:\/\/[^\s:@/]+:)[^\s@]+(@)/gi, '$1[REDACTED]$2')
    .replace(/([^\n]*(?:\b(?:anon(?:_key)?|service[_ -]?role(?:_key)?|publishable(?:_key)?|secret(?:_key)?|access[_ -]?token|password|authorization|jwt[_ -]?secret|api[_ -]?key)\b)[^\n]*[=:│|][^\n]*)/gi, '[REDACTED SENSITIVE LINE]');
}
