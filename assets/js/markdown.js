function parseSimpleMarkdown(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<h\d|<li|<\/p>)(.+)$/gim, '<p>$1</p>')
    .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
}
