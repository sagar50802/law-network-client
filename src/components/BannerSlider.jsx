import { useEffect, useState } from "react";
import { getJSON } from "../utils/api";
import { SmartImg, SmartVideo } from "./common/SmartMedia";

export default function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    getJSON("/api/banners").then((r) =>
      setBanners(Array.isArray(r) ? r : r.banners || r.items || r.data || [])
    );
  }, []);

  useEffect(() => {
    if (!banners.length) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
        No banners yet
      </div>
    );
  }

  const b = banners[i];
  return (
    <div className="w-full h-64 relative overflow-hidden rounded">
      {b.type === "video" ? (
        <SmartVideo
          src={b.url}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
        />
      ) : (
        <SmartImg
          src={b.url}
          alt={b.title || ""}
          className="w-full h-full object-cover"
        />
      )}
      {b.title && (
        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded">
          {b.title}
        </div>
      )}
    </div>
  );
}
