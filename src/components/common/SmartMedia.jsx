import { absUrl } from "../../utils/api";

/**
 * SmartImg → safe <img> that always resolves backend URLs
 */
export function SmartImg({ src, alt = "", className = "", ...rest }) {
  return <img src={absUrl(src)} alt={alt} className={className} {...rest} />;
}

/**
 * SmartVideo → safe <video> that always resolves backend URLs
 */
export function SmartVideo({ src, className = "", ...rest }) {
  return <video src={absUrl(src)} className={className} {...rest} />;
}
