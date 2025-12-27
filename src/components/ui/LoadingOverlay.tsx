import React from "react";

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Loading..." }) => {
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingOverlay; 