/* ═══════════════════════════════════════════════════════════════════
   MOM TEST LINTER
   Rob Fitzpatrick's rules, applied to a question before it is ever asked.
   The whole point of the book in one line: past behaviour is data,
   future intentions are fiction. A question that asks someone to predict
   themselves, or to rate your idea, returns a compliment — not evidence.

   Each rule carries: what it matched, WHY that is a problem, and a
   concrete rewrite. A linter that only says "bad" teaches nothing.

   Persian and English patterns both, because sessions are run in Persian
   but studies get written in either.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {

  const RULES = [
    {
      id: 'hypothetical',
      level: 'err',
      label: 'سؤال فرضی دربارهٔ آینده',
      why: 'آدم‌ها آیندهٔ خودشان را بد پیش‌بینی می‌کنند. جوابی که می‌گیرید خیال است، نه داده.',
      fix: 'به‌جایش بپرسید آخرین بار واقعاً چه کار کرد.',
      example: '«آخرین بار که این مشکل پیش آمد، چه کار کردید؟»',
      re: [
        /\bwould you\b/i, /\bwill you\b/i, /\bdo you think you('| wo)uld\b/i,
        /\bif (we|there) (were|was|had)\b/i, /\bwould it be\b/i,
        /اگر\s+.{0,28}(باشد|بود|بیاید|بسازیم|داشته باشیم|اضافه کنیم)/,
        /(حاضر(ی|ید)|آیا).{0,24}(می‌?خر|استفاده می‌?کن|پرداخت می‌?کن)/,
        /می‌?خواه(ی|ید)\s+.{0,20}[?؟]/, /(چقدر )?احتمال دارد/
      ]
    },
    {
      id: 'opinion',
      level: 'err',
      label: 'نظرخواهی دربارهٔ ایده',
      why: 'نظر مثبت هیچ هزینه‌ای برای گوینده ندارد، پس ارزان و بی‌اعتبار است.',
      fix: 'به‌جای نظر، دنبال رفتار و هزینه‌ای که تا حالا پرداخته بگردید.',
      example: '«این کار الان چقدر برایتان وقت یا پول می‌برد؟»',
      re: [
        /\bdo you (like|think|feel)\b/i, /\bwhat do you think (of|about)\b/i,
        /\bis (this|that) a good\b/i, /\bhow do you like\b/i,
        /نظر(ت|تان|ی)\s*(چیه|چیست|درباره)/, /به نظر(ت|تان|م)/,
        /(دوست دار(ی|ید))/, /(خوب(ه|ه؟|است)\s*[?؟])/, /چطور بود\s*[?؟]/,
        /(جالب|مفید|خوب)\s+(بود|است|به نظر)/
      ]
    },
    {
      id: 'leading',
      level: 'err',
      label: 'سؤال جهت‌دار',
      why: 'جواب را داخل خودِ سؤال گذاشته‌اید؛ کاربر فقط تأییدش می‌کند.',
      fix: 'مزیت را از سؤال بردارید و اجازه بدهید خودش موضوع را بیاورد.',
      example: '«وقتی می‌خواهید پول جابه‌جا کنید، چه چیزی سخت‌تر از بقیه است؟»',
      re: [
        /\bdon't you (think|agree)\b/i, /\bwouldn't it be (better|easier|nicer)\b/i,
        /\bisn't it\b/i,
        /(مگه|مگر)\s+نه/, /(بهتر|راحت‌?تر|سریع‌?تر|امن‌?تر)\s+نیست\s*[?؟]/,
        /(قبول دار(ی|ید))/, /درست(ه|ه؟|است)\s*[?؟]/
      ]
    },
    {
      id: 'pitch',
      level: 'warn',
      label: 'ارائه به‌جای پرسش',
      why: 'در جلسهٔ تست، تعریف از محصول جواب‌ها را مؤدبانه می‌کند. پروتکل هم Persuasion را ممنوع کرده.',
      fix: 'توصیف محصول را حذف کنید؛ فقط کار (Job) را خنثی نام ببرید.',
      example: '«این سرویس بخشی از پول را به ارزش دلاری تبدیل می‌کند.» و بعد سکوت.',
      re: [
        /\b(amazing|revolutionary|best|unique|game.?chang)/i,
        /(بهترین|بی‌?نظیر|منحصر\s?به\s?فرد|انقلابی|عالی‌?ترین)/,
        /(ما\s+(می‌?توانیم|بلدیم|توانسته‌?ایم))/,
        /(مزیت\s+(ما|این))/
      ]
    },
    {
      id: 'closed',
      level: 'warn',
      label: 'سؤال بله/خیر',
      why: 'یک کلمه جواب می‌گیرید و علت پشتش گم می‌شود.',
      fix: 'با «چطور»، «چه‌ وقت»، «آخرین بار» شروع کنید تا روایت بگیرید.',
      example: '«آخرین بار چطور این کار را انجام دادید؟»',
      re: [
        /^\s*(do|does|did|are|is|have|has|can|would|will)\b/i,
        /^\s*آیا(\s|$)/,   // JS \b is ASCII-only, so it never fires after Persian letters
        /^\s*.{0,40}(می‌?کن(ی|ید)|هست(ی|ید)|دار(ی|ید)|بود(ی|ید))\s*[?؟]\s*$/
      ]
    },
    {
      id: 'compound',
      level: 'warn',
      label: 'دو سؤال در یک جمله',
      why: 'کاربر به یکی جواب می‌دهد و آن یکی برای همیشه بی‌جواب می‌ماند.',
      fix: 'جدایشان کنید و یکی‌یکی بپرسید.',
      example: '—',
      re: [/[?؟].+[?؟]/]
    },
    {
      id: 'future-commit',
      level: 'warn',
      label: 'تعهد گرفتن به‌صورت حرف',
      why: '«حتماً استفاده می‌کنم» هزینه‌ای ندارد. تعهد واقعی یعنی وقت، اعتبار یا پول.',
      fix: 'به‌جای قول، یک قدم واقعی بخواهید.',
      example: '«حاضرید همین حالا برای نسخهٔ بعد وقت بگذارید؟» یا «چه مبلغی برای شروع منطقی است؟»',
      re: [
        /\b(would you (use|buy|pay|recommend))\b/i,
        /(استفاده می‌?کن(ی|ید)\s*[?؟])/, /(می‌?خر(ی|ید)\s*[?؟])/,
        /(پیشنهاد می‌?د(ی|هید)\s*[?؟])/
      ]
    }
  ];

  /* A question earns credit for anchoring in the past — that is the single
     strongest signal that it will return data instead of a compliment. */
  const PAST_ANCHOR = [
    /\blast time\b/i, /\bthe last time\b/i, /\bwhen did you\b/i, /\bhow did you\b/i,
    /\btell me about\b/i, /\bwalk me through\b/i,
    /آخرین بار/, /دفعهٔ? قبل/, /چه کار کردید/, /چه کار کرد(ی|ید)/,
    /چطور انجام داد(ی|ید)/, /تعریف کن(ید)?/, /برایم بگویید چطور/,
    /چند وقت پیش/, /قبلاً/
  ];

  function lint(text) {
    const q = (text || '').trim();
    const out = { flags: [], score: 0, ok: false };
    if (!q) return out;

    for (const r of RULES) {
      if (r.re.some(rx => rx.test(q))) {
        out.flags.push({
          id: r.id, level: r.level, label: r.label,
          why: r.why, fix: r.fix, example: r.example
        });
      }
    }

    const anchored = PAST_ANCHOR.some(rx => rx.test(q));
    if (anchored) {
      out.flags.push({
        id: 'anchored', level: 'good', label: 'به رفتار گذشته وصل است',
        why: 'این سؤال دنبال چیزی است که واقعاً اتفاق افتاده — همان چیزی که می‌شود به آن تکیه کرد.',
        fix: '', example: ''
      });
    }

    const errs = out.flags.filter(f => f.level === 'err').length;
    const warns = out.flags.filter(f => f.level === 'warn').length;
    out.score = Math.max(0, 100 - errs * 34 - warns * 15 + (anchored ? 12 : 0));
    out.score = Math.min(100, out.score);
    out.ok = errs === 0;
    return out;
  }

  /* Ready-made openers that pass by construction. Offered as a starting
     point so a facilitator under time pressure does not improvise a
     hypothetical. */
  const STARTERS = [
    'آخرین بار که ــــ لازم داشتید، چه کار کردید؟',
    'همین کار را الان چطور انجام می‌دهید؟',
    'آخرین بار چقدر برایتان وقت یا هزینه برد؟',
    'چه چیزی در مسیر فعلی اذیتتان می‌کند ولی تحملش می‌کنید؟',
    'چه اتفاقی باعث شد آن بار واقعاً اقدام کنید؟',
    'برای این مشکل تا حالا چه چیزهایی را امتحان کرده‌اید؟',
    'چه کسی دیگر در این تصمیم دخیل است؟',
    'دفعهٔ قبل کجا متوقف شدید و چرا؟'
  ];

  global.MomTest = { lint, RULES, STARTERS };
})(window);
