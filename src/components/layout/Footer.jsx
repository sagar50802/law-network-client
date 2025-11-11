import React, { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

const Footer = () => {
  const [footerData, setFooterData] = useState(null);
  const [termsText, setTermsText] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");

  // Load footer + terms
  useEffect(() => {
    const fetchData = async () => {
      try {
        const footerRes = await getJSON("/footer");
        const termsRes = await getJSON("/terms");
        setFooterData(footerRes?.footer || {});
        setTermsText(termsRes?.terms?.text || "");
      } catch (err) {
        console.error("Footer fetch error:", err);
        setError("Failed to load footer");
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <footer className="bg-gray-900 text-white text-center py-4">
        {error}
      </footer>
    );
  }

  if (!footerData) return null;

  const year = new Date().getFullYear();

  return (
    <>
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 px-6 py-10 mt-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          {/* Address / About */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">About Us</h4>
            <p className="text-gray-400 leading-relaxed">
              {footerData.text ||
                "Law Network — A modern platform dedicated to legal education, consultancy, and research."}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {(footerData.links || []).map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    className="hover:text-white transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  onClick={() => setShowTerms(true)}
                  className="hover:text-white transition-colors duration-200"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-2">Contact</h4>
            <p>Email: {footerData.email || "info@lawnetwork.in"}</p>
            <p>Phone: {footerData.phone || "+91-9876543210"}</p>
            <p className="mt-2 text-gray-400">{footerData.address || "New Delhi, India"}</p>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-gray-500">
          © {year} Law Network. All rights reserved.
        </p>
      </footer>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-3xl w-[90%] max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Terms & Conditions</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div
              className="p-6 overflow-y-auto text-gray-800 leading-relaxed select-none"
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                maxHeight: "60vh",
              }}
            >
              {termsText ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: termsText.replace(/\n/g, "<br/>"),
                  }}
                />
              ) : (
                <p className="text-gray-400 italic">
                  Terms & Conditions not available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Footer;
