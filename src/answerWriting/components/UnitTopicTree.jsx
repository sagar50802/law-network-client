// src/answerWriting/components/UnitTopicTree.jsx
import React from "react";
import "../answerWriting.css";

export default function UnitTopicTree({ data, onSelectItem }) {
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
          <li key={unit._id || unit.id}>
            <button
              type="button"
              className="aw-tree-unit"
              onClick={() => onSelectItem?.({ unit })}
            >
              {unit.name}
            </button>

            <ul>
              {(unit.topics || []).map((topic) => {
                const hasQuestions = (topic.subtopics || []).some(
                  (s) => (s.questions || []).length > 0
                );

                return (
                  <li key={topic._id || topic.id}>
                    <button
                      type="button"
                      className={`aw-tree-topic ${
                        topic.locked ? "aw-topic-locked" : ""
                      } ${hasQuestions ? "aw-topic-has-q" : ""}`}
                      onClick={() => onSelectItem?.({ unit, topic })}
                    >
                      {topic.name}
                    </button>

                    <ul>
                      {(topic.subtopics || []).map((sub) => (
                        <li key={sub._id || sub.id}>
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
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
