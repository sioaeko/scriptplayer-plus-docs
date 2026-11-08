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

## Release history links from the app

The app's **Settings → About → Release history** button opens the release history page at the installed version:

```
https://sioaeko.github.io/scriptplayer-plus-docs/#v0.7.0
https://sioaeko.github.io/scriptplayer-plus-docs/en/#v0.7.1-beta.1
```

Use the language folder that matches the app locale (`en/`, `ja/`, `zh/`, or the root for Korean). Each release heading on the release history page lists the versions it covers in `data-version`. A token also covers its patch and pre-release versions, so `0.4` matches 0.4.2 and `0.6.0 0.6.1` covers a hotfix. The newest release heading gets a "Latest" badge automatically. A version with no matching section opens the top of the page with a GitHub Releases link. When a release ships, add its heading with a `data-version` value.

## Rights

ScriptPlayer+ screenshots and videos are copyrighted. Reuse requires permission from the copyright holder. See the documentation's license and attribution page for third-party notices.
