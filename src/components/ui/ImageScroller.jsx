import { absUrl } from "../../utils/api";

export function ImageScroller({ images = [] }) {
  if (!images?.length) return null;
  return (
    <div className="img-scroller">
      {images.map((u, i) => (
        <img key={i} src={absUrl(u)} alt="" loading="lazy" />
      ))}
    </div>
  );
}
