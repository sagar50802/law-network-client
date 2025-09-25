// client/src/components/common/SmartMedia.jsx
import React from "react";
import { absUrl } from "../../utils/api";

/** Normalizes /uploads/* or absolute URLs to a safe absolute URL */
export function SmartImg({ src = "", ...rest }) {
  return <img src={absUrl(src)} {...rest} />;
}

/** Simple video wrapper; accepts src, poster, or an array of sources */
export function SmartVideo({ src = "", poster = "", sources, children, ...rest }) {
  const posterUrl = poster ? absUrl(poster) : undefined;

  // If multiple sources are provided, render <source> list
  if (Array.isArray(sources) && sources.length) {
    return (
      <video poster={posterUrl} {...rest}>
        {sources.map((u, i) => (
          <source key={i} src={absUrl(u)} />
        ))}
        {children}
      </video>
    );
  }

  // Single src
  return (
    <video src={absUrl(src)} poster={posterUrl} {...rest}>
      {children}
    </video>
  );
}
