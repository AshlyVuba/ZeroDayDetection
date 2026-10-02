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

function registrableDomain(hostname: string): string {
  const labels = hostname.split(".");
  const suffix = labels.slice(-2).join(".");
  const hasSecondLevelSuffix =
    suffix === "co.za" || suffix === "org.za" || suffix === "gov.za";
  return labels.slice(hasSecondLevelSuffix ? -3 : -2).join(".");
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  return edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1;
}

function hasNearAllowlistedDomain(hostname: string): boolean {
  const domain = registrableDomain(hostname);
  return LINK_ANALYSIS_CONFIG.allowlistedDomains.some((trustedDomain) => {
    const trustedRoot = registrableDomain(trustedDomain);
    return (
      hostname.startsWith(`${trustedDomain}.`) ||
      (domain !== trustedRoot && editDistanceAtMostOne(domain, trustedRoot))
    );
  });
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
      hasNearAllowlistedDomain(url.hostname) ||
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
