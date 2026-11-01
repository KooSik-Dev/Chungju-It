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
      // Small standalone entry points keep deep links reloadable on static hosts
      // without duplicating the large inlined application in every directory.
      const bootstrap = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>충주잇다</title></head><body><p>충주잇다를 불러오는 중입니다.</p><noscript>JavaScript를 켜 주세요.</noscript><script>fetch('../index.html').then(function(r){if(!r.ok)throw Error('load');return r.text()}).then(function(html){document.open();document.write(html);document.close()}).catch(function(){document.body.innerHTML='<p>화면을 불러오지 못했습니다. <a href="../index.html">홈으로 돌아가기</a></p>'})<\/script></body></html>`;
      for(const route of ['main','ranking','status','research','guide','activity','admin']) {
        const fileName = `${route}/index.html`;
        bundle[fileName] = {type:'asset',fileName,source:bootstrap};
      }
    }
  };
}
export default defineConfig({
  base: './', publicDir: false,
  build: { modulePreload: { polyfill: false }, target: 'es2020' },
  plugins: [standaloneHtml()],
  server: { allowedHosts: ['.e2b.app'] }, preview: { allowedHosts: ['.e2b.app'] }
});
