import React from "react";

export default function UnitTopicTree({
  data,
  onSelectItem,
  highlightScheduled = true,
  showLocks = true,
}) {
  return (
    <div className="aw-card aw-tree-card">
      <div className="aw-card-title">Syllabus Overview</div>
      <div className="aw-tree">
        {data?.map((unit) => (
          <div key={unit.id} className="aw-tree-unit">
            <div className="aw-tree-unit-header">
              <span className="aw-tree-unit-dot" />
              <span>{unit.name}</span>
              {unit.locked && showLocks && (
                <span className="aw-badge aw-badge-lock">Locked</span>
              )}
            </div>

            {unit.topics?.map((topic) => {
              const scheduled = topic.hasScheduledQuestions;
              const topicClasses = [
                "aw-tree-topic-row",
                topic.locked && showLocks ? "aw-locked" : "",
                scheduled && highlightScheduled ? "aw-scheduled" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={topic.id} className={topicClasses}>
                  <button
                    type="button"
                    onClick={() => onSelectItem?.(topic)}
                    className="aw-tree-topic-main"
                  >
                    <span className="aw-tree-topic-bullet" />
                    <span>{topic.name}</span>
                    {scheduled && (
                      <span className="aw-badge aw-badge-scheduled">
                        Scheduled
                      </span>
                    )}
                    {topic.locked && showLocks && (
                      <span className="aw-badge aw-badge-lock-icon">🔒</span>
                    )}
                  </button>

                  {topic.subtopics?.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onSelectItem?.(sub)}
                      className="aw-tree-subtopic"
                    >
                      <span className="aw-tree-subtopic-bullet" />
                      <span>{sub.name}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
