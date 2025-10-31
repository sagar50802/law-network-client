// client/src/pages/ResearchDraftingLab.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import LabFlow from "../components/ResearchDrafting/LabFlow";

export default function ResearchDraftingLab() {
  const { id } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    if (!id) {
      // Redirect safely if accessed without a valid id
      nav("/research-drafting");
    }
  }, [id, nav]);

  if (!id) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center text-gray-500 text-lg animate-pulse">
          Loading Research Lab...
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <LabFlow id={id} />
    </div>
  );
}
