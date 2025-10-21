// client/src/pages/ResearchDraftingLab.jsx
import { useParams } from "react-router-dom";
import LabFlow from "../components/ResearchDrafting/LabFlow";

export default function ResearchDraftingLab(){
  const { id } = useParams();
  return <LabFlow id={id} />;
}
