# Mirada

Comprensions multimodals d’ortogra.fi per treballar amb àudio, documentació i respostes en paper.

- Catàleg amb cerca i filtres per llengua del material, nivell i tipus de document.
- Fitxa, documents i solucionari imprimibles. El QR i l’adreça de la fitxa obren la vista d’escolta.
- Interfície en català i castellà amb tema clar i fosc.

## Desenvolupament

Serveix l’arrel amb qualsevol servidor HTTP estàtic. Per exemple, amb Python, `python -m http.server 8000`. No cal un pas de compilació.

El catàleg i el pilot són a `content/catalogue.json`. La vista docent i l’encaminament són a `app.js`. Els mòduls `catalogue.js`, `worksheet.js`, `listening.js` i `locales.js` mantenen separats el catàleg, els imprimibles, l’escolta i la llengua de la interfície.

Cada entrada té un identificador de llengua i codi, com `ca-M000`, i una versió dels materials. Les variants lingüístiques comparteixen el camp `code` i cadascuna conserva el seu contingut, documents i àudio. El camp `aliases` permet mantenir adreces anteriors.

El panell d’àudio desa els ajustos al navegador i els incorpora a l’enllaç del QR. El camp opcional `audioPrompts` apunta a les locucions inicial i de repetició en la llengua de l’activitat. Les dues locucions del pilot provenen de [Sentit](https://github.com/aaronFortuno/sentit).

El panell d’impressió desa els ajustos per activitat al navegador. Les preguntes visibles són les mateixes a la fitxa i al solucionari i conserven la numeració original.

## Publicació

El desplegament és estàtic des de l’arrel de `main` amb GitHub Pages. El domini personalitzat és `mirada.ortogra.fi`.

La paleta i els patrons d’interfície provenen de [Sentit](https://github.com/aaronFortuno/sentit). El codi es distribueix sota llicència MIT. Els documents de transport són adaptacions amb finalitats didàctiques dels originals acreditats al catàleg i a la pestanya Documents.
