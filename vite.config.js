import { defineConfig } from 'vite';

// CSS·스크립트와 사진까지 한 문서에 넣어 file://에서도 바로 실행합니다.
function standaloneHtml() {
  return {
    name: 'standalone-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (!html || html.type !== 'asset') throw new Error('index.html 빌드 결과를 찾을 수 없습니다.');
      let output = String(html.source);
      let scripts = 0;
      let styles = 0;
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === 'chunk') {
          const code = item.code.replaceAll('import.meta.url', 'document.baseURI').replace(/<\/script/gi, '<\\/script');
          const tag = new RegExp(`<script[^>]*src="(?:\\./)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*><\\/script>`);
          if (tag.test(output)) { output = output.replace(tag, '').replace('</body>', () => `<script>${code}</script></body>`); scripts++; delete bundle[name]; }
        } else if (name.endsWith('.css')) {
          const css = String(item.source).replace(/<\/style/gi, '<\\/style');
          const tag = new RegExp(`<link[^>]*href="(?:\\./)?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
          if (tag.test(output)) { output = output.replace(tag, () => `<style>${css}</style>`); styles++; delete bundle[name]; }
        }
      }
      if (scripts !== 1 || styles !== 1) throw new Error(`단일 파일 생성 실패: 스크립트 ${scripts}개, 스타일 ${styles}개`);
      html.source = output;
    }
  };
}
export default defineConfig({
  base: './', publicDir: false,
  build: { modulePreload: { polyfill: false }, target: 'es2020' },
  plugins: [standaloneHtml()],
  server: { allowedHosts: ['.e2b.app'] }, preview: { allowedHosts: ['.e2b.app'] }
});
