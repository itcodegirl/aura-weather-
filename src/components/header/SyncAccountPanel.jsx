import { memo } from "react";

function SyncAccountPanel({
  syncConnected,
  syncAccount,
  syncState,
  syncKeyInput,
  setSyncKeyInput,
  onCreateSyncAccount,
  onConnectSyncAccount,
  onDisconnectSyncAccount,
  onSyncNow,
}) {
  const syncStatusText =
    typeof syncState?.message === "string" && syncState.message.trim()
      ? syncState.message.trim()
      : syncConnected
        ? "Sync connected"
        : "Sync not connected";
  const syncErrorText =
    typeof syncState?.error === "string" && syncState.error.trim()
      ? syncState.error.trim()
      : "";
  const isSyncing = syncState?.status === "syncing";

  return (
    <div className="sync-account-panel" aria-live="polite">
      <p className="sync-account-title">Account Sync</p>
      <p className="sync-account-status">{syncStatusText}</p>
      {syncConnected ? (
        <div className="sync-account-actions">
          <button
            type="button"
            className="sync-account-btn"
            onClick={onSyncNow}
            disabled={isSyncing}
          >
            Sync now
          </button>
          <button
            type="button"
            className="sync-account-btn sync-account-btn--subtle"
            onClick={onDisconnectSyncAccount}
            disabled={isSyncing}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="sync-account-connect">
          <button
            type="button"
            className="sync-account-btn"
            onClick={onCreateSyncAccount}
            disabled={isSyncing}
          >
            Create cloud account
          </button>
          <div className="sync-account-manual">
            <input
              type="text"
              className="sync-account-input"
              value={syncKeyInput}
              onChange={(event) => setSyncKeyInput(event.target.value)}
              placeholder="Paste sync key or URL"
              aria-label="Sync key"
              disabled={isSyncing}
            />
            <button
              type="button"
              className="sync-account-btn sync-account-btn--subtle"
              onClick={onConnectSyncAccount}
              disabled={isSyncing}
            >
              Connect
            </button>
          </div>
        </div>
      )}
      {syncConnected && (
        <p className="sync-account-key" title={syncAccount?.syncKey || undefined}>
          Key: {typeof syncAccount?.syncKey === "string"
            ? syncAccount.syncKey.slice(0, 32)
            : ""}
        </p>
      )}
      {syncErrorText && <p className="sync-account-error">{syncErrorText}</p>}
    </div>
  );
}

export default memo(SyncAccountPanel);
