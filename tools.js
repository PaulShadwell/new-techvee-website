// tools.js — the three free tools on techvee-tools.html
// Everything runs in the browser. Nothing is sent anywhere unless the visitor
// uses "Email me these results", which posts to api/send.php on this server.

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var CHF = function (n, dec) {
    dec = dec === undefined ? 0 : dec;
    return 'CHF ' + n.toLocaleString('de-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, "'");
  };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ─────────────────────────────────────────────────────────────────────────
  // Shared: "Email me these results" form
  // ─────────────────────────────────────────────────────────────────────────
  function reportForm(host, toolId, toolLabel, getReport) {
    if (host.querySelector('.report-form')) return;
    var wrap = document.createElement('div');
    wrap.className = 'report-form';
    wrap.innerHTML =
      '<h4>Email me these results</h4>' +
      '<p>One email with exactly what is shown here, sent from this Swiss-hosted site. I get a copy so I know who asked. Nothing is stored, no newsletter, no follow-up unless you ask.</p>' +
      '<form novalidate>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Name *</label><input type="text" name="name" required autocomplete="name"></div>' +
          '<div class="form-group"><label>Email *</label><input type="email" name="email" required autocomplete="email"></div>' +
          '<div class="form-group"><label>Company</label><input type="text" name="company" autocomplete="organization"></div>' +
        '</div>' +
        '<div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;"><label>Leave this empty<input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label></div>' +
        '<button type="submit" class="form-submit">Send me the report &rarr;</button>' +
        '<p class="form-error" hidden></p><p class="report-ok" hidden></p>' +
      '</form>';
    host.appendChild(wrap);
    var form = wrap.querySelector('form');
    var err = wrap.querySelector('.form-error');
    var ok = wrap.querySelector('.report-ok');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true; ok.hidden = true;
      var name = form.name.value.trim(), email = form.email.value.trim();
      form.name.classList.toggle('invalid', !name);
      form.email.classList.toggle('invalid', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      if (form.querySelector('.invalid')) { err.textContent = 'Please enter your name and a valid email address.'; err.hidden = false; return; }
      var rep = getReport();
      var btn = form.querySelector('.form-submit'); btn.disabled = true; btn.textContent = 'Sending…';
      fetch('api/send.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ kind: 'report', tool: toolLabel, name: name, email: email, company: form.company.value.trim(),
          title: rep.title, summary: rep.summary, lines: rep.lines, _gotcha: form._gotcha.value })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { ok.textContent = 'Sent — check your inbox (and the spam folder, just in case).'; ok.hidden = false; form.reset(); }
          else { err.textContent = (res.j && res.j.error) || 'Could not send. Please email info@techvee.com.'; err.hidden = false; }
        }).catch(function () { err.textContent = 'Network error. Please email info@techvee.com.'; err.hidden = false; })
        .finally(function () { btn.disabled = false; btn.textContent = 'Send me the report →'; });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 1 — Security & nDSG readiness check
  // ─────────────────────────────────────────────────────────────────────────
  var QUESTIONS = [
    { w: 10, q: 'Is multi-factor authentication enforced for every user, including administrators and shared mailboxes?',
      d: 'MFA stops the overwhelming majority of account-takeover attempts. "Security defaults" count as enforced; per-user MFA left to the user\'s discretion does not.',
      no: 'Enforce MFA for all users now via Conditional Access (or Security Defaults if you have no Entra ID P1). Start with admins today.',
      partial: 'Close the gaps: shared mailboxes, service accounts and "temporary" exclusions are exactly where attackers get in.' },
    { w: 8, q: 'Do you use Conditional Access policies (block legacy authentication, require MFA or a compliant device)?',
      d: 'Conditional Access is the control plane for who may sign in from where and with what. It needs Entra ID P1 (included in Business Premium and E3/E5).',
      no: 'Create a baseline set: block legacy auth, require MFA for all, require MFA for admins, block unknown countries you never work from.',
      partial: 'Review the policy set against Microsoft\'s baseline templates and remove stale exclusions.' },
    { w: 8, q: 'Are admin roles separated from day-to-day accounts, with at most 2–4 Global Admins and a tested break-glass account?',
      d: 'Admins who read email with a Global Admin account turn one phishing click into a full tenant compromise.',
      no: 'Create dedicated admin accounts without mailboxes, reduce Global Admins, and set up a documented break-glass account excluded from Conditional Access.',
      partial: 'Finish the separation and test that the break-glass credentials actually work.' },
    { w: 7, q: 'Are company PCs and phones managed (Intune), with compliance policies and disk encryption enforced?',
      d: 'Unmanaged devices mean company data on laptops nobody can wipe. Intune is included in Business Premium.',
      no: 'Enrol company devices in Intune, require BitLocker/FileVault, and tie access to device compliance via Conditional Access.',
      partial: 'Extend enrolment to every device that touches company data, including phones with Outlook or Teams.' },
    { w: 7, q: 'Is advanced email protection configured (Defender for Office 365: Safe Links, Safe Attachments, anti-phishing with impersonation protection)?',
      d: 'Default Exchange Online filtering is basic. Impersonation of your own executives is the attack I see most often against Swiss firms.',
      no: 'Enable Defender for Office 365 (in Business Premium / E5) and apply the Standard preset policy to all users.',
      partial: 'Apply the preset security policies tenant-wide and add your executives to impersonation protection.' },
    { w: 8, q: 'Is your Microsoft 365 data (Exchange, SharePoint, OneDrive, Teams) backed up to a separate system you control?',
      d: 'Microsoft provides resilience, not backup. Deleted or ransomware-encrypted data past the retention window is gone. The nDSG expects you to be able to restore personal data you are responsible for.',
      no: 'Add a third-party M365 backup — ideally to Swiss storage — and test a restore once a quarter.',
      partial: 'Make sure all four workloads are covered and that a restore has actually been tested.' },
    { w: 6, q: 'Are sign-in and audit logs reviewed, with alerts for risky sign-ins, new inbox rules and new admin role assignments?',
      d: 'Most breaches sit unnoticed for weeks. The attacker\'s first move after a successful login is usually a hidden inbox rule.',
      no: 'Turn on unified audit logging, create alert policies for the three events above, and have someone actually receive them.',
      partial: 'Add alerting so review does not depend on someone remembering to look.' },
    { w: 6, q: 'Do you use sensitivity labels or DLP policies to control where personal and confidential data can be shared?',
      d: 'The nDSG makes you responsible for personal data leaving the organisation. DLP catches the accidental email with a client list attached.',
      no: 'Start with one DLP policy for Swiss personal data (AHV numbers, IBANs) and one "Confidential" sensitivity label.',
      partial: 'Extend coverage to Teams and SharePoint sharing, not just email.' },
    { w: 8, q: 'Is your tenant\'s data location set to Switzerland and documented (Exchange, SharePoint, OneDrive, Teams all showing "Switzerland")?',
      d: 'Tenants created before Microsoft\'s Swiss datacentres opened often still store data in the EU. Many Swiss firms assume they are "in Switzerland" and are not.',
      no: 'Check Admin Centre › Settings › Org settings › Data location. If it shows EU, request a migration to Switzerland and record the result.',
      partial: 'Confirm every workload shows Switzerland and keep a dated screenshot for auditors and clients.' },
    { w: 8, q: 'Do you meet the nDSG basics: a current privacy policy, a record of processing activities where required, and a defined data-breach notification process?',
      d: 'Since September 2023 the revised Swiss data protection act has personal liability for responsible individuals. The three items above are what an auditor asks for first.',
      no: 'Write the privacy policy and breach process now; the processing record is required above 250 staff or for high-risk processing but is worth having regardless.',
      partial: 'Complete the missing item and date it — undated documents do not count under audit.' },
    { w: 6, q: 'Have you assessed and documented your CLOUD Act exposure — which data sits with US-headquartered providers and whether that is acceptable for its sensitivity?',
      d: 'Microsoft\'s Swiss datacentres do not remove US jurisdiction. For most data that is acceptable; for some it is not. The point is to have decided consciously.',
      no: 'List the data categories you hold, mark which sit with US providers, and record the decision. Use Swiss-sovereign providers for anything where the answer is "not acceptable".',
      partial: 'Extend the assessment to backups and sub-processors, which are usually forgotten.' },
    { w: 6, q: 'Do you have a written incident response plan and a leaver process that removes access on the person\'s last day?',
      d: 'The two moments a small firm is most exposed: during an attack, and the week after someone leaves on bad terms.',
      no: 'Write a one-page incident plan (who to call, what to isolate, who to inform) and a leaver checklist that includes M365, devices and any shared passwords.',
      partial: 'Test the incident plan with a 30-minute tabletop exercise and automate leaver offboarding where possible.' }
  ];
  var sqIdx = 0, sqAns = new Array(QUESTIONS.length).fill(null);
  var sqQ = document.getElementById('sq-question'), sqBar = document.getElementById('sq-bar'),
      sqPrev = document.getElementById('sq-prev'), sqNext = document.getElementById('sq-next'),
      sqCounter = document.getElementById('sq-counter'), sqRes = document.getElementById('sq-results'),
      sqCard = document.getElementById('sq-card');

  function sqRender() {
    var q = QUESTIONS[sqIdx], a = sqAns[sqIdx];
    var opts = [['yes', 'Yes — in place and enforced'], ['partial', 'Partly — started or not everywhere'], ['no', 'No — or I don\'t know']];
    sqQ.innerHTML = '<h3>' + esc(q.q) + '</h3><p>' + esc(q.d) + '</p>' +
      opts.map(function (o) {
        return '<label class="quiz-opt' + (a === o[0] ? ' sel' : '') + '"><input type="radio" name="sq" value="' + o[0] + '"' + (a === o[0] ? ' checked' : '') + '><span class="dot"></span><span>' + o[1] + '</span></label>';
      }).join('');
    sqQ.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        sqAns[sqIdx] = inp.value;
        sqQ.querySelectorAll('.quiz-opt').forEach(function (l) { l.classList.toggle('sel', l.contains(inp)); });
      });
    });
    sqBar.style.width = ((sqIdx + 1) / QUESTIONS.length * 100) + '%';
    sqCounter.textContent = (sqIdx + 1) + ' / ' + QUESTIONS.length;
    sqPrev.disabled = sqIdx === 0;
    sqNext.innerHTML = sqIdx === QUESTIONS.length - 1 ? 'See my score &rarr;' : 'Next &rarr;';
  }
  function sqResults() {
    var max = 0, got = 0, recs = [];
    QUESTIONS.forEach(function (q, i) {
      max += q.w;
      if (sqAns[i] === 'yes') got += q.w;
      else if (sqAns[i] === 'partial') { got += q.w / 2; recs.push({ sev: 'med', w: q.w, q: q.q, t: q.partial }); }
      else recs.push({ sev: 'high', w: q.w, q: q.q, t: q.no });
    });
    recs.sort(function (a, b) { return (b.sev === 'high') - (a.sev === 'high') || b.w - a.w; });
    var score = Math.round(got / max * 100);
    var g = score >= 90 ? ['A', '#22C55E', 'Excellent. You are ahead of nearly every Swiss SMB I audit. Keep the quarterly reviews going.'] :
            score >= 75 ? ['B', '#22C55E', 'Good foundation with specific gaps. The items below are a short, concrete to-do list.'] :
            score >= 60 ? ['C', '#F59E0B', 'Reasonable, but several important controls are missing or half-done. Prioritise the red items.'] :
            score >= 40 ? ['D', '#F59E0B', 'Significant exposure. Most of the red items are quick to fix and I would start this month.'] :
                          ['F', '#DC2626', 'Serious gaps in the basics. The first three red items should be done this week.'];
    sqRes.innerHTML =
      '<h4>Your readiness score</h4>' +
      '<div class="score-ring" style="--pct:' + score + '"><strong>' + score + '</strong><span>out of 100</span></div>' +
      '<div class="grade" style="color:' + g[1] + '">Grade ' + g[0] + '</div>' +
      '<p class="grade-desc">' + esc(g[2]) + '</p>' +
      (recs.length ? '<h4>What to fix, in order</h4><ul class="recs">' + recs.map(function (r) {
        return '<li><span class="sev ' + r.sev + '">!</span><div><strong>' + esc(r.q.replace(/\?$/, '')) + '</strong>' + esc(r.t) + '</div></li>';
      }).join('') + '</ul>' : '<p class="grade-desc">No open items. Genuinely well done.</p>') +
      '<a href="techvee-contact.html" class="results-cta" data-calendly>Talk through the results — free 30 min</a>' +
      '<button type="button" class="results-cta secondary" id="sq-retake" style="width:100%;border:none;cursor:pointer;font-family:inherit;">Start again</button>';
    document.getElementById('sq-retake').addEventListener('click', function () {
      sqIdx = 0; sqAns = new Array(QUESTIONS.length).fill(null);
      sqCard.querySelector('.report-form') && sqCard.querySelector('.report-form').remove();
      sqQ.hidden = false; sqCard.querySelector('.quiz-nav').hidden = false; sqCard.querySelector('.quiz-progress').hidden = false;
      sqRes.innerHTML = '<h4>Your readiness score</h4><p style="font-size:14px;color:rgba(255,255,255,.6);line-height:1.65;">Answer the twelve questions and your score, grade and a prioritised list of fixes appear here.</p>';
      sqRender(); sqCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // Replace the question area with a completion note + report form
    sqQ.hidden = true; sqCard.querySelector('.quiz-nav').hidden = true; sqCard.querySelector('.quiz-progress').hidden = true;
    reportForm(sqCard, 'security', 'Security & nDSG readiness check', function () {
      return {
        title: 'Microsoft 365 Security & nDSG Readiness Check — score ' + score + '/100 (grade ' + g[0] + ')',
        summary: g[2],
        lines: recs.length ? ['What to fix, in order:'].concat(recs.map(function (r, i) {
          return (i + 1) + '. [' + (r.sev === 'high' ? 'HIGH' : 'MEDIUM') + '] ' + r.q.replace(/\?$/, '') + '\n   → ' + r.t;
        })) : ['No open items.']
      };
    });
    if (window.innerWidth < 920) sqRes.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindCalendly(sqRes);
  }
  if (sqQ) {
    sqRender();
    sqPrev.addEventListener('click', function () { if (sqIdx > 0) { sqIdx--; sqRender(); } });
    sqNext.addEventListener('click', function () {
      if (sqAns[sqIdx] === null) { sqQ.classList.remove('quiz-shake'); void sqQ.offsetWidth; sqQ.classList.add('quiz-shake'); return; }
      if (sqIdx < QUESTIONS.length - 1) { sqIdx++; sqRender(); } else { sqResults(); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 2 — Licence advisor (Microsoft Switzerland list prices, CHF/user/month,
  // annual commitment, excl. MwSt — published October 2026)
  // ─────────────────────────────────────────────────────────────────────────
  var PRICE_DATE = 'October 2026';
  var PLANS = {
    'Business Basic':    { price: 5.67,  copilot: 5.67 + 17.00, copilotLabel: 'Business Basic + Copilot Business add-on', max: 300,
      feats: ['Web & mobile Office apps, Exchange (50 GB), Teams, 1 TB OneDrive', 'SharePoint, Planner, Forms, Bookings', 'Copilot Chat (the free web-grounded assistant)'],
      not: ['Desktop Office apps', 'Conditional Access / Entra ID P1', 'Intune', 'Defender for Office 365 / Business', 'DLP & sensitivity labels'] },
    'Business Standard': { price: 11.76, copilot: 19.03, copilotLabel: 'Business Standard + Copilot Business (bundle)', max: 300,
      feats: ['Desktop Office apps on 5 PCs/Macs per user', 'Exchange (50 GB), Teams incl. webinars, 1 TB OneDrive', 'SharePoint, Planner, Forms, Bookings, Loop, Clipchamp', 'Copilot Chat'],
      not: ['Conditional Access / Entra ID P1', 'Intune device management', 'Defender for Office 365 / Business', 'DLP & sensitivity labels'] },
    'Business Premium':  { price: 20.69, copilot: 25.92, copilotLabel: 'Business Premium + Copilot Business (bundle)', max: 300,
      feats: ['Everything in Business Standard', 'Entra ID P1: Conditional Access, MFA policies', 'Intune Plan 1 device management & Autopilot', 'Defender for Business + Defender for Office 365 P1', 'Purview Information Protection P1, basic DLP', 'Copilot Chat'],
      not: ['Entra ID P2 (PIM, risk-based sign-in) — add-on', 'Teams Phone — add-on', 'Power BI Pro — add-on', 'eDiscovery Premium / insider risk'] },
    'Microsoft 365 E3':  { price: 35.32, copilot: null, copilotLabel: 'Microsoft 365 Copilot (enterprise add-on)', max: Infinity,
      feats: ['Desktop & web Office apps, unlimited installs', 'Exchange (100 GB), Teams, SharePoint, 1 TB+ OneDrive', 'Entra ID P1, Intune Plan 1, Windows Enterprise E3', 'Defender for Endpoint P1 + Defender for Office 365 P1', 'DLP, eDiscovery Standard, Copilot Chat', 'No user cap'],
      not: ['Entra ID P2 (PIM)', 'Teams Phone — add-on', 'Power BI Pro — add-on', 'Defender for Office 365 P2 / Endpoint P2', 'eDiscovery Premium'] },
    'Microsoft 365 E5':  { price: 54.33, copilot: null, copilotLabel: 'Microsoft 365 Copilot (enterprise add-on)', max: Infinity,
      feats: ['Everything in E3', 'Entra ID P2: PIM, Identity Protection, access reviews', 'Defender for Office 365 P2, Endpoint P2, Identity, Cloud Apps', 'Teams Phone Standard and Audio Conferencing included', 'Power BI Pro included', 'eDiscovery Premium, insider risk, advanced DLP', 'No user cap'],
      not: [] }
  };
  var ADDON_PHONE = 8.10; // Teams Phone Standard, CHF/user/month

  var la = {};
  ['users', 'copilot', 'desktop', 'phone', 'pbi', 'ca', 'intune', 'defender', 'dlp', 'pim', 'compliance'].forEach(function (k) { la[k] = document.getElementById('la-' + k); });
  var laRes = document.getElementById('la-results');
  var laCurrent = null;

  function laCalc() {
    var users = +la.users.value, cp = Math.min(+la.copilot.value, users);
    la.copilot.max = users; if (+la.copilot.value > users) la.copilot.value = users;
    document.getElementById('la-users-val').textContent = users;
    document.getElementById('la-copilot-val').textContent = cp;
    var need = {}; Object.keys(la).forEach(function (k) { if (la[k].type === 'checkbox') need[k] = la[k].checked; });
    var warnings = [], rows = [], plan;

    if (users > 300) {
      plan = (need.pim || need.compliance) ? 'Microsoft 365 E5' : 'Microsoft 365 E3';
      if (plan === 'Microsoft 365 E3' && (need.phone || need.pbi)) {
        var e3extra = (need.phone ? ADDON_PHONE : 0);
        if (need.pbi) warnings.push('Power BI Pro is an add-on to E3 (price on request); with Teams Phone as well, E5 at ' + CHF(PLANS['Microsoft 365 E5'].price, 2) + ' may work out cheaper. Ask me to run the numbers.');
        if (need.phone) warnings.push('Teams Phone Standard is an add-on to E3 at ' + CHF(e3extra, 2) + ' per user; included in the total below for all users.');
      }
    } else {
      if (need.ca || need.intune || need.defender || need.dlp) plan = 'Business Premium';
      else if (need.desktop) plan = 'Business Standard';
      else plan = 'Business Basic';
      if (need.pim) warnings.push('Just-in-time admin access needs Entra ID P2, which is not in any Business plan. Options: Entra ID P2 as an add-on for admins only (price on request), or Microsoft 365 E5 at ' + CHF(PLANS['Microsoft 365 E5'].price, 2) + '. For a small firm the add-on for 2–4 admins is nearly always the right answer.');
      if (need.compliance) warnings.push('eDiscovery Premium and insider-risk management are enterprise features (E5 or compliance add-ons) — usually only worth it under a regulator\'s requirement.');
      if (need.pbi) warnings.push('Power BI Pro is a separate add-on on Business plans (price on request). Not included in the total.');
      if (need.phone) warnings.push('Teams Phone Standard added at ' + CHF(ADDON_PHONE, 2) + ' per user for all users. If only some users need a phone number, the total is lower.');
    }
    var P = PLANS[plan];
    var base = users - cp;
    var monthly = 0;
    if (base > 0) { rows.push([plan + ' × ' + base, CHF(P.price * base, 2)]); monthly += P.price * base; }
    if (cp > 0) {
      if (P.copilot) { rows.push([P.copilotLabel + ' × ' + cp, CHF(P.copilot * cp, 2)]); monthly += P.copilot * cp; }
      else { rows.push([plan + ' × ' + cp, CHF(P.price * cp, 2)]); monthly += P.price * cp;
             rows.push([P.copilotLabel + ' × ' + cp, 'on request']);
             warnings.push('Microsoft 365 Copilot for enterprise plans is priced separately and not shown on Microsoft\'s Swiss public price list — not included in the total.'); }
    }
    if (need.phone && plan !== 'Microsoft 365 E5') { rows.push(['Teams Phone Standard × ' + users, CHF(ADDON_PHONE * users, 2)]); monthly += ADDON_PHONE * users; }
    if (users > 300 && plan === 'Microsoft 365 E3' && need.pbi) rows.push(['Power BI Pro × ' + users, 'on request']);

    laCurrent = { plan: plan, users: users, cp: cp, rows: rows, monthly: monthly, warnings: warnings, P: P };
    laRes.innerHTML =
      '<h4>Recommended plan</h4>' +
      '<div class="plan-name">' + esc(plan) + '</div>' +
      '<div class="results-total">' + CHF(P.price, 2) + '<small>per user / month</small></div>' +
      '<div class="results-rows">' + rows.map(function (r) { return '<div class="results-row"><span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span></div>'; }).join('') +
        '<div class="results-row total"><span>Estimated monthly total</span><span>' + CHF(monthly, 2) + '</span></div>' +
        '<div class="results-row total"><span>Per year</span><span>' + CHF(monthly * 12) + '</span></div></div>' +
      '<h4 style="margin-top:14px;">Included</h4><ul class="plan-feats">' + P.feats.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' +
      (P.not.length ? '<h4>Not included</h4><ul class="plan-feats">' + P.not.map(function (f) { return '<li class="no">' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
      warnings.map(function (w) { return '<div class="plan-warn">' + esc(w) + '</div>'; }).join('') +
      '<p class="results-note">Microsoft Switzerland list prices, annual commitment, excl. 8.1% MwSt, as published ' + PRICE_DATE + '. Through Techvee as your Swiss CSP you get the same or better pricing in CHF, on one Swiss invoice, with me as the first line of support.</p>' +
      '<a href="techvee-contact.html" class="results-cta" data-calendly>Get a current CHF quote</a>';
    bindCalendly(laRes);
  }
  if (laRes) {
    Object.keys(la).forEach(function (k) { la[k].addEventListener('input', laCalc); la[k].addEventListener('change', laCalc); });
    laCalc();
    reportForm(document.querySelector('#licence-advisor .tool-card'), 'licence', 'Licence advisor', function () {
      var c = laCurrent;
      return {
        title: 'Microsoft 365 licence estimate — ' + c.plan + ' for ' + c.users + ' users' + (c.cp ? ' (' + c.cp + ' with Copilot)' : ''),
        summary: 'Recommended plan: ' + c.plan + ' at ' + CHF(c.P.price, 2) + ' per user per month. Estimated total ' + CHF(c.monthly, 2) + ' per month / ' + CHF(c.monthly * 12) + ' per year (Microsoft CH list prices, ' + PRICE_DATE + ', excl. MwSt).',
        lines: ['Breakdown:'].concat(c.rows.map(function (r) { return '  ' + r[0] + ': ' + r[1]; }))
          .concat(['', 'Included:'], c.P.feats.map(function (f) { return '  ✓ ' + f; }))
          .concat(c.P.not.length ? ['', 'Not included:'].concat(c.P.not.map(function (f) { return '  – ' + f; })) : [])
          .concat(c.warnings.length ? ['', 'Notes:'].concat(c.warnings.map(function (w) { return '  ! ' + w; })) : [])
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TOOL 3 — Retainer vs in-house
  // ─────────────────────────────────────────────────────────────────────────
  var RET_BASE = 600, RET_HOURS = 5, RET_EXTRA = 130, ADHOC = 150, WEEK = 42;
  var rc = { hours: document.getElementById('rc-hours'), salary: document.getElementById('rc-salary'), oncost: document.getElementById('rc-oncost'), pt: document.getElementById('rc-parttime') };
  var rcRes = document.getElementById('rc-results'), rcCurrent = null;

  function rcCalc() {
    var h = +rc.hours.value, hm = h * 52 / 12;
    var salary = Math.max(0, +rc.salary.value || 0), oncost = Math.max(0, +rc.oncost.value || 0) / 100;
    document.getElementById('rc-hours-val').textContent = h + ' h';
    var retainer = RET_BASE + Math.max(0, hm - RET_HOURS) * RET_EXTRA;
    var adhoc = hm * ADHOC;
    var fullTime = salary * (1 + oncost) / 12;
    var pct = Math.round(h / WEEK * 100);
    var partTime = fullTime * (h / WEEK);
    var ptRealistic = rc.pt.checked;
    var opts = [
      { l: 'Techvee retainer', v: retainer, real: true },
      { l: 'Techvee ad-hoc hours', v: adhoc, real: true },
      { l: 'Part-time hire at ' + pct + '% FTE' + (ptRealistic ? '' : ' (theoretical)'), v: partTime, real: ptRealistic },
      { l: 'Full-time hire', v: fullTime, real: true }
    ];
    var best = opts.filter(function (o) { return o.real && o.v > 0; }).reduce(function (m, o) { return (!m || o.v < m.v) ? o : m; }, null) || opts[0];
    var maxV = Math.max.apply(null, opts.map(function (o) { return o.v; }));
    var hourlyHire = fullTime / (WEEK * 52 / 12);
    var beFull = ((fullTime - RET_BASE) / RET_EXTRA + RET_HOURS) * 12 / 52; // h/week where retainer == full-time
    var note;
    if (fullTime <= 0) note = 'Enter a salary to compare against hiring.';
    else if (ptRealistic) note = 'An employee at your salary assumption costs about ' + CHF(hourlyHire) + ' per hour all-in — below my rates. If you can genuinely find an experienced M365/Azure person for a ' + pct + '% position, hiring is cheaper per hour; the retainer then buys flexibility and a broader skill set rather than a lower price.';
    else note = 'A full-time hire costs ' + CHF(fullTime) + ' a month whether or not you use the hours; at ' + h + ' h/week you would use about ' + pct + '% of it. The retainer stays cheaper than a full-time hire up to roughly ' + Math.max(0, beFull).toFixed(0) + ' hours a week. The part-time bar is what a ' + pct + '% senior hire would cost if one existed — in my experience they rarely do below 40–50%.';

    rcCurrent = { h: h, hm: hm, opts: opts, best: best, note: note, salary: salary, oncost: oncost * 100 };
    rcRes.innerHTML =
      '<h4>Monthly cost for ' + h + ' h / week (' + hm.toFixed(1) + ' h / month)</h4>' +
      '<div class="results-total">' + CHF(best.v) + '<small>cheapest realistic option: ' + esc(best.l) + '</small></div>' +
      '<div class="bars">' + opts.map(function (o) {
        return '<div class="bar' + (o === best ? ' best' : '') + (o.real ? '' : ' theo') + '"><div class="lbl"><span>' + esc(o.l) + '</span><span>' + CHF(o.v) + '</span></div><div class="track"><div class="fill" style="width:' + (maxV ? (o.v / maxV * 100) : 0) + '%"></div></div></div>';
      }).join('') + '</div>' +
      '<p class="results-note">' + esc(note) + '</p>' +
      '<p class="results-note">What the numbers don\'t show: an employee is there every day and owns the environment; a retainer buys senior judgement without recruitment, holiday cover or the risk of a single point of failure. Above about 20 hours a week I would tell you to hire — and I do.</p>' +
      '<a href="techvee-contact.html" class="results-cta" data-calendly>Discuss a retainer — free 30 min</a>';
    bindCalendly(rcRes);
  }
  if (rcRes) {
    Object.keys(rc).forEach(function (k) { rc[k].addEventListener('input', rcCalc); rc[k].addEventListener('change', rcCalc); });
    rcCalc();
    reportForm(document.querySelector('#retainer-calculator .tool-card'), 'retainer', 'Retainer vs in-house calculator', function () {
      var c = rcCurrent;
      return {
        title: 'Senior IT support cost comparison — ' + c.h + ' h/week',
        summary: 'Cheapest realistic option at ' + c.h + ' h/week: ' + c.best.l + ' at ' + CHF(c.best.v) + ' per month. ' + c.note,
        lines: ['Assumptions: salary ' + CHF(c.salary) + ', employer on-costs ' + c.oncost + '%, 42-hour week, retainer CHF 600 incl. 5 h + CHF 130/h, ad-hoc CHF 150/h (all excl. MwSt).', '']
          .concat(c.opts.map(function (o) { return '  ' + o.l + ': ' + CHF(o.v) + ' per month'; }))
      };
    });
  }

  // Calendly popup binding for buttons rendered after components.js ran
  // (components.js only binds the [data-calendly] links present at load and
  // loads the Calendly assets; these handlers check for the widget at click time).
  function bindCalendly(scope) {
    scope.querySelectorAll('[data-calendly]').forEach(function (el) {
      if (el.dataset.bound) return; el.dataset.bound = '1';
      el.addEventListener('click', function (e) {
        if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
          e.preventDefault();
          window.Calendly.initPopupWidget({ url: 'https://calendly.com/paul-shadwell-techvee/30min?hide_gdpr_banner=1&primary_color=1dace8' });
        }
      });
    });
  }
});
