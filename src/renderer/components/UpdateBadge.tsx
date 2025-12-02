import React, { useEffect, useState } from "react";

const UpdateBadge: React.FC = () => {
  const [version, setVersion] = useState<string>("");
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (_event: unknown, newVersion: string) => {
      setVersion(newVersion);
    };

    const handleUpdateDownloaded = () => {
      setIsDownloaded(true);
    };

    const handleError = (_event: unknown, error: string) => {
      console.error("Update error:", error);
    };

    window.api.onUpdateAvailable(handleUpdateAvailable);
    window.api.onUpdateDownloaded(handleUpdateDownloaded);
    window.api.onUpdateError(handleError);
  }, []);

  if (!version) return null;

  const label = isInstalling
    ? "Restarting to update…"
    : isDownloaded
    ? `Restart to update v${version}`
    : `Downloading v${version}…`;

  const handleClick = async () => {
    if (!isDownloaded || isInstalling) return;
    setIsInstalling(true);
    try {
      await window.api.installUpdate();
    } catch (error) {
      console.error("Failed to install update:", error);
      setIsInstalling(false);
    }
  };

  return (
    <button
      type="button"
      className="px-3 py-1 text-xs text-white bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 disabled:opacity-60"
      onClick={handleClick}
      disabled={!isDownloaded || isInstalling}
    >
      {label}
    </button>
  );
};

export default UpdateBadge;
