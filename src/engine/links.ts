import { LINK_ANALYSIS_CONFIG, MESSAGE_SCORING_CONFIG } from "./config";
import type { Signal } from "./types";

const URL_PATTERN =
  /(?<![\p{L}\p{N}_.@-])(?:https?:\/\/)?(?:www\.)?(?:(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?::\d{1,5})?(?:[/?#][^\s<>"'`]*)?/giu;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}]+$/u;
const CREDENTIAL_TERMS =
  /\b(?:password|passcode|one[- ]time (?:password|code|pin)|otp|pin|login code|verification code|sign[- ]in details|banking details|card number|cvv)\b/iu;
const IPV4_ADDRESS = /^(?:\d{1,3}\.){3}\d{1,3}$/u;

interface ExtractedUrl {
  hostname: string;
  protocol: string;
  evidence: string;
}

function parseUrl(text: string): URL | null {
  try {
    return new URL(/^https?:\/\//iu.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
}

function extractUrls(message: string): ExtractedUrl[] {
  if (!message.includes(".")) return [];

  const urls: ExtractedUrl[] = [];
  for (const match of message.matchAll(URL_PATTERN)) {
    const candidate = match[0].replace(TRAILING_PUNCTUATION, "");
    if (candidate.length === 0) continue;

    const parsed = parseUrl(candidate);
    if (parsed === null || !parsed.hostname.includes(".")) continue;

    urls.push({
      hostname: parsed.hostname.toLowerCase(),
      protocol: parsed.protocol.toLowerCase(),
      evidence: candidate.slice(0, 40),
    });
  }
  return urls;
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isAllowlisted(hostname: string): boolean {
  return LINK_ANALYSIS_CONFIG.allowlistedDomains.some((domain) =>
    matchesDomain(hostname, domain),
  );
}

function containsBrandTerm(hostname: string): boolean {
  return LINK_ANALYSIS_CONFIG.brandTerms.some((term) =>
    hostname.includes(term),
  );
}

function isRawIp(hostname: string): boolean {
  if (!IPV4_ADDRESS.test(hostname)) return false;
  return hostname
    .split(".")
    .every((octet) => Number(octet) >= 0 && Number(octet) <= 255);
}

export function matchLinkSignals(message: string): Signal[] {
  const urls = extractUrls(message);
  const signals: Signal[] = [];
  const shortenedUrl = urls.find((url) =>
    LINK_ANALYSIS_CONFIG.shortenedDomains.some((domain) =>
      matchesDomain(url.hostname, domain),
    ),
  );

  if (shortenedUrl !== undefined) {
    signals.push({
      id: "SHORTENED_LINK",
      weight: MESSAGE_SCORING_CONFIG.signalWeights.SHORTENED_LINK,
      evidence: shortenedUrl.evidence,
    });
  }

  const hasCredentialTerms = CREDENTIAL_TERMS.test(message);
  const lookalikeUrl = urls.find((url) => {
    if (isAllowlisted(url.hostname)) return false;
    return (
      containsBrandTerm(url.hostname) ||
      url.hostname.split(".").some((label) => label.startsWith("xn--")) ||
      isRawIp(url.hostname) ||
      (url.protocol !== "https:" && hasCredentialTerms)
    );
  });

  if (lookalikeUrl !== undefined) {
    signals.push({
      id: "LOOKALIKE_LINK",
      weight: MESSAGE_SCORING_CONFIG.signalWeights.LOOKALIKE_LINK,
      evidence: lookalikeUrl.evidence,
    });
  }

  return signals;
}
