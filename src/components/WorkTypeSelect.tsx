import { WORK_TYPE_OPTIONS } from "../lib/workTypes";

type Props = {
  selected: string[];
  custom: string;
  customEnabled: boolean;
  onChange: (next: {
    selected: string[];
    custom: string;
    customEnabled: boolean;
  }) => void;
};

export function WorkTypeSelect({
  selected,
  custom,
  customEnabled,
  onChange,
}: Props) {
  function toggle(option: string) {
    const has = selected.includes(option);
    onChange({
      selected: has
        ? selected.filter((x) => x !== option)
        : [...selected, option],
      custom,
      customEnabled,
    });
  }

  function toggleCustom() {
    onChange({
      selected,
      custom,
      customEnabled: !customEnabled,
    });
  }

  return (
    <div className="field" style={{ gridColumn: "1 / -1" }}>
      <span style={{ fontWeight: 600, color: "var(--green-deep)" }}>
        Type of working
      </span>
      <p className="meta" style={{ margin: "0.25rem 0 0.65rem" }}>
        Select one or more
      </p>
      <div className="chip-grid">
        {WORK_TYPE_OPTIONS.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`chip ${active ? "chip--active" : ""}`}
              onClick={() => toggle(option)}
              aria-pressed={active}
            >
              {option}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip ${customEnabled ? "chip--active" : ""}`}
          onClick={toggleCustom}
          aria-pressed={customEnabled}
        >
          Customise
        </button>
      </div>
      {customEnabled && (
        <label className="field" style={{ marginTop: "0.75rem" }}>
          Custom type
          <input
            type="text"
            placeholder="Write custom work type"
            value={custom}
            onChange={(e) =>
              onChange({
                selected,
                custom: e.target.value,
                customEnabled: true,
              })
            }
          />
        </label>
      )}
    </div>
  );
}
