#!/usr/bin/env bash
# OCR a Hindi PDF -> text draft.  Usage: scripts/import/ocr-pdf.sh path/to/file.pdf out.txt
# Needs: poppler-utils (pdftoppm), tesseract-ocr, and the Hindi model:
#   curl -L -o hin.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/hin.traineddata  (put it in $TESSDATA_PREFIX)
# Why OCR and not pdftotext: these PDFs use legacy font encoding, so pdftotext returns scrambled Hindi ("गगरिजासव ु न" for "गिरिजासुत").
set -e; pdf="$1"; out="$2"; tmp=$(mktemp -d); pdftoppm -r 300 -png "$pdf" "$tmp/p"; : > "$out"
for img in $(ls "$tmp"/p-*.png | sort -V); do tesseract "$img" stdout -l hin --psm 6 2>/dev/null >> "$out"; echo >> "$out"; done; rm -rf "$tmp"
