import React from "react";
import "../answerWriting.css";

export default function UnitTopicTree({ data = [], onSelectItem }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="aw-card">
        <p className="aw-muted">No units yet. Create a unit to get started.</p>
      </div>
    );
  }

  return (
    <div className="aw-card">
      <div className="aw-card-title">Syllabus Tree</div>

      <ul className="aw-tree">
        {data.map((unit) => (
          <li key={unit._id}>
            {/* UNIT */}
            <button
              type="button"
              className="aw-tree-unit"
              onClick={() => onSelectItem?.({ unit })}
            >
              {unit.name}
            </button>

            {/* TOPICS UNDER UNIT */}
            <ul>
              {(unit.topics || []).map((topic) => (
                <li key={topic._id}>
                  {/* TOPIC */}
                  <button
                    type="button"
                    className={`aw-tree-topic ${topic.locked ? "aw-topic-locked" : ""}`}
                    onClick={() => onSelectItem?.({ unit, topic })}
                  >
                    {topic.name}
                  </button>

                  {/* SUBTOPICS UNDER TOPIC */}
                  <ul>
                    {(topic.subtopics || []).map((sub) => (
                      <li key={sub._id}>
                        <button
                          type="button"
                          className="aw-tree-subtopic"
                          onClick={() =>
                            onSelectItem?.({ unit, topic, subtopic: sub })
                          }
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
