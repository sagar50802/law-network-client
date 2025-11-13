import { useEffect } from "react";

import BannerSlider from "../components/BannerSlider";
import Article from "../components/Article/Article";
import ConsultancySection from "../components/consultancy/ConsultancySection.jsx";
import NewsTicker from "../components/NewsTicker.jsx";

export default function HomePage() {

  /* -----------------------------
     ✔ Background slideshow
     ✔ ONLY for homepage
     ✔ Affects ONLY <main> wrapper
     ✔ No effect on prep pages
  --------------------------------*/
  useEffect(() => {
    const images = [
      "/backgrounds/bg1.png",
      "/backgrounds/bg2.png",
      "/backgrounds/bg3.png"
    ];

    let i = 0;

    const mainEl = document.querySelector("main.homepage-bg");

    if (!mainEl) return;

    function applySlide() {
      mainEl.style.backgroundImage = `url(${images[i]})`;
      mainEl.style.backgroundSize = "cover";
      mainEl.style.backgroundPosition = "center";
      mainEl.style.backgroundRepeat = "no-repeat";
      mainEl.style.backgroundAttachment = "fixed";

      i = (i + 1) % images.length;
    }

    applySlide();
    const timer = setInterval(applySlide, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="homepage-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Hero / Banner */}
        <BannerSlider />

        {/* News ticker */}
        <NewsTicker />

        {/* Title + Description */}
        <h1 className="text-3xl font-bold mt-6 text-center">
          Welcome to Law Network
        </h1>
        <p className="text-gray-700 text-center mt-2">
          Select a section from the navigation above.
        </p>

        {/* ===== 70 / 30 split ===== */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-0 items-start">
          {/* Left: Articles */}
          <div
            className="
              [&_section#articles]:max-w-none
              [&_section#articles]:px-0
              [&_section#articles]:py-0
              [&_section#articles>div:nth-child(2)]:hidden
            "
          >
            <h2 className="text-2xl font-semibold mb-4">Latest Articles</h2>
            <Article limit={3} />
          </div>

          {/* Right: Consultancy */}
          <aside className="[&_section]:mt-0">
            <ConsultancySection />
          </aside>
        </section>
      </div>
    </main>
  );
}
