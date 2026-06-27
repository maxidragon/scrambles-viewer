import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { ScrambleSet } from '../types/wcif';

const PDF_DIR = FileSystem.documentDirectory + 'scramble_pdfs/';

export async function pickAndExtractZip(
  sets: ScrambleSet[],
): Promise<{ sets: ScrambleSet[]; matched: number; total: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return { sets, matched: 0, total: 0 };

  const file = result.assets[0];
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });

  await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });

  const updated = sets.map(s => ({ ...s }));

  const pdfEntries = Object.entries(zip.files).filter(
    ([name, entry]) => !entry.dir && name.toLowerCase().endsWith('.pdf'),
  );

  let matched = 0;

  await Promise.all(
    pdfEntries.map(async ([filename, entry]) => {
      const basename = filename.split('/').pop()!;
      const idx = matchSet(basename, sets);
      if (idx === -1) return;

      const pdfBase64 = await entry.async('base64');
      const safeName = basename.replace(/[^\w.\-]/g, '_');
      const localPath = PDF_DIR + safeName;

      await FileSystem.writeAsStringAsync(localPath, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      updated[idx] = { ...updated[idx], pdfPath: localPath };
      matched++;
    }),
  );

  return { sets: updated, matched, total: pdfEntries.length };
}

function matchSet(filename: string, sets: ScrambleSet[]): number {
  const nameNoExt = filename.replace(/\.pdf$/i, '');

  const setLetterM = /\bSet\s+([A-Z])\b/i.exec(nameNoExt);
  if (!setLetterM) return -1;
  const letter = setLetterM[1].toUpperCase();

  const roundM = /\bRound\s+(\d+)\b/i.exec(nameNoExt);
  if (!roundM) return -1;
  const roundNum = roundM[1];

  const lowerName = nameNoExt.toLowerCase();

  return sets.findIndex(s => {
    if (s.setLetter !== letter) return false;
    const codeM = /-r(\d+)$/.exec(s.activityCode);
    if (codeM?.[1] !== roundNum) return false;
    const eventPart = s.name.split(' Round ')[0].toLowerCase();
    return lowerName.includes(eventPart);
  });
}

export async function clearPdfs(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PDF_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(PDF_DIR, { idempotent: true });
  }
}
