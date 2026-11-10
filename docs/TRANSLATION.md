# Translating Crew Call

Crew Call is written in British English and can be shown in Traditional Chinese, Simplified Chinese, French, Spanish, Russian, Arabic, Hindi and Portuguese (Brazilian). People pick a language from the globe button in the top bar. Anything people type themselves (titles, loglines, bios, messages) stays as written.

The translations were drafted, not checked by a native speaker. Before telling students a language is ready, ask someone who speaks it and knows film sets to go through it using the checklist below. The language menu tells people this too: "Translations are checked by students who speak each language. Spot a wrong film term? Tell an admin."

## How to translate

- **Translate how a film crew talks, not word for word.** "Call" is the time crew arrive, not a phone call. "Wrap" is the end of the shoot day. "Shadow" means learning on set by following someone. "Reel" is a showreel. Use the word a crew in that language would actually say on set, even if it's an English loanword.
- **Role names follow industry usage in that language.** Use the department-style name rather than a literal one. Keep them gender-neutral where the language allows (for example, the job title rather than "cameraman").
- **Some terms stay in English** because crews everywhere use them: DIT, BTS, VFX, and often Runner. Brand and product names (Sony FX3, Aputure, Supabase, GitHub) never change.
- **Keep it short.** Buttons and tabs have little room. If a translation is much longer than the English, look for a shorter phrase.
- **Same thing, same word.** Use the glossary below so a term reads the same on every page.
- **Arabic is right to left.** Crew Call flips the layout automatically. The timeline and map stay left to right because time and geography read that way. Names and English titles inside Arabic text are fine; the app keeps their punctuation in the right place.

## Glossary

| English | 繁體中文 | Français | Español | Русский | العربية |
|---|---|---|---|---|---|
| Shoot | 拍攝 | Tournages | Rodajes | Съёмки | التصوير |
| Crew | 劇組人員 | Équipe | Equipo | Группа | الطاقم |
| Call (time) | 集合 | Convocation | Citación | Сбор | موعد الحضور |
| Wrap | 收工 | Fin | Fin | Конец смены | انتهاء التصوير |
| Shadow | 見習 | Observation | Observación | Стажировка | المرافقة للتعلّم |
| Reel | 作品集 | Bande démo | Reel | Шоурил | ريل الأعمال |
| Logline | 故事簡介 | Pitch en une phrase | Sinopsis breve | Логлайн | الملخص (لوغلاين) |
| Call sheet | 通告單 | Feuille de service | Orden de rodaje | Вызывной лист | ورقة الاستدعاء |
| Credits | 作品經歷 | Crédits | Créditos | Титры | الأعمال السابقة |
| Term | 學期 | Trimestre | Trimestre | Семестр | الفصل |
| Cohort | 班級 | Promo | Promoción | Поток | الدفعة |
| DoP | 攝影指導 | Chef opérateur | Dirección de fotografía | Оператор-постановщик | مدير التصوير |
| Gaffer | 燈光指導 | Chef électricien | Jefe de eléctricos | Гаффер (бригадир осветителей) | رئيس الإضاءة (غافر) |
| Rep | 代表 | Délégué | Delegado | Староста | ممثل الدفعة |

Check the live wording in the files below; if a term changes, change it everywhere.

## Checklist for a native speaker

1. Switch Crew Call to your language and click through every page: Calendar, Develop, Shoot (cards, table, timeline, map), Release, Paid, Crew, My shoots, My profile, and Admin if you can.
2. Open a shoot, post a shoot, request a role, and open the newsletter and digest previews.
3. Note anything that sounds translated rather than written: wrong film terms, odd role names, text that's too formal or too casual, wrong plurals ("1 days"), wrong dates.
4. For Arabic, check that pages read right to left, numbers and times look right, and nothing overlaps.
5. Send the list to an admin, or fix it yourself as below.

## How to edit translations

The translations are plain text files in `tools/i18n/`. You don't need to know how to code to edit them, only to keep the `||` separators.

- `tools/i18n/words*.txt`: `English || 繁體中文 || Français || Español`. Simplified Chinese is made from Traditional automatically.
- `tools/i18n/ru-ar/words*.txt`: `English || Русский || العربية`. If a line is missing, that text shows in English.
- `tools/i18n/hi-pt/words*.txt`: `English || हिन्दी || Português`. Hindi uses the English loanwords Indian crews use on set (डायरेक्टर, DoP, गैफ़र). Portuguese is Brazilian; for Portugal, a speaker would change words like "equipe" to "equipa".
- `patterns.txt` in each folder holds sentences with names, numbers or dates. The English side is a pattern: leave it alone and only change the translations. `{=1}` is a name or number as written, `{1}` is translated, and `{1|…|…}` picks a plural form (English, French, Spanish, Hindi, Portuguese: one|many; Russian: one|few|many; Arabic: one|two|few|many|other).

On GitHub, open the file, press the pencil to edit, make the change and commit it. Then someone with Python runs `pip install opencc` and `python3 tools/build_i18n.py`, which rebuilds `i18n-dict.js`. Vercel redeploys on its own.

## Fixing translations in the app

Most fixes don't need GitHub at all.

- **Members:** the **Wrong word?** button in the corner of every page (shown in every language except English) lets them tap the words that look wrong; the suggestion records which page and section it came from. "Suggest a better translation" in the language menu does the same without pointing. Admins see it in Admin, Languages, Suggestions, and press Use or Dismiss. The member is thanked when it's used.
- **New roles:** when an admin adds a crew role, Crew Call looks it up on Wikidata and offers the names in every language. Admin, Languages, Role names lists roles still missing a translation, with Look up next to each. Pick the right meaning, edit the words if crews say it differently, and save.
- **Keeping the fixes:** fixes saved in the app work straight away. To make them permanent in the code, press Download in Admin, Languages, Added in the app, and put the file in `tools/i18n/locales/app-additions.json`. The next build folds it in.

## Weblate files

Each build also writes `tools/i18n/locales/en.json` (the base) and one file per language (`zh-Hant.json`, `fr.json`, `es.json`, `ru.json`, `ar.json`, `hi.json`, `pt.json`). Each is a simple list of English text and its translation, which Weblate reads as "JSON file".

To set up Weblate: add a component from the GitHub repository, file format "JSON file", file mask `tools/i18n/locales/*.json`, base file `tools/i18n/locales/en.json`, and leave out `.last-build.json`. When Weblate commits changes, run `python3 tools/build_i18n.py`. It spots what changed since the last build, writes it into the text files (which stay the master copy) and rebuilds `i18n-dict.js`. If the same line was changed in both places, Weblate's version wins.

## Adding another language

Common next choices for LFS students are Italian, German, Japanese, Korean, Turkish and Polish. Adding one means a new column of translations, a line in the language list at the top of `i18n.js` and a native-speaker check using the list above. Month and weekday names, plurals, lists and "3 days ago" come from CLDR automatically.

To get a first draft, run a free LibreTranslate server (`pip install libretranslate`, then `libretranslate --load-only en,it`) and `python3 tools/i18n/draft_language.py --lang it --server http://localhost:5000`. It writes `tools/i18n/drafts/words-it.txt`, with crew roles marked CHECK. A speaker goes through it before it's used. Admins can also put a LibreTranslate address in Admin, Languages to draft missing role names.

## Open-source help

You don't need to pay for anything to keep translations good.

- **Unicode CLDR** ([cldr.unicode.org](https://cldr.unicode.org/)) is the open database of month names, weekdays and date formats for every language. Browsers include it, and Crew Call reads it through `Intl` for dates, language names, plural rules, lists ("A, B and C") and relative times ("yesterday", "in 2 weeks"). Nothing to edit.
- **Wikidata** ([wikidata.org](https://www.wikidata.org/), CC0) has film role names in many languages. Run `python3 tools/i18n/wikidata_roles.py` to make `tools/i18n/wikidata-roles.md`, a side-by-side of our wording and Wikidata's. The app also looks roles up on Wikidata live (Admin, Languages). Use it as a check, not a rule: Wikidata calls a 1st AD "второй режиссёр" in Russian, which is what Russian crews say, while Crew Call currently uses a more literal term. Ask a Russian-speaking student which to use.
- **OpenCC** ([github.com/BYVoid/OpenCC](https://github.com/BYVoid/OpenCC), Apache-2.0) turns Traditional Chinese into Simplified during the build.
- **Weblate** ([weblate.org](https://weblate.org/en/hosting/)) is an open-source translation website where volunteers can fix wording in a browser, with no files or code. Hosting is free for libre projects, which means the GitHub repository must be public and have an open-source licence. Crew Call has no licence yet. If the owner is happy to make the code public (it has no passwords in it), add an MIT licence and apply for the free plan. Otherwise, keep editing the text files.
- **LibreTranslate** ([github.com/LibreTranslate/LibreTranslate](https://github.com/LibreTranslate/LibreTranslate), open source, can be self-hosted) can draft a new language. Machine drafts get film terms wrong, so always have a native speaker check before switching a language on.
