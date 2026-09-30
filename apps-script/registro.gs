/* =========================================================
   APPS SCRIPT COMÚN PARA TODOS LOS EVENTOS
   Se instala UNA sola vez; los eventos nuevos ya no necesitan
   su propio Apps Script.

   Instalación:
   1. Crea una hoja de cálculo nueva en Google Drive (p. ej. "Inscripciones eventos").
   2. Extensiones → Apps Script. Borra lo que haya y pega este archivo.
   3. (Opcional) Para recibir un email con cada inscripción:
      Configuración del proyecto → Propiedades del script → añade
      AVISO_EMAIL = tu correo.
   4. Implementar → Nueva implementación → Tipo "Aplicación web".
      Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
      Autoriza los permisos que pide.
   5. Copia la URL (termina en /exec) y pégala en REGISTRO_URL,
      en assets/form.js. Ya está: sirve para todos los eventos.

   Si cambias este código: Implementar → Gestionar implementaciones →
   editar → Versión nueva. Así la URL no cambia.

   Qué hace con cada inscripción:
   - La apunta en una pestaña con el id del evento (p. ej. "halloween-yoga-2026").
     Si la pestaña no existe la crea, y si llega una pregunta nueva añade la columna.
   - La primera vez que llega un evento lo añade a la pestaña "Resumen":
     escribe tú las plazas en la columna "Plazas" y verás inscritas y plazas libres.
   - Actualiza la pestaña "Contactos": una fila por número de WhatsApp,
     con los eventos a los que se apuntó cada persona.
   ========================================================= */

const RESUMEN = 'Resumen';
const RESUMEN_COLUMNAS = ['Evento', 'Plazas', 'Inscritas', 'Quedan'];
const CONTACTOS = 'Contactos';
const CONTACTOS_COLUMNAS = ['WhatsApp', 'Nombre', 'Eventos', 'Primera inscripción', 'Última inscripción', 'Acepta novedades'];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const evento = String(data.evento || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'sin-evento';
  delete data.evento;
  const ahora = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    guardarInscripcion(evento, data, ahora);
    actualizarContacto(evento, data, ahora);
  } finally {
    lock.releaseLock();
  }

  avisar(evento, data);
  return ContentService.createTextOutput('OK');
}

function guardarInscripcion(evento, data, ahora) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(evento);
  if (!sheet) {
    sheet = ss.insertSheet(evento);
    anadirAlResumen(evento);
  }
  let columnas = sheet.getLastRow() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  if (!columnas.length) {
    columnas = ['Fecha', 'nombre', 'whatsapp'];
    sheet.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // Preguntas nuevas (p. ej. "nivel") se añaden como columna al final
  Object.keys(data).forEach(campo => {
    if (!columnas.includes(campo)) {
      columnas.push(campo);
      sheet.getRange(1, columnas.length).setValue(campo).setFontWeight('bold');
    }
  });
  sheet.appendRow(columnas.map(c => c === 'Fecha' ? ahora : limpiar(data[c])));
}

// Una fila por evento; las plazas las escribes tú, el resto se calcula solo
function anadirAlResumen(evento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RESUMEN);
  if (!sheet) {
    sheet = ss.insertSheet(RESUMEN, 0);
    sheet.getRange(1, 1, 1, RESUMEN_COLUMNAS.length).setValues([RESUMEN_COLUMNAS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const fila = sheet.getLastRow() + 1;
  sheet.getRange(fila, 1, 1, 4).setValues([[
    evento, '', `=MAX(COUNTA('${evento}'!A:A)-1, 0)`, `=IF(B${fila}="", "", B${fila}-C${fila})`
  ]]);
}

function actualizarContacto(evento, data, ahora) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONTACTOS);
  if (!sheet) {
    sheet = ss.insertSheet(CONTACTOS, 0);
    sheet.getRange(1, 1, 1, CONTACTOS_COLUMNAS.length).setValues([CONTACTOS_COLUMNAS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const whatsapp = limpiar(data.whatsapp);
  const numeros = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().map(r => r[0]) : [];
  const i = numeros.indexOf(whatsapp);
  const novedades = data.novedades ? limpiar(data.novedades) : '';

  if (i === -1) {
    sheet.appendRow([whatsapp, limpiar(data.nombre), evento, ahora, ahora, novedades]);
    return;
  }
  const fila = i + 2;
  const actual = sheet.getRange(fila, 1, 1, CONTACTOS_COLUMNAS.length).getValues()[0];
  const eventos = String(actual[2]).split(', ').filter(Boolean);
  if (!eventos.includes(evento)) eventos.push(evento);
  sheet.getRange(fila, 2, 1, 5).setValues([[
    limpiar(data.nombre), eventos.join(', '), actual[3], ahora, novedades || actual[5]
  ]]);
}

function avisar(evento, data) {
  const email = PropertiesService.getScriptProperties().getProperty('AVISO_EMAIL');
  if (!email) return;
  const filas = Object.keys(data).map(k => `<p><b>${k}:</b> ${escapar(data[k])}</p>`).join('');
  MailApp.sendEmail({ to: email, subject: `Nueva inscripción · ${evento}`, htmlBody: `<h2>¡Nueva inscripción!</h2>${filas}` });
}

// Evita que un texto que empieza por = + - @ se interprete como fórmula
function limpiar(valor) {
  const s = String(valor == null ? '' : valor).trim().slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function escapar(valor) {
  return String(valor).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Ejecuta esta función una vez desde el editor para probar sin formulario
function prueba() {
  doPost({ postData: { contents: JSON.stringify({
    evento: 'prueba', nombre: 'Persona de prueba', whatsapp: '34 600000000', fotos: 'Sí'
  }) } });
}
