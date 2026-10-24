import React from 'react';

export function Control({ label, children }) {
  return (
    <label className="control">
      <span>{label}</span>
      {children}
    </label>
  );
}
