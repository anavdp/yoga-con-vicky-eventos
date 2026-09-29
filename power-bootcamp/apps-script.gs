/**
 * Apps Script para las inscripciones del Power Bootcamp (18 de octubre).
 *
 * Cómo usarlo:
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ej. "Power Bootcamp · Inscripciones").
 * 2. En la hoja: Extensiones → Apps Script. Borra lo que haya y pega este archivo entero.
 * 3. Guarda y ejecuta una vez la función "setup" (acepta los permisos): crea los encabezados.
 * 4. Implementar → Nueva implementación → Tipo "Aplicación web".
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 5. Copia la URL que termina en /exec y pégala en SHEETS_URL de power-bootcamp/index.html.
 */

const HEADERS = ['Fecha de inscripción', 'Nombre', 'WhatsApp', 'Fotos', 'Pagado'];

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#13345A')
    .setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 150);
  // WhatsApp como texto para que no se pierdan los dígitos ni se convierta en número
  sheet.getRange('C:C').setNumberFormat('@');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      String(data.nombre || '').trim(),
      String(data.whatsapp || '').trim(),
      String(data.fotos || '')
    ]);
    // Casilla en "Pagado" para marcar a mano cuando llegue el pago
    sheet.getRange(sheet.getLastRow(), 5).insertCheckboxes();
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
