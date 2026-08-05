import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import styles from "./checklist.module.css";

interface FilePickerProps {
  files: File[];
  hint: string;
  label: string;
  name: string;
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
}

export function FilePicker({ files, hint, label, name, onChange, onError }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const imageFiles = Array.from(selected).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== selected.length) onError("이미지 파일만 선택할 수 있습니다.");
    if (imageFiles.length > 10) onError("파일은 각각 최대 10개까지 선택할 수 있습니다.");
    onChange(imageFiles.slice(0, 10));
  };

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      <div className={styles.fileBox}>
        <input accept="image/*" id={name} multiple name={name} onChange={(event) => selectFiles(event.target.files)} ref={inputRef} type="file" />
        <button onClick={() => inputRef.current?.click()} type="button"><ImagePlus aria-hidden="true" /> 이미지 선택</button>
        <p>{files.length ? `${files.length}개 선택됨 (최대 10개)` : hint}</p>
        {files.length > 0 && (
          <ul className={styles.fileList}>
            {files.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}><span>{file.name}</span><button aria-label={`${file.name} 삭제`} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} type="button"><X /></button></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
