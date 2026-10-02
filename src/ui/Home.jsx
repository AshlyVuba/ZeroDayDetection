import React, { useEffect, useState } from "react";
import { runAnalysis } from "../engine/index.ts";
import { isRiskResult } from "../engine/worker-contract.ts";
import {
  createTranslator,
  formatCurrency,
  getResultGuidance,
} from "../i18n/index.js";
import LanguageSelector from "./LanguageSelector.jsx";

const CURRENCIES = ["ZAR", "USD"];

function currentDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function isExplanation(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.headline === "string" &&
    Array.isArray(value.reasons) &&
    value.reasons.every((reason) => typeof reason === "string") &&
    Array.isArray(value.nextSteps) &&
    value.nextSteps.every((step) => typeof step === "string")
  );
}

function resultExplanation(result, supplied, language) {
  if (isExplanation(supplied)) return supplied;
  if (isExplanation(result.explanation)) return result.explanation;
  return getResultGuidance(result, language);
}

function ResultCard({ result, suppliedExplanation, title, language, headingId }) {
  if (!result) return null;
  const explanation = resultExplanation(result, suppliedExplanation, language);

  return (
    <section
      className={`result-card risk-${result.band}`}
      aria-labelledby={headingId}
      aria-live="polite"
    >
      <h2 id={headingId}>{title}</h2>
      <p className="risk-band">
        {result.band.toUpperCase()} · {result.score}/100
      </p>
      <p>{explanation.headline}</p>
      <h3>Why this was flagged</h3>
      {explanation.reasons.length ? (
        <ul>
          {explanation.reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{reason}</li>
          ))}
        </ul>
      ) : (
        <p>No specific warning signs were identified by these checks.</p>
      )}
      <h3>What you can do</h3>
      <ul>
        {explanation.nextSteps.map((step, index) => (
          <li key={`${index}-${step}`}>{step}</li>
        ))}
      </ul>
    </section>
  );
}

export default function Home({
  isOnline = true,
  offlineReady = false,
  updateAvailable = false,
  refresh,
  language = "en",
  onLanguageChange = () => {},
  onLock = async () => {},
  storageMode = "unlocked",
  session,
  t = createTranslator(language),
}) {
  const [screen, setScreen] = useState("home");
  const [message, setMessage] = useState("");
  const [messageResult, setMessageResult] = useState(null);
  const [messageApiResult, setMessageApiResult] = useState(null);
  const [payment, setPayment] = useState({
    recipientId: "",
    amount: "",
    currency: "ZAR",
    timestamp: currentDateTime(),
  });
  const [history, setHistory] = useState([]);
  const [recentRisk, setRecentRisk] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentApiResult, setPaymentApiResult] = useState(null);
  const [paymentSubmission, setPaymentSubmission] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([session.getTransactions(), session.getRecentRisk()])
      .then(([transactions, risk]) => {
        if (active) {
          setHistory(transactions);
          setRecentRisk(risk);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load saved data.");
        }
      });
    return () => {
      active = false;
    };
  }, [session]);

  function openScreen(nextScreen) {
    setError("");
    setApiError("");
    setScreen(nextScreen);
  }

  function updatePayment(field, value) {
    setPayment({ ...payment, [field]: value });
    setPaymentResult(null);
    setPaymentApiResult(null);
    setPaymentSubmission(null);
  }

  async function checkMessage(event) {
    event.preventDefault();
    setError("");
    setApiError("");
    setMessageResult(null);
    setMessageApiResult(null);
    if (!message.trim()) {
      setError(t("errors.emptyMessage"));
      return;
    }

    setBusy(true);
    try {
      const outcome = await runAnalysis("message", { text: message, lang: language });
      if (outcome.status !== "success") {
        setError(outcome.message);
        return;
      }
      setMessageResult(outcome.result);
      const risk =
        outcome.result.band === "low"
          ? null
          : {
              band: outcome.result.band,
              ...(outcome.result.scamType ? { scamType: outcome.result.scamType } : {}),
              timestamp: Date.now(),
            };
      await session.saveRecentRisk(risk);
      setRecentRisk(risk);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.analysisFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function checkPayment(event) {
    event.preventDefault();
    setError("");
    setApiError("");
    setPaymentResult(null);
    setPaymentApiResult(null);
    const amount = Number(payment.amount);
    const timestamp = new Date(payment.timestamp).getTime();
    if (
      !payment.recipientId.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(timestamp)
    ) {
      setError(t("errors.invalidAmount"));
      return;
    }

    const transaction = {
      id: globalThis.crypto?.randomUUID?.() ?? `${timestamp}-${Math.random()}`,
      recipientId: payment.recipientId.trim(),
      amount,
      currency: payment.currency,
      timestamp,
    };
    setBusy(true);
    try {
      const outcome = await runAnalysis("transaction", {
        transaction,
        history,
        ...(recentRisk ? { recentMessage: recentRisk } : {}),
      });
      if (outcome.status !== "success") {
        setError(outcome.message);
        return;
      }
      setPaymentResult(outcome.result);
      setPaymentSubmission({
        transaction,
        history,
        ...(recentRisk ? { recentMessage: recentRisk } : {}),
      });
      const updatedHistory = [...history, transaction].slice(-500);
      try {
        await session.saveTransactions(updatedHistory);
        setHistory(updatedHistory);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? `Analysis completed, but the payment was not saved: ${cause.message}`
            : "Analysis completed, but the payment was not saved.",
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("errors.analysisFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendToApi(kind) {
    setApiError("");
    setBusy(true);
    try {
      const base = import.meta.env.VITE_ANALYSIS_API_BASE ?? "";
      const payload =
        kind === "message"
          ? { text: message, lang: language }
          : {
              transaction: paymentSubmission.transaction,
              history: paymentSubmission.history,
              ...(paymentSubmission.recentMessage
                ? { recentMessage: paymentSubmission.recentMessage }
                : {}),
            };
      const response = await globalThis.fetch(
        `${base.replace(/\/$/u, "")}/api/${kind === "message" ? "message" : "transaction"}/analyse`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("The optional API check could not be completed.");
      }
      const { explanation: supplied, ...result } = body;
      if (!response.ok || !isRiskResult(result)) {
        throw new Error("The optional API check could not be completed.");
      }
      const apiExplanation = isExplanation(supplied) ? supplied : undefined;
      if (kind === "message") setMessageApiResult({ result, explanation: apiExplanation });
      else setPaymentApiResult({ result, explanation: apiExplanation });
    } catch (cause) {
      setApiError(cause instanceof Error ? cause.message : "The optional API check failed.");
    } finally {
      setBusy(false);
    }
  }

  function renderApiAction(kind) {
    return (
      <>
        <p className="privacy-note">
          {kind === "message"
            ? "Optional API check: choosing this sends the message text to the configured server."
            : "Optional API check: choosing this sends the recipient, payment details, history, and recent risk metadata to the configured server."}
        </p>
        <button type="button" disabled={!isOnline || busy} onClick={() => void sendToApi(kind)}>
          {kind === "message"
            ? "Send message to optional API"
            : "Send payment details and history to optional API"}
        </button>
      </>
    );
  }

  return (
    <div className="home-shell">
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="ZeroDay Detection home">
          <span className="wordmark-mark" aria-hidden="true">Z</span>
          <span>ZeroDay Detection</span>
        </a>
        <LanguageSelector language={language} onChange={onLanguageChange} t={t} />
      </header>

      <main className="home-main" aria-labelledby="home-title">
        {screen === "home" ? (
          <section className="welcome-panel">
            <p className="eyebrow">A moment to think</p>
            <h1 id="home-title">Take a moment before you act.</h1>
            <p className="intro-copy">
              Check messages and payments on this device. Nothing is sent to the API unless you choose its optional check.
            </p>
            <div className="action-list">
              <button className="action-button" type="button" onClick={() => openScreen("message")}>
                <span className="action-icon" aria-hidden="true">01</span>
                <span className="action-label">{t("ui.messageTab")}</span>
                <span className="action-arrow" aria-hidden="true">→</span>
              </button>
              <button className="action-button" type="button" onClick={() => openScreen("payment")}>
                <span className="action-icon" aria-hidden="true">02</span>
                <span className="action-label">{t("ui.paymentTab")}</span>
                <span className="action-arrow" aria-hidden="true">→</span>
              </button>
            </div>
            <section className="storage-status" aria-label="Private storage">
              <p>
                {storageMode === "memory-only"
                  ? "Session-only mode: data will be cleared when you end this session."
                  : "Encrypted private storage is unlocked on this device."}
              </p>
              <button type="button" onClick={() => void onLock()}>
                {storageMode === "memory-only" ? "End session" : "Lock app"}
              </button>
            </section>
          </section>
        ) : (
          <section className="flow-panel">
            <button className="back-button" type="button" onClick={() => openScreen("home")}>
              ← Back
            </button>
            {screen === "message" ? (
              <>
                <h1 id="home-title">{t("ui.messageTab")}</h1>
                <p className="privacy-note">{t("ui.privacyNote")} Local Worker analysis runs first; API analysis is optional.</p>
                <form className="flow-form" onSubmit={checkMessage}>
                  <label htmlFor="message-text">{t("ui.messageLabel")}</label>
                  <textarea
                    id="message-text"
                    rows="7"
                    maxLength="5000"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={t("ui.messagePlaceholder")}
                    required
                  />
                  <button type="submit" disabled={busy}>
                    {busy ? t("ui.checking") : t("ui.checkButton")}
                  </button>
                </form>
                <ResultCard result={messageResult} title={t("ui.resultTitle")} language={language} headingId="message-result-title" />
                {messageResult && renderApiAction("message")}
                {messageApiResult && (
                  <ResultCard
                    result={messageApiResult.result}
                    suppliedExplanation={messageApiResult.explanation}
                    title="Optional API result"
                    language={language}
                    headingId="message-api-result-title"
                  />
                )}
              </>
            ) : (
              <>
                <h1 id="home-title">{t("ui.paymentTab")}</h1>
                <p className="privacy-note">
                  Payment analysis runs on this device. Only the risk band, type, and time from a risky message may be linked to a payment; message text is never saved.
                </p>
                {recentRisk && (
                  <p className="risk-link" role="status">
                    Recent {recentRisk.band}-risk message linked (risk metadata only).
                  </p>
                )}
                <form className="flow-form" onSubmit={checkPayment}>
                  <label htmlFor="payment-recipient">{t("ui.recipientLabel")}</label>
                  <input
                    id="payment-recipient"
                    value={payment.recipientId}
                    onChange={(event) => updatePayment("recipientId", event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <label htmlFor="payment-amount">{t("ui.paymentAmountLabel")}</label>
                  <div className="amount-field">
                    <input
                      id="payment-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={payment.amount}
                      onChange={(event) => updatePayment("amount", event.target.value)}
                      required
                    />
                    <label className="visually-hidden" htmlFor="payment-currency">Currency</label>
                    <select
                      id="payment-currency"
                      value={payment.currency}
                      onChange={(event) => updatePayment("currency", event.target.value)}
                    >
                      {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                  </div>
                  <label htmlFor="payment-date">Date and time</label>
                  <input
                    id="payment-date"
                    type="datetime-local"
                    value={payment.timestamp}
                    onChange={(event) => updatePayment("timestamp", event.target.value)}
                    required
                  />
                  <button type="submit" disabled={busy}>
                    {busy ? t("ui.checking") : t("ui.checkButton")}
                  </button>
                </form>
                <ResultCard result={paymentResult} title={t("ui.resultTitle")} language={language} headingId="payment-result-title" />
                {paymentResult && renderApiAction("transaction")}
                {paymentApiResult && (
                  <ResultCard
                    result={paymentApiResult.result}
                    suppliedExplanation={paymentApiResult.explanation}
                    title="Optional API result"
                    language={language}
                    headingId="payment-api-result-title"
                  />
                )}
                <section className="history-panel" aria-labelledby="history-title">
                  <h2 id="history-title">Payment history ({history.length})</h2>
                  {history.length === 0 ? (
                    <p>No saved payments yet.</p>
                  ) : (
                    <ul>
                      {[...history].reverse().map((transaction) => (
                        <li key={transaction.id}>
                          <span>{transaction.recipientId}</span>
                          <span>
                            {formatCurrency(transaction.amount, transaction.currency, language)}
                            {" · "}
                            {new Date(transaction.timestamp).toLocaleString(language)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {error && <p className="flow-error" role="alert">{error}</p>}
        {apiError && <p className="flow-error" role="alert">Optional API: {apiError}</p>}
        <aside className="offline-banner" aria-label="Connection status" aria-live="polite" data-slot="offline-banner">
          <span className="offline-indicator" aria-hidden="true" />
          <span className="offline-message">
            {isOnline ? "You're online." : "You're offline."}
            {offlineReady ? " This app is ready to use offline." : ""}
          </span>
          {updateAvailable && (
            <button className="offline-update" type="button" onClick={refresh}>Refresh to update</button>
          )}
        </aside>
      </main>

      <footer className="site-footer">
        <span>ZeroDay Detection</span>
        <span>Pause. Think. Then decide.</span>
      </footer>
    </div>
  );
}
