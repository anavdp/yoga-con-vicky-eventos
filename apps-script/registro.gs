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
      Y para que el botón de WhatsApp del email incluya tu Bizum,
      añade también BIZUM = tu número (un evento puede poner otro en su formulario).
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
   - Si hay AVISO_EMAIL, te manda un email con los datos y un botón que abre
     WhatsApp con esa persona y el mensaje del pago ya escrito (fecha, hora,
     lugar, precio, Bizum o efectivo). Esos datos los manda cada formulario.
   ========================================================= */

const RESUMEN = 'Resumen';
const RESUMEN_COLUMNAS = ['Evento', 'Plazas', 'Inscritas', 'Quedan'];
const CONTACTOS = 'Contactos';
const CONTACTOS_COLUMNAS = ['WhatsApp', 'Nombre', 'Eventos', 'Primera inscripción', 'Última inscripción', 'Acepta novedades'];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const evento = String(data.evento || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'sin-evento';
  const aviso = data.aviso || {};   // datos del evento para el email; no se guardan en la hoja
  delete data.evento;
  delete data.aviso;
  const ahora = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    guardarInscripcion(evento, data, ahora);
    actualizarContacto(evento, data, ahora);
  } finally {
    lock.releaseLock();
  }

  avisar(evento, data, aviso);
  return ContentService.createTextOutput('OK');
}

function guardarInscripcion(evento, data, ahora) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(evento);
  if (!sheet) sheet = ss.insertSheet(evento);
  actualizarResumen(evento);
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

// Una fila por evento; las plazas las escribes tú, el resto se calcula solo.
// Las fórmulas se vuelven a escribir con cada inscripción, así se arreglan solas.
// setFormulas usa siempre la sintaxis en inglés (con comas), sea cual sea el idioma de la hoja.
function actualizarResumen(evento) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RESUMEN);
  if (!sheet) {
    sheet = ss.insertSheet(RESUMEN, 0);
    sheet.getRange(1, 1, 1, RESUMEN_COLUMNAS.length).setValues([RESUMEN_COLUMNAS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  const eventos = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues().map(r => r[0]) : [];
  let fila = eventos.indexOf(evento) + 2;
  if (fila === 1) {
    fila = sheet.getLastRow() + 1;
    sheet.getRange(fila, 1).setValue(evento);
  }
  sheet.getRange(fila, 3, 1, 2).setFormulas([[
    `=COUNTA('${evento}'!A2:A)`, `=IF(B${fila}="", "", B${fila}-C${fila})`
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

function avisar(evento, data, aviso) {
  const propiedades = PropertiesService.getScriptProperties();
  const email = propiedades.getProperty('AVISO_EMAIL');
  if (!email) return;
  const titulo = limpiar(aviso.nombre) || evento;
  const filas = Object.keys(data).map(k => `<p><b>${k}:</b> ${escapar(data[k])}</p>`).join('');
  const boton = botonPago(data, aviso, propiedades.getProperty('BIZUM'));
  MailApp.sendEmail({
    to: email,
    subject: `Nueva inscripción · ${titulo}`,
    htmlBody: `<h2>¡Nueva inscripción!</h2>${filas}${boton}`
  });
}

// Botón que abre WhatsApp con esa persona y el mensaje del pago ya escrito
function botonPago(data, aviso, bizumPorDefecto) {
  const numero = String(data.whatsapp || '').replace(/\D/g, '');   // "34 612345678" -> "34612345678"
  if (!numero) return '';
  const nombre = String(data.nombre || '').trim().split(/\s+/)[0];
  const texto = (v) => String(v == null ? '' : v).trim().slice(0, 200);
  const evento = texto(aviso.nombre) || 'el evento';
  const cuando = fechaBonita(texto(aviso.inicio));
  const lugar = texto(aviso.lugar);
  const precio = texto(aviso.precio);
  const bizum = texto(aviso.bizum) || texto(bizumPorDefecto);

  let mensaje = `Hola ${nombre}, ¡gracias por apuntarte a ${evento}! 💜\n\n`;
  if (cuando) mensaje += `📅 ${cuando}\n`;
  if (lugar) mensaje += `📍 ${lugar}: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar)}\n`;
  if (cuando || lugar) mensaje += '\n';
  if (bizum) {
    mensaje += `Para confirmar tu plaza${precio ? ` (${precio})` : ''} puedes hacerme un Bizum al ${bizum} con tu nombre en el concepto, ` +
      'o si lo prefieres pagar en efectivo el mismo día. ¿Cómo te viene mejor?';
  } else {
    mensaje += `Para confirmar tu plaza${precio ? ` (${precio})` : ''}, ¿prefieres pagar por Bizum o en efectivo el mismo día?`;
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  return `<p style="margin-top:24px;"><a href="${url.replace(/&/g, '&amp;')}" style="display:inline-block;padding:12px 18px;` +
    'border-radius:100px;background:#25D366;color:#FFFFFF;font-weight:bold;text-decoration:none;">' +
    '💬 Escribir por WhatsApp para el pago</a></p>';
}

// "2026-10-30 18:30" -> "Viernes 30 de octubre · 18:30"
function fechaBonita(inicio) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}:\d{2}))?/.exec(inicio);
  if (!m) return inicio;
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dia = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return `${dias[dia]} ${+m[3]} de ${meses[+m[2] - 1]}` + (m[4] ? ` · ${m[4]}` : '');
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
    evento: 'prueba', nombre: 'Persona de prueba', whatsapp: '34 600000000', fotos: 'Sí',
    aviso: { nombre: 'Evento de prueba', inicio: '2026-10-30 18:30', lugar: 'Calle de Puente la Reina, 27, Madrid', precio: '20 €' }
  }) } });
}
