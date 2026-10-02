import { useEffect, useState } from "react";
import "./storage-access.css";

export default function StorageAccess({
  session,
  onStateChange = () => {},
  onError = () => {},
  externalError = "",
}) {
  const [state, setState] = useState(null);
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const nextState = await session.getState();
        if (active) {
          setState(nextState);
          setError("");
          onStateChange(nextState);
          onError("");
        }
      } catch (cause) {
        if (active) {
          const message = cause instanceof Error ? cause.message : "Unable to read storage.";
          setError(message);
          onError(message);
        }
      }
    };

    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    const unsubscribe = session.onStorageLocked(() => {
      void refresh();
    });
    void refresh();
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [session, onError, onStateChange]);

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      const nextState = await session.getState();
      setState(nextState);
      onStateChange(nextState);
      onError("");
      setPin("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Storage action failed.");
      onError(cause instanceof Error ? cause.message : "Storage action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPin(event) {
    event.preventDefault();
    if (state === "setup" && pin !== confirmation) {
      setError("PIN entries do not match.");
      return;
    }
    await run(() =>
      state === "setup" ? session.setupPin(pin) : session.unlock(pin),
    );
  }

  function deleteAll() {
    if (globalThis.confirm("Delete all locally stored app data?")) {
      void run(() => session.clearAll());
    }
  }

  if (state === null) {
    return (
      <section className="storage-access" aria-live="polite">
        <p>Checking private storage…</p>
        {(error || externalError) && <p role="alert">{error || externalError}</p>}
        {(error || externalError) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => session.startMemoryOnly())}
          >
            Continue in memory-only mode (no saved data)
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="storage-access" aria-labelledby="storage-access-title">
      <h2 id="storage-access-title">Private storage</h2>
      {state === "setup" || state === "locked" ? (
        <>
          <form onSubmit={submitPin}>
            <label htmlFor="storage-pin">
              {state === "setup" ? "Create a 4–6 digit PIN" : "Enter your PIN"}
            </label>
            <input
              id="storage-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              maxLength={6}
              autoComplete={state === "setup" ? "new-password" : "current-password"}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
            {state === "setup" && (
              <>
                <label htmlFor="storage-pin-confirm">Confirm PIN</label>
                <input
                  id="storage-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,6}"
                  maxLength={6}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  required
                />
              </>
            )}
            <button type="submit" disabled={busy}>
              {state === "setup" ? "Set PIN" : "Unlock"}
            </button>
          </form>
          {state === "setup" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => session.skipPin())}
            >
              Skip PIN for this session only
            </button>
          )}
          {state === "locked" && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => session.startMemoryOnly())}
              >
                Continue in memory-only mode (saved data stays locked)
              </button>
              <button type="button" disabled={busy} onClick={deleteAll}>
                Delete all data
              </button>
            </>
          )}
        </>
      ) : state === "unlocked" ? (
        <>
          <p>Encrypted storage is unlocked.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => session.lock())}
          >
            Lock storage
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={deleteAll}
          >
            Delete all data
          </button>
        </>
      ) : (
        <>
          <p>
            Session-only mode is active. Data stays in memory and is not saved
            between visits.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => session.lock())}
          >
            End session
          </button>
        </>
      )}
      {(error || externalError) && <p role="alert">{error || externalError}</p>}
    </section>
  );
}
