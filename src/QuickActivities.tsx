import { Activity, Plus } from "lucide-react";
import "./activities.css";
export default function QuickActivities({
  onCardio,
  onAbs,
  heading = true,
}: {
  onCardio: () => void;
  onAbs: () => void;
  heading?: boolean;
}) {
  return (
    <section
      className="quick-activities"
      aria-label="Registro rápido de atividades"
    >
      {heading && <h2>Cardio e abdômen</h2>}
      <div className="quick-activity-buttons">
        <button className="secondary" onClick={onCardio}>
          <Activity size={18} /> Registrar cardio
        </button>
        <button className="secondary" onClick={onAbs}>
          <Plus size={18} /> Registrar abdômen
        </button>
      </div>
    </section>
  );
}
