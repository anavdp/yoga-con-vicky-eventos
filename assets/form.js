/* =========================================================
   LÓGICA COMÚN DE LOS FORMULARIOS DE INSCRIPCIÓN
   Cada evento define antes de cargar este archivo:

   const EVENTO = {
     id: "power-bootcamp-2026",        // pestaña en la hoja común y UID del calendario
     nombre: "Power Bootcamp",          // título al compartir
     archivo: "power-bootcamp",         // nombre del .ics
     calendario: {
       titulo: "Power Bootcamp 🥊 Edición otoño",
       inicio: "2026-10-18 11:00",      // hora de Madrid, el cambio de hora se calcula solo
       fin: "2026-10-18 13:00",
       lugar: "Casita del Pescador, Parque del Retiro, Madrid",
       descripcion: "…"
     },
     compartir: "🥊 ¡Me apunté al Power Bootcamp! … Apúntate aquí:",
     hojaUrl: "https://script.google.com/…/exec"  // opcional: solo eventos con Apps Script propio
   };

   Y en el HTML usa estos ids: f-form, f-nombre, f-country, f-whatsapp,
   f-whatsapp-error, f-error, f-btn, f-btn-text, f-spinner, f-success,
   cal-wrap, f-share. Cada pregunta con botones es un
   <div class="radio-group" data-campo="fotos" data-falta="mensaje si falta">
   con radios name="fotos"; se envía como { fotos: valor }.
   ========================================================= */

// Apps Script común para todos los eventos (termina en /exec).
// Se despliega una sola vez desde Google: ver apps-script/registro.gs
const REGISTRO_URL = "";

const PAISES = [
  ['+34',  '🇪🇸', { min: 9,  max: 9,  pattern: /^[67]/,    hint: '9 dígitos, empieza por 6 o 7' }],
  ['+54',  '🇦🇷', { min: 10, max: 10,                       hint: '10 dígitos' }],
  ['+39',  '🇮🇹', { min: 9,  max: 10, pattern: /^3/,        hint: '9-10 dígitos, empieza por 3' }],
  ['+33',  '🇫🇷', { min: 9,  max: 9,  pattern: /^[67]/,     hint: '9 dígitos, empieza por 6 o 7' }],
  ['+44',  '🇬🇧', { min: 10, max: 10, pattern: /^7/,        hint: '10 dígitos, empieza por 7' }],
  ['+49',  '🇩🇪', { min: 10, max: 11, pattern: /^1[5679]/, hint: '10-11 dígitos, empieza por 15, 16, 17 o 19' }],
  ['+351', '🇵🇹', { min: 9,  max: 9,  pattern: /^9/,        hint: '9 dígitos, empieza por 9' }],
  ['+52',  '🇲🇽', { min: 10, max: 10,                       hint: '10 dígitos' }],
  ['+57',  '🇨🇴', { min: 10, max: 10, pattern: /^3/,        hint: '10 dígitos, empieza por 3' }],
  ['+58',  '🇻🇪', { min: 10, max: 11,                       hint: '10-11 dígitos' }],
  ['+1',   '🇺🇸', { min: 10, max: 10,                       hint: '10 dígitos' }],
];
const phoneRules = Object.fromEntries(PAISES.map(([code, , rule]) => [code, rule]));

const $ = id => document.getElementById(id);

/* ---------- Teléfono ---------- */

const countrySelect = $('f-country');
countrySelect.innerHTML = PAISES.map(([code, flag], i) =>
  `<option value="${code}"${i === 0 ? ' selected' : ''}>${flag} ${code}</option>`).join('');

const whatsappInput = $('f-whatsapp');
whatsappInput.addEventListener('input', () => {
  whatsappInput.value = whatsappInput.value.replace(/[^\d\s]/g, '');
  whatsappInput.classList.remove('invalid');
  $('f-whatsapp-error').style.display = 'none';
});

function validatePhone() {
  const digits = whatsappInput.value.replace(/\D/g, '');
  const rule = phoneRules[countrySelect.value] || { min: 6, max: 15 };
  if (digits.length < rule.min || digits.length > rule.max) return { digits: null, hint: rule.hint };
  if (rule.pattern && !rule.pattern.test(digits)) return { digits: null, hint: rule.hint };
  return { digits, hint: null };
}

/* ---------- Envío ---------- */

const btnLabel = $('f-btn-text').textContent;

async function enviarInscripcion() {
  const nombre = $('f-nombre').value.trim();
  const countryCode = countrySelect.value;
  const { digits: phoneDigits, hint: phoneHint } = validatePhone();

  if (!nombre) { alert('Por favor escribe tu nombre 🙂'); return; }
  if (!phoneDigits) {
    whatsappInput.classList.add('invalid');
    const errEl = $('f-whatsapp-error');
    errEl.textContent = phoneHint ? `Número no válido · ${phoneHint} 📱` : 'Revisa el número 📱';
    errEl.style.display = 'block';
    whatsappInput.focus();
    return;
  }

  const datos = { nombre, whatsapp: countryCode.slice(1) + ' ' + phoneDigits };
  for (const group of document.querySelectorAll('.radio-group[data-campo]')) {
    const campo = group.dataset.campo;
    const elegido = group.querySelector(`input[name="${campo}"]:checked`);
    if (!elegido) { alert(group.dataset.falta); return; }
    datos[campo] = elegido.value;
  }

  // La hoja común necesita saber de qué evento es; los Apps Script propios no
  const url = EVENTO.hojaUrl || REGISTRO_URL;
  if (!EVENTO.hojaUrl) datos.evento = EVENTO.id;

  const btn = $('f-btn');
  const btnText = $('f-btn-text');
  const spinner = $('f-spinner');
  const errorMsg = $('f-error');

  btn.disabled = true;
  btnText.textContent = 'Enviando...';
  spinner.style.display = 'block';
  errorMsg.style.display = 'none';

  try {
    if (!url) throw new Error('Falta la URL del Apps Script (REGISTRO_URL en assets/form.js)');
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(datos)
    });
    $('f-form').style.display = 'none';
    $('f-success').style.display = 'block';
  } catch (err) {
    console.error(err);
    errorMsg.style.display = 'block';
    btn.disabled = false;
    btnText.textContent = btnLabel;
    spinner.style.display = 'none';
  }
}

$('f-btn').addEventListener('click', enviarInscripcion);

/* ---------- Calendario ---------- */

// "2026-10-18 11:00" en hora de Madrid -> Date en UTC
function madridAUtc(texto) {
  const [y, m, d, h, min] = texto.split(/[-: T]/).map(Number);
  const local = Date.UTC(y, m - 1, d, h, min);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  });
  const offset = t => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - t;
  };
  return new Date(local - offset(local - offset(local)));
}

const cal = EVENTO.calendario;
const calInicio = madridAUtc(cal.inicio);
const calFin = madridAUtc(cal.fin);
const icsDate = d => d.toISOString().replace(/\.\d{3}/, '').replace(/[-:]/g, '');   // 20261018T090000Z
const isoDate = d => d.toISOString().replace(/\.\d{3}/, '');                          // 2026-10-18T09:00:00Z

const CAL_ICONOS = {
  google: `<span class="cal-icon" style="background:#fff; border:1.5px solid #e8e8e8;">
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908C16.657 14.253 17.64 11.945 17.64 9.2z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258a5.37 5.37 0 0 1-8.009-2.452H.957v2.332A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.961H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.329z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.96l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
    </span>`,
  apple: `<span class="cal-icon" style="background:#FF3B30;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="16" rx="3" stroke="white" stroke-width="1.6" fill="rgba(255,255,255,0.15)"/>
        <path d="M3 10h18" stroke="white" stroke-width="1.6"/>
        <path d="M8 3v4M16 3v4" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        <text x="12" y="20" text-anchor="middle" font-size="7.5" font-weight="700" fill="white" font-family="sans-serif">${+cal.inicio.slice(8, 10)}</text>
      </svg>
    </span>`,
  outlook: `<span class="cal-icon" style="background:#0078D4;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="5" width="18" height="16" rx="3" stroke="white" stroke-width="1.6" fill="rgba(255,255,255,0.15)"/>
        <path d="M3 10h18" stroke="white" stroke-width="1.6"/>
        <path d="M8 3v4M16 3v4" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        <circle cx="8.5" cy="15.5" r="1.2" fill="white"/>
        <circle cx="12" cy="15.5" r="1.2" fill="white"/>
        <circle cx="15.5" cy="15.5" r="1.2" fill="white"/>
      </svg>
    </span>`
};

$('cal-wrap').innerHTML = `
  <div class="cal-picker" id="cal-picker" style="display:none;">
    <button class="cal-option" data-cal="google">${CAL_ICONOS.google} Google Calendar</button>
    <button class="cal-option" data-cal="apple">${CAL_ICONOS.apple} Apple Calendar</button>
    <button class="cal-option" data-cal="outlook">${CAL_ICONOS.outlook} Outlook</button>
  </div>
  <button class="submit-btn" id="cal-toggle">📅 Añadir al calendario</button>`;

function toggleCalPicker(e) {
  e.stopPropagation();
  const picker = $('cal-picker');
  if (picker.style.display !== 'none') {
    picker.style.display = 'none';
  } else {
    picker.style.display = 'block';
    picker.style.animation = 'none';
    picker.offsetHeight;
    picker.style.animation = '';
  }
}

document.addEventListener('click', function(e) {
  if (!$('cal-wrap').contains(e.target)) $('cal-picker').style.display = 'none';
});

function calSelect(type) {
  $('cal-picker').style.display = 'none';
  const enc = encodeURIComponent;
  if (type === 'google') {
    window.open(
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + enc(cal.titulo) +
      '&dates=' + icsDate(calInicio) + '%2F' + icsDate(calFin) +
      '&details=' + enc(cal.descripcion) +
      '&location=' + enc(cal.lugar),
      '_blank', 'noopener'
    );
  } else if (type === 'outlook') {
    window.open(
      'https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent' +
      '&subject=' + enc(cal.titulo) +
      '&startdt=' + enc(isoDate(calInicio)) + '&enddt=' + enc(isoDate(calFin)) +
      '&location=' + enc(cal.lugar) +
      '&body=' + enc(cal.descripcion),
      '_blank', 'noopener'
    );
  } else {
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + EVENTO.nombre + '//ES',
      'BEGIN:VEVENT',
      'UID:' + EVENTO.id + '@yogaconvicky',
      'DTSTAMP:' + icsDate(calInicio),
      'DTSTART:' + icsDate(calInicio), 'DTEND:' + icsDate(calFin),
      'SUMMARY:' + cal.titulo,
      'LOCATION:' + cal.lugar.replace(/,/g, '\\,'),
      'DESCRIPTION:' + cal.descripcion.replace(/,/g, '\\,'),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = EVENTO.archivo + '.ics';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}

$('cal-toggle').addEventListener('click', toggleCalPicker);
$('cal-picker').querySelectorAll('.cal-option').forEach(b =>
  b.addEventListener('click', () => calSelect(b.dataset.cal)));

/* ---------- Compartir ---------- */

async function compartir() {
  const url = location.origin + location.pathname;
  const text = EVENTO.compartir;
  if (navigator.share) {
    try { await navigator.share({ title: EVENTO.nombre, text, url }); } catch (err) {}
    return;
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url), '_blank', 'noopener');
}

$('f-share').addEventListener('click', compartir);
