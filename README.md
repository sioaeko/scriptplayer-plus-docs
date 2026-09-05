# ScriptPlayer+ Documentation

User documentation for ScriptPlayer+ in Korean, English, Japanese and Simplified Chinese.

Website: https://sioaeko.github.io/scriptplayer-plus-docs/

Application downloads and issues: https://github.com/sioaeko/scriptplayer-plus

## Local preview

Run `python -m http.server 8765` and open http://localhost:8765.

## Translations

The Korean source is `index.html`. Translation maps are in `tools/lang/`.
Install Beautiful Soup with `python -m pip install beautifulsoup4`, then run:

```sh
python tools/i18n.py extract
python tools/i18n.py build en ja zh
python tools/i18n.py status
```

`tools/lang/indexed-segments.json` preserves the original segment ordering used by the legacy `.idx` translations. Keep it unchanged. Add new translations as text-keyed JSON maps.

GitHub Pages serves the `main` branch root. Commit regenerated language pages with source edits.

## Rights

ScriptPlayer+ screenshots and videos are copyrighted. Reuse requires permission from the copyright holder. See the documentation's license and attribution page for third-party notices.
