// client/src/components/common/SmartMedia.jsx
import React from "react";
import { absUrl } from "../../utils/api";

export function SmartImg({ src, ...rest }) {
  // Accept absolute URLs or /uploads/* and normalize
  const real = absUrl(src || "");
  return <img src={real} {...rest} />;
}

// (Keep/extend with SmartVideo etc. if you already had them)
