import { defineConfig } from 'vite';

// Vite의 단일 번들을 일반 스크립트로 불러와 file://에서도 앱이 시작되도록 합니다.
function standaloneHtml() {
  return {
    name: 'standalone-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = bundle['index.html'];
      if (html && html.type === 'asset') {
        html.source = String(html.source).replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>').replace(' crossorigin href=', ' href=');
      }
      // MapLibre의 worker URL은 앱에서 Blob으로 지정합니다. 일반 스크립트에서
      // 문법 오류가 되는 import.meta 참조는 문서 기준 URL로 치환합니다.
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk') item.code = item.code.replaceAll('import.meta.url', 'document.baseURI');
      }
    }
  };
}
export default defineConfig({ base: './', build: { modulePreload: { polyfill: false }, target: 'es2020' }, plugins: [standaloneHtml()], server: { allowedHosts: ['.e2b.app'] }, preview: { allowedHosts: ['.e2b.app'] } });
