import Prism from 'prismjs';

import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';

/** Snippet / code-review languages supported by the app */
export const SNIPPET_LANGUAGES = ['python', 'java', 'javascript', 'c++', 'go'];

const PRISM_LANG = {
  python: 'python',
  java: 'java',
  javascript: 'javascript',
  'c++': 'cpp',
  cpp: 'cpp',
  c: 'cpp',
  go: 'go',
};

export function toPrismLanguage(language) {
  const key = (language || 'javascript').toLowerCase();
  return PRISM_LANG[key] || 'javascript';
}

export function highlightCode(code, language) {
  const lang = toPrismLanguage(language);
  const grammar = Prism.languages[lang];
  if (!grammar) return code;
  return Prism.highlight(code ?? '', grammar, lang);
}
