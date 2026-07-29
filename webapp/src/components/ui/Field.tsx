import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import "./field.css";

/**
 * Champs de formulaire.
 *
 * L'étiquette est toujours liée au champ, et le message d'erreur toujours
 * annoncé : ces deux liens étaient posés au cas par cas dans les formulaires
 * existants, donc parfois oubliés.
 */

interface BaseProps {
  label: string;
  /** Précision affichée sous l'étiquette, avant la saisie. */
  hint?: ReactNode;
  /** Ce qui ne va pas et comment le corriger, jamais un simple « invalide ». */
  error?: string;
  required?: boolean;
}

function Enveloppe({
  label,
  hint,
  error,
  required,
  id,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={`ui-field${error ? " ui-field--erreur" : ""}`}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="ui-field__requis" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p className="ui-field__aide" id={`${id}-aide`}>
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="ui-field__erreur" id={`${id}-erreur`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export function TextField({ label, hint, error, required, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <Enveloppe label={label} hint={hint} error={error} required={required} id={id}>
      <input
        id={id}
        className="ui-field__saisie"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${id}-aide` : null, error ? `${id}-erreur` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        required={required}
        {...rest}
      />
    </Enveloppe>
  );
}

type SelectFieldProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id"> & {
    children: ReactNode;
  };

export function SelectField({
  label,
  hint,
  error,
  required,
  children,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <Enveloppe label={label} hint={hint} error={error} required={required} id={id}>
      <select
        id={id}
        className="ui-field__saisie ui-field__select"
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${id}-aide` : null, error ? `${id}-erreur` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        required={required}
        {...rest}
      >
        {children}
      </select>
    </Enveloppe>
  );
}

type TextAreaFieldProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export function TextAreaField({
  label,
  hint,
  error,
  required,
  rows = 4,
  ...rest
}: TextAreaFieldProps) {
  const id = useId();
  return (
    <Enveloppe label={label} hint={hint} error={error} required={required} id={id}>
      <textarea
        id={id}
        className="ui-field__saisie ui-field__zone"
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [hint ? `${id}-aide` : null, error ? `${id}-erreur` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        required={required}
        {...rest}
      />
    </Enveloppe>
  );
}

/** Met deux champs côte à côte sur écran large, l'un sous l'autre sinon. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="ui-field-row">{children}</div>;
}
