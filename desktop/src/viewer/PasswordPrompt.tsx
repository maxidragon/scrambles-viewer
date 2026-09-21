import { useEffect, useRef, useState } from "react";

interface Props {
  setName: string;
  wrongPassword: boolean;
  onSubmit(password: string): void;
  onCancel(): void;
}

export function PasswordPrompt({ setName, wrongPassword, onSubmit, onCancel }: Props): React.JSX.Element {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [wrongPassword]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value !== "") onSubmit(value);
  };

  return (
    <div className="prompt-backdrop" onClick={onCancel}>
      <form
        className="prompt-card"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onCancel();
          }
        }}
      >
        <h2 className="prompt-title">PDF password</h2>
        <div className="prompt-set">{setName}</div>
        {wrongPassword && (
          <div className="prompt-error" role="alert">
            Incorrect password — try again
          </div>
        )}
        <div className="prompt-row">
          <input
            ref={inputRef}
            // A plain masked field: desktop webviews have no keyboard that learns
            // passcodes as words, which is what mobile's hand-rolled masking works around.
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Password"
            aria-invalid={wrongPassword}
          />
          <button type="button" className="btn btn-quiet" onClick={() => setVisible((v) => !v)}>
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        <div className="prompt-actions">
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={value === ""}>
            Open
          </button>
        </div>
      </form>
    </div>
  );
}
