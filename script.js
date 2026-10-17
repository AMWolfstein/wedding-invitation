(() => {
  const WEDDING_ISO = '2026-10-23T19:00:00+03:00';
  const WEDDING_DATE = new Date(WEDDING_ISO);
  const VENUE_NAME = 'مسجد المهند، الرحاب';
  const VENUE_URL = 'https://maps.app.goo.gl/3tJyJcZiLtVGyHB2A?g_st=aw';
  const SHARE_TEXT = 'يسعدنا دعوتكم لحضور حفل زفاف هاني و رضوي — الجمعة ٢٣ أكتوبر ٢٠٢٦ من الساعة السابعة حتى التاسعة مساءً في مسجد المهند بالرحاب. التفاصيل: ';

  /* ===================== COUNTDOWN ===================== */
  const els = {
    days: document.querySelector('[data-cd="days"]'),
    hours: document.querySelector('[data-cd="hours"]'),
    minutes: document.querySelector('[data-cd="minutes"]'),
    seconds: document.querySelector('[data-cd="seconds"]'),
    grid: document.getElementById('countdown'),
    passed: document.getElementById('cd-passed'),
  };

  const pad = (n) => String(n).padStart(2, '0');
  const toArabicDigits = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

  let timerId;
  function tick() {
    const now = Date.now();
    const diff = WEDDING_DATE.getTime() - now;

    if (diff <= 0) {
      els.grid.hidden = true;
      els.passed.hidden = false;
      clearInterval(timerId);
      return;
    }

    const s = Math.floor(diff / 1000);
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    els.days.textContent    = toArabicDigits(pad(days));
    els.hours.textContent   = toArabicDigits(pad(hours));
    els.minutes.textContent = toArabicDigits(pad(minutes));
    els.seconds.textContent = toArabicDigits(pad(seconds));
  }

  timerId = setInterval(tick, 1000);
  tick();

  /* ===================== BACKGROUND AUDIO + OPEN-INVITE OVERLAY ===================== */
  const islamicMode = new URLSearchParams(location.search).get('m') === 'n';
  const audio = document.getElementById('bg-audio');

  if (islamicMode) {
    audio.src = 'assets/islamic-sound.aac';
  }
  audio.volume = 0.6;
  audio.loop = !islamicMode;
  audio.muted = false;

  audio.addEventListener('error', () => {
    console.warn('[audio] failed to load', audio.error);
  });

  const overlay = document.getElementById('open-overlay');
  let opened = false;
  const openInvite = () => {
    if (opened) return;
    opened = true;
    audio.muted = false;
    audio.play().catch((e) => console.warn('[audio] play failed', e));
    overlay.classList.add('is-open');
    setTimeout(() => overlay.remove(), 700);
  };

  overlay.addEventListener('click', openInvite);
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openInvite();
    }
  });

  /* ===================== TOAST ===================== */
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => { toastEl.hidden = true; }, 250);
    }, 2000);
  }

  /* ===================== SHARE ===================== */
  const pageUrl = () => location.href;

  document.getElementById('share-whatsapp').addEventListener('click', () => {
    const text = encodeURIComponent(SHARE_TEXT + pageUrl());
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  });

  document.getElementById('share-native').addEventListener('click', async () => {
    const shareData = {
      title: 'هاني و رضوي — ٢٣ أكتوبر ٢٠٢٦',
      text: SHARE_TEXT,
      url: pageUrl(),
    };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch (_) { /* user dismissed */ }
    } else {
      await copyToClipboard(SHARE_TEXT + pageUrl());
      toast('تم نسخ الدعوة');
    }
  });

  document.getElementById('copy-link').addEventListener('click', async () => {
    const ok = await copyToClipboard(pageUrl());
    toast(ok ? 'تم نسخ الرابط' : 'تعذر النسخ');
  });

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* ===================== CALENDAR (.ics) ===================== */
  document.getElementById('add-calendar').addEventListener('click', () => {
    const start = new Date(WEDDING_ISO);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const ics = buildIcs({
      uid: `hany-radwa-${start.getTime()}@invite`,
      title: "حفل زفاف هاني و رضوي",
      description: SHARE_TEXT + pageUrl(),
      location: VENUE_NAME,
      url: VENUE_URL,
      start, end,
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hany-radwa.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  function buildIcs({ uid, title, description, location, url, start, end }) {
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hany & Radwa//Wedding Invite//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${esc(title)}`,
      `DESCRIPTION:${esc(description)}`,
      `LOCATION:${esc(location)}`,
      `URL:${esc(url)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
})();
