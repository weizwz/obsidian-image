import type { TranslationSchema } from '../types';

const en: TranslationSchema = {
  commands: {
    processAllInNote: 'Batch process images in current note',
    processSingleUnderCursor: 'Process image on current line',
  },
  notices: {
    processedImage: (name) => `Processed image: ${name}`,
    failedProcessImage: (name) => `Failed to process image: ${name}`,
    processedRemoteImage: (name) => `Processed remote image: ${name}`,
    failedDownloadRemote: (url) => `Failed to download remote image: ${url}`,
    processedCountInNote: (count) => `Processed ${count} image(s) in current note.`,
    noImageOnLine: 'No image found on the current line.',
    noActiveMarkdownNote: 'No active Markdown note is currently open.',
    noReferencedImages: 'No local images referenced by notes were found.',
    batchCompleted: (processed, skipped, failed, savedText) =>
      `Batch complete: ${processed} processed, ${skipped} skipped${failed > 0 ? `, ${failed} failed` : ''}${savedText ? `, saved ${savedText}` : ''}.`,
    batchCancelled: (processed, skipped) =>
      `Batch safely stopped: ${processed} processed, ${skipped} skipped (all processed links are synced).`,
    recoveryNoPending: 'Check complete: no interrupted batch transactions found.',
    recoveryRepaired: (oldPath) => `Repaired interrupted transaction and restored: ${oldPath}`,
  },
  modals: {
    confirmTitle: 'Confirm batch image processing',
    scopeCurrentNote: (noteName) => `Scope: Current note "${noteName}"`,
    scopeAllVault: (noteCount) => `Scope: All vault (${noteCount} notes with images)`,
    imageCountLabel: (count) =>
      `Referenced images: ${count} (unreferenced images are automatically ignored)`,
    modeLabel: (modeText) => `Operation mode: ${modeText}`,
    ruleHintRename: (folderTpl, nameTpl) =>
      `Naming & folder rules (from Paste and drop): folder "${folderTpl || '/'}", filename "${nameTpl}"`,
    ruleHintCompress: (format, quality, maxW, maxH) =>
      `Compression rules (from Compression and conversion): format "${format}", quality ${quality}, max ${maxW || 'unlimited'}×${maxH || 'unlimited'}`,
    warningHint:
      'Please do not close Obsidian or edit affected notes while processing. Note links will be updated per image, and replaced originals will be moved to .trash for recovery.',
    confirmStartBtn: 'Start processing',
    confirmCancelBtn: 'Cancel',
    progressTitle: 'Batch processing images...',
    progressWarning:
      'Processing images and updating note links. Do not close the window or edit affected notes.',
    progressStatus: (current, total, fileName) => `Processing (${current} / ${total}): ${fileName}`,
    safeStopBtn: 'Safe stop',
    stoppingBtn: 'Finishing current image and stopping...',
  },
  settings: {
    language: {
      heading: 'Language',
      name: 'Display language',
      desc: 'Follow Obsidian language or choose a specific language.',
      options: {
        auto: 'Follow system (Obsidian)',
        en: 'English',
        zh: '简体中文',
      },
    },
    paste: {
      heading: 'Paste and drop',
      enableName: 'Enable silent paste and drop processing',
      enableDesc: 'Automatically process and organize pasted or dropped images.',
      targetFolderName: 'Target folder template',
      targetFolderDesc:
        'Variables: ${noteName}, ${noteFolder}, ${date:YYYY-MM-DD}, ${year}, ${month}, ${day}.',
      filenameTemplateName: 'Filename template',
      filenameTemplateDesc:
        'Variables: ${noteName}, ${originalName}, ${timestamp}, ${date:YYYYMMDDHHmmss}, ${hash:8}.',
    },
    compression: {
      heading: 'Compression and conversion',
      enableName: 'Enable compression and conversion',
      enableDesc: 'Compress or convert images using hardware acceleration.',
      targetFormatName: 'Target format',
      targetFormatDesc: 'Output image format. Animated GIF and SVG are skipped.',
      formatOptions: {
        original: 'Original',
        webp: 'Webp',
        jpeg: 'JPEG',
        png: 'PNG',
      },
      qualityName: 'Quality',
      qualityDesc: 'Compression quality from 1 to 100.',
      maxWidthName: 'Max width',
      maxWidthDesc: 'Maximum width in pixels (0 for unlimited).',
      maxHeightName: 'Max height',
      maxHeightDesc: 'Maximum height in pixels (0 for unlimited).',
      skipLargerName: 'Skip larger output',
      skipLargerDesc: 'Keep original image if the processed output is larger.',
    },
    batch: {
      heading: 'Batch processing',
      modeName: 'Batch operation mode',
      modeDesc:
        'Select what to process. Folder and naming rules follow paste and drop settings; format and compression rules follow compression settings.',
      modeOptions: {
        'rename-and-move': 'Rename and move images',
        'compress-and-convert': 'Convert format and compress',
        both: 'Both rename/move and compress/convert',
      },
      currentNoteName: 'Batch process images in current note',
      currentNoteDesc: (activeNoteName) =>
        activeNoteName
          ? `Process local images referenced in active note "${activeNoteName}" and update its links.`
          : 'No active Markdown note is open. Open a note in the editor first.',
      currentNoteBtn: 'Process current note',
      allVaultName: 'Batch process images in all vault notes',
      allVaultDesc:
        'Scan all Markdown notes in the vault, batch process referenced local images, and update links. Replaced originals are moved to .trash.',
      allVaultBtn: 'Process vault images',
      recoveryName: 'Interrupted task check and recovery',
      recoveryDesc: (hasPending) =>
        hasPending
          ? 'An interrupted batch image transaction was detected. Click to repair and restore.'
          : 'Verify and repair any incomplete image transactions caused by unexpected shutdowns.',
      recoveryBtn: 'Verify and repair',
      statsSummary: (referencedImages, referencedNotes, unreferencedImages, sizeMB) =>
        `Referenced images: ${referencedImages} (in ${referencedNotes} notes) · Unreferenced (skipped): ${unreferencedImages} · Total size: ${sizeMB} MB`,
    },
    remote: {
      heading: 'Remote images',
      enableName: 'Enable remote image download',
      enableDesc: 'Download remote images when pasting or running commands.',
      replaceLinkName: 'Replace remote link',
      replaceLinkDesc: 'Replace remote links with local vault links after download.',
    },
  },
};

export default en;
