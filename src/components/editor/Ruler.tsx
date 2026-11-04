const INCHES = [1, 2, 3, 4, 5, 6, 7, 8];

export function Ruler() {
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-margin ruler-margin-left" />
      <div className="ruler-margin ruler-margin-right" />
      {INCHES.map((inch) => (
        <span key={inch} className="ruler-label" style={{ left: `${inch}in` }}>
          {inch}
        </span>
      ))}
    </div>
  );
}
