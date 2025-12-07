// client/src/answerWriting/components/UnitTopicTree.jsx
import React from "react";
import "../answerWriting.css";

export default function UnitTopicTree({
  data = [],
  onSelectItem,
  onEditUnit,
  onDeleteUnit,
  onEditTopic,
  onDeleteTopic,
  onEditSubtopic,
  onDeleteSubtopic,
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="aw-card">
        <p className="aw-muted">No units yet. Create a unit to get started.</p>
      </div>
    );
  }

  const stop = (e) => e.stopPropagation();

  return (
    <div className="aw-card">
      <div className="aw-card-title">Syllabus Tree</div>
      <ul className="aw-tree">
        {data.map((unit) => (
          <li key={unit._id}>
            <div className="aw-tree-row">
              <button
                type="button"
                className="aw-tree-unit"
                onClick={() => onSelectItem?.({ unit })}
              >
                {unit.name}
              </button>

              <div className="aw-tree-actions">
                <button
                  type="button"
                  className="aw-icon-btn"
                  onClick={(e) => {
                    stop(e);
                    onEditUnit?.(unit);
                  }}
                  title="Edit unit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="aw-icon-btn aw-icon-danger"
                  onClick={(e) => {
                    stop(e);
                    onDeleteUnit?.(unit);
                  }}
                  title="Delete unit"
                >
                  🗑️
                </button>
              </div>
            </div>

            <ul>
              {(unit.topics || []).map((topic) => {
                const hasQuestions = (topic.subtopics || []).some(
                  (s) => (s.questions || []).length > 0
                );

                return (
                  <li key={topic._id}>
                    <div className="aw-tree-row">
                      <button
                        type="button"
                        className={`aw-tree-topic ${
                          topic.locked ? "aw-topic-locked" : ""
                        } ${hasQuestions ? "aw-topic-has-q" : ""}`}
                        onClick={() => onSelectItem?.({ unit, topic })}
                      >
                        {topic.name}
                      </button>

                      <div className="aw-tree-actions">
                        <button
                          type="button"
                          className="aw-icon-btn"
                          onClick={(e) => {
                            stop(e);
                            onEditTopic?.(unit, topic);
                          }}
                          title="Edit topic"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="aw-icon-btn aw-icon-danger"
                          onClick={(e) => {
                            stop(e);
                            onDeleteTopic?.(unit, topic);
                          }}
                          title="Delete topic"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <ul>
                      {(topic.subtopics || []).map((sub) => (
                        <li key={sub._id}>
                          <div className="aw-tree-row">
                            <button
                              type="button"
                              className="aw-tree-subtopic"
                              onClick={() =>
                                onSelectItem?.({ unit, topic, subtopic: sub })
                              }
                            >
                              {sub.name}
                            </button>

                            <div className="aw-tree-actions">
                              <button
                                type="button"
                                className="aw-icon-btn"
                                onClick={(e) => {
                                  stop(e);
                                  onEditSubtopic?.(unit, topic, sub);
                                }}
                                title="Edit subtopic"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="aw-icon-btn aw-icon-danger"
                                onClick={(e) => {
                                  stop(e);
                                  onDeleteSubtopic?.(unit, topic, sub);
                                }}
                                title="Delete subtopic"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
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
