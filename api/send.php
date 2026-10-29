<?php
/**
 * api/send.php — Techvee GmbH form handler (replaces Formspree).
 *
 * Runs on the Novatrend cPanel account and sends mail through the server's
 * own mail system, so visitor data never leaves Switzerland.
 *
 * Two kinds of request, both POST (form-encoded or JSON), both answered with JSON:
 *
 *   kind=contact  — the contact-page form. Fields: first_name, last_name, email,
 *                   company, topic, message. Mails the enquiry to TO_ADDRESS.
 *
 *   kind=report   — "email me my results" on the free-tools page. Fields: name,
 *                   email, company, tool, title, summary, lines[] (plain strings).
 *                   Mails the report to the visitor and a lead notification to
 *                   TO_ADDRESS.
 *
 * Anti-abuse: honeypot field (_gotcha), size limits, basic per-IP rate limit,
 * same-origin check. No cookies, nothing stored beyond a tiny rate-limit file.
 *
 * SENDER DOMAIN: mail is sent as FROM_ADDRESS (@techvee.ch). techvee.com's SPF
 * is locked to Microsoft 365, so never send as @techvee.com from this server.
 * Make sure techvee.ch has the SPF record  v=spf1 include:_spf.tophost.ch ~all
 */

declare(strict_types=1);

// ─── Configuration ─────────────────────────────────────────────────────────
const TO_ADDRESS    = 'info@techvee.com';            // where enquiries and leads go
const FROM_ADDRESS  = 'noreply@techvee.ch';           // must be on a domain this server may send for
const FROM_NAME     = 'Techvee website';
const SITE_HOST     = 'techvee.ch';                   // for the same-origin check
const RATE_LIMIT    = 6;                              // requests per IP per hour
const MAX_FIELD     = 4000;                           // characters per field
// ──────────────────────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'POST only']);
}

// Same-origin check (Origin header is sent by every modern browser for POSTs).
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$originHost = $origin ? (parse_url($origin, PHP_URL_HOST) ?: '') : '';
$selfHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$allowedHosts = [SITE_HOST, 'www.' . SITE_HOST, 'techvee.com', 'www.techvee.com', $selfHost];
if ($originHost !== '' && !in_array(strtolower($originHost), $allowedHosts, true)) {
    respond(403, ['ok' => false, 'error' => 'Forbidden']);
}

// Accept JSON or form-encoded bodies.
$ctype = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($ctype, 'application/json') !== false) {
    $data = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($data)) respond(400, ['ok' => false, 'error' => 'Invalid JSON']);
} else {
    $data = $_POST;
}

// Honeypot: real visitors never fill this.
if (!empty($data['_gotcha'])) {
    respond(200, ['ok' => true]); // pretend success, drop silently
}

// Rate limit: a small file per IP in the system temp dir, pruned on read.
function rateLimited(string $ip): bool {
    $file = sys_get_temp_dir() . '/techvee-send-' . md5($ip) . '.json';
    $now = time();
    $hits = [];
    if (is_file($file)) {
        $hits = json_decode((string) file_get_contents($file), true) ?: [];
        $hits = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
    }
    if (count($hits) >= RATE_LIMIT) return true;
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return false;
}
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
if (rateLimited($ip)) {
    respond(429, ['ok' => false, 'error' => 'Too many requests. Please try again later or email ' . TO_ADDRESS . '.']);
}

// Helpers
function field(array $d, string $k, int $max = MAX_FIELD): string {
    $v = $d[$k] ?? '';
    if (is_array($v)) $v = '';
    $v = trim((string) $v);
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr($v, 0, $max);
}
function oneLine(string $s, int $max = 200): string {
    // Header-safe: strip newlines and control characters.
    return mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? ''), 0, $max);
}
function validEmail(string $e): bool {
    return $e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL) !== false && !preg_match('/[\r\n]/', $e);
}
function sendMail(string $to, string $subject, string $body, string $replyTo = ''): bool {
    $headers = [
        'From: ' . mb_encode_mimeheader(FROM_NAME, 'UTF-8') . ' <' . FROM_ADDRESS . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: techvee-send/1.0',
    ];
    if ($replyTo !== '' && validEmail($replyTo)) $headers[] = 'Reply-To: ' . $replyTo;
    $subject = mb_encode_mimeheader(oneLine($subject, 150), 'UTF-8');
    return @mail($to, $subject, wordwrap($body, 78, "\n", false), implode("\r\n", $headers), '-f' . FROM_ADDRESS);
}

$kind = field($data, 'kind', 20);
$when = date('Y-m-d H:i') . ' CET';

// ─── kind=contact ──────────────────────────────────────────────────────────
if ($kind === 'contact' || $kind === '') {
    $first   = oneLine(field($data, 'first_name', 100));
    $last    = oneLine(field($data, 'last_name', 100));
    $email   = oneLine(field($data, 'email', 200));
    $company = oneLine(field($data, 'company', 200));
    $topic   = oneLine(field($data, 'topic', 120));
    $message = field($data, 'message');

    $errors = [];
    if ($first === '')  $errors['first_name'] = 'required';
    if ($last === '')   $errors['last_name']  = 'required';
    if (!validEmail($email)) $errors['email'] = 'invalid';
    if (mb_strlen($message) < 5) $errors['message'] = 'required';
    if ($errors) respond(422, ['ok' => false, 'errors' => $errors]);

    $body = "New enquiry from techvee.ch\n"
          . "────────────────────────────\n"
          . "Name:     $first $last\n"
          . "Email:    $email\n"
          . ($company !== '' ? "Company:  $company\n" : '')
          . ($topic !== ''   ? "Topic:    $topic\n"   : '')
          . "Sent:     $when\n"
          . "IP:       $ip\n\n"
          . "Message:\n$message\n";

    $subject = 'Enquiry: ' . ($topic !== '' ? $topic : 'website contact') . " — $first $last";
    if (!sendMail(TO_ADDRESS, $subject, $body, $email)) {
        respond(500, ['ok' => false, 'error' => 'Mail could not be sent. Please email ' . TO_ADDRESS . ' directly.']);
    }
    respond(200, ['ok' => true]);
}

// ─── kind=report ───────────────────────────────────────────────────────────
if ($kind === 'report') {
    $name    = oneLine(field($data, 'name', 120));
    $email   = oneLine(field($data, 'email', 200));
    $company = oneLine(field($data, 'company', 200));
    $tool    = oneLine(field($data, 'tool', 60));
    $title   = oneLine(field($data, 'title', 140));
    $summary = field($data, 'summary', 600);
    $lines   = $data['lines'] ?? [];
    if (!is_array($lines)) $lines = [];
    $lines = array_slice(array_map(fn($l) => mb_substr(trim(preg_replace('/[\x00-\x08\x0B-\x1F\x7F]+/u', ' ', (string) $l) ?? ''), 0, 400), $lines), 0, 60);
    $lines = array_values(array_filter($lines, fn($l) => $l !== ''));

    $errors = [];
    if ($name === '')        $errors['name']  = 'required';
    if (!validEmail($email)) $errors['email'] = 'invalid';
    if ($title === '')       $errors['title'] = 'required';
    if ($errors) respond(422, ['ok' => false, 'errors' => $errors]);

    $report = "$title\n" . str_repeat('─', min(60, mb_strlen($title))) . "\n\n"
            . ($summary !== '' ? "$summary\n\n" : '')
            . implode("\n", $lines) . "\n";

    // 1) The report, to the visitor.
    $visitorBody = "Hello $name,\n\nHere are your results from the Techvee free tools page, as requested.\n\n"
                 . $report
                 . "\nThis is an automated, indicative assessment — not advice tailored to your environment. "
                 . "If you'd like to go through it together, the first 30 minutes is free:\n"
                 . "https://techvee.ch/techvee-contact.html\n\n"
                 . "Paul Shadwell\nTechvee GmbH · Sonnenbergstrasse 11b · 8488 Turbenthal · info@techvee.com\n"
                 . "https://techvee.ch\n\n"
                 . "You received this single email because you entered your address on techvee.ch. "
                 . "Nothing is stored and you will not be contacted again unless you ask.\n";
    $sentVisitor = sendMail($email, 'Your Techvee results: ' . $title, $visitorBody, TO_ADDRESS);

    // 2) Lead notification, to Paul.
    $leadBody = "Tool report requested on techvee.ch\n"
              . "────────────────────────────────────\n"
              . "Name:     $name\n"
              . "Email:    $email\n"
              . ($company !== '' ? "Company:  $company\n" : '')
              . "Tool:     $tool\n"
              . "Sent:     $when\n"
              . "IP:       $ip\n"
              . "Visitor copy: " . ($sentVisitor ? 'sent' : 'FAILED') . "\n\n"
              . $report;
    $sentLead = sendMail(TO_ADDRESS, "Lead ($tool): $name" . ($company !== '' ? " — $company" : ''), $leadBody, $email);

    if (!$sentVisitor && !$sentLead) {
        respond(500, ['ok' => false, 'error' => 'Mail could not be sent. Please email ' . TO_ADDRESS . ' directly.']);
    }
    respond(200, ['ok' => true]);
}

respond(400, ['ok' => false, 'error' => 'Unknown request kind']);
