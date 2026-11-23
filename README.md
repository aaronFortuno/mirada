# Mirada

Comprensions multimodals d’ortogra.fi per treballar amb àudio, documentació i respostes en paper.

- Catàleg amb cerca i filtres per llengua del material, nivell i tipus de document.
- Fitxa, documents i solucionari imprimibles. El QR i l’adreça de la fitxa obren la vista d’escolta.
- Interfície en català i castellà amb tema clar i fosc.

## Desenvolupament

Serveix l’arrel amb qualsevol servidor HTTP estàtic. Per exemple, amb Python, `python -m http.server 8000`. No cal un pas de compilació.

El catàleg i el pilot són a `content/catalogue.json`. La vista docent i l’encaminament són a `app.js`. Els mòduls `catalogue.js`, `worksheet.js`, `listening.js` i `locales.js` mantenen separats el catàleg, els imprimibles, l’escolta i la llengua de la interfície.

Cada entrada té un identificador i una versió. Conserva la versió dels materials impresos quan s’hi afegeixi l’àudio corresponent, amb el camp `audio` i un camí al fitxer. L’enllaç d’escolta combina l’identificador i la versió.

## Publicació

El desplegament és estàtic des de l’arrel de `main` amb GitHub Pages. El domini personalitzat és `mirada.ortogra.fi`.

La paleta i els patrons d’interfície provenen de [Sentit](https://github.com/aaronFortuno/sentit). El codi es distribueix sota llicència MIT. Els documents de transport són adaptacions amb finalitats didàctiques dels originals acreditats al catàleg i a la pestanya Documents.
