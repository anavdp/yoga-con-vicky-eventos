// Apps Script para el formulario de Halloween Yoga
// Hoja: fila 1 con los encabezados  Fecha | Nombre | Email | WhatsApp | Nivel | Fotos

const MI_EMAIL = "tu@email.com"; // ← tu correo, donde te llega el aviso de cada inscripción

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([new Date(), data.nombre, data.email, data.whatsapp, data.nivel, data.fotos]);

  // Aviso para ti
  MailApp.sendEmail({
    to: MI_EMAIL,
    subject: "🎃 Nueva inscripción - Halloween Yoga",
    htmlBody: `
      <h2 style="color:#E8650E;">¡Nueva inscripción! 🎃</h2>
      <p><b>Nombre:</b> ${data.nombre}</p>
      <p><b>Email:</b> ${data.email}</p>
      <p><b>WhatsApp:</b> ${data.whatsapp}</p>
      <p><b>Nivel:</b> ${data.nivel}</p>
      <p><b>Fotos:</b> ${data.fotos}</p>`
  });

  // Confirmación para la persona inscrita
  MailApp.sendEmail({
    to: data.email,
    name: "Vicky De Palma",
    replyTo: MI_EMAIL,
    subject: "🎃 ¡Estás dentro! Halloween Yoga · 30 de octubre",
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#141210;color:#EFE3CF;padding:28px;border-radius:16px;">
        <div style="font-size:44px;text-align:center;">🎃</div>
        <h1 style="color:#FF7A1A;text-align:center;margin:8px 0 18px;">¡Te esperamos, ${data.nombre}!</h1>
        <p>Tu inscripción a la clase especial de <b>Halloween Yoga</b> está confirmada.</p>
        <p>📅 <b>30 de octubre</b><br>🕯️ <b>6:30 PM</b><br>📍 <b>Las Tablas</b></p>
        <p>Trae tu esterilla, ropa cómoda… ¡y disfraz si te atreves! 🧙‍♀️</p>
        <p style="margin-top:24px;font-size:13px;opacity:.75;">Si tienes cualquier duda, responde a este email.<br>@vicky.depalma · @eventieluce</p>
      </div>`
  });

  return ContentService.createTextOutput("OK");
}

// Ejecuta esta función UNA vez desde el editor para autorizar el envío de emails
function autorizarEmail() {
  MailApp.sendEmail(MI_EMAIL, "✅ Test Halloween Yoga", "Si recibes esto, los emails funcionan.");
}
