export function Card({ title, footer, children }) {
  return (
    <div className="prep-card">
      {title && <div className="prep-card__title">{title}</div>}
      <div>{children}</div>
      {footer && <div className="prep-card__footer">{footer}</div>}
    </div>
  );
}
