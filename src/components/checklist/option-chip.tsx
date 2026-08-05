import type { ChecklistOption } from "@/types/checklist";
import styles from "./checklist.module.css";

interface OptionChipProps {
  checked: boolean;
  name: string;
  option: ChecklistOption;
  type: "radio" | "checkbox";
  onChange: (value: string, checked: boolean) => void;
}

export function OptionChip({ checked, name, option, type, onChange }: OptionChipProps) {
  return (
    <label className={`${styles.optionChip}${checked ? ` ${styles.optionChipChecked}` : ""}`}>
      <input checked={checked} name={name} onChange={(event) => onChange(option.value, event.target.checked)} type={type} value={option.value} />
      <span>{option.label}</span>
    </label>
  );
}
