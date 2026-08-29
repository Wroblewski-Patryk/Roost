import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { CcIconPicker, departmentIconOptions } from "./cc-icon-picker";

export type IdentityValue = string | null | undefined;
export type IdentityMode = "initials" | "icon" | "image";

const DEFAULT_ICON = "ph-user";
const MAX_IMAGE_BYTES = 640 * 1024;

export const identityIconOptions = [
  { value: "ph-user", label: "Person", keywords: "profile account human" },
  { value: "ph-robot", label: "Agent", keywords: "ai automation assistant" },
  { value: "ph-user-circle", label: "Profile", keywords: "account identity" },
  { value: "ph-bird", label: "Bird", keywords: "roost brand" },
  ...departmentIconOptions
].filter((option, index, options) => options.findIndex((candidate) => candidate.value === option.value) === index);

export function identityMode(value: IdentityValue): IdentityMode {
  if (value?.startsWith("data:image/")) return "image";
  if (value?.startsWith("icon:")) return "icon";
  return "initials";
}

export function initialsForName(name: string | null | undefined) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2) || "?").toLocaleUpperCase();
}

export function CcIdentityMark({ value, name, className = "" }: { value?: IdentityValue; name?: string | null; className?: string }) {
  if (value?.startsWith("data:image/")) {
    return <span className={`cc-identity-mark ${className}`}><img alt="" src={value} /></span>;
  }
  if (value?.startsWith("icon:")) {
    return <span className={`cc-identity-mark ${className}`} aria-hidden="true"><i className={`ph-bold ${value.slice(5)}`}></i></span>;
  }
  return <span className={`cc-identity-mark ${className}`} aria-hidden="true">{initialsForName(name)}</span>;
}

type IdentityLabels = {
  initials: string;
  icon: string;
  image: string;
  chooseFile: string;
  replaceFile: string;
  removeFile: string;
  imageHint: string;
  imageTooLarge: string;
  imageInvalid: string;
  searchIcons: string;
};

export function CcIdentityPicker({
  value,
  name,
  previewName,
  onChange,
  labels
}: {
  value?: IdentityValue;
  name?: string;
  previewName?: string | null;
  onChange: (value: string | null) => void;
  labels: IdentityLabels;
}) {
  const groupName = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<IdentityMode>(() => identityMode(value));
  const [icon, setIcon] = useState(() => value?.startsWith("icon:") ? value.slice(5) : DEFAULT_ICON);
  const [image, setImage] = useState(() => value?.startsWith("data:image/") ? value : "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!value) return;
    const nextMode = identityMode(value);
    setMode(nextMode);
    if (nextMode === "icon") setIcon(value.slice(5));
    if (nextMode === "image") setImage(value);
  }, [value]);

  function selectMode(nextMode: IdentityMode) {
    setMode(nextMode);
    setError("");
    if (nextMode === "initials") onChange("initials");
    if (nextMode === "icon") onChange(`icon:${icon}`);
    if (nextMode === "image") onChange(image || null);
  }

  function selectIcon(nextIcon: string) {
    setIcon(nextIcon);
    onChange(`icon:${nextIcon}`);
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      setError(labels.imageInvalid);
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(labels.imageTooLarge);
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextImage = typeof reader.result === "string" ? reader.result : "";
      setImage(nextImage);
      setError("");
      onChange(nextImage || null);
    };
    reader.onerror = () => setError(labels.imageInvalid);
    reader.readAsDataURL(file);
  }

  const previewValue = mode === "image" ? image : mode === "icon" ? `icon:${icon}` : "initials";

  return (
    <div className="cc-identity-picker">
      {name ? <input name={name} type="hidden" value={value || "initials"} /> : null}
      <CcIdentityMark className="cc-identity-picker-preview" name={previewName} value={previewValue} />
      <div className="cc-identity-picker-controls">
        <div className="cc-identity-mode" role="radiogroup">
          {(["initials", "icon", "image"] as const).map((option) => (
            <label className={mode === option ? "is-active" : ""} key={option}>
              <input checked={mode === option} name={groupName} onChange={() => selectMode(option)} type="radio" />
              <i className={`ph-bold ${option === "initials" ? "ph-text-aa" : option === "icon" ? "ph-smiley" : "ph-image"}`} aria-hidden="true"></i>
              <span>{labels[option]}</span>
            </label>
          ))}
        </div>
        {mode === "icon" ? <CcIconPicker onChange={selectIcon} options={identityIconOptions} searchPlaceholder={labels.searchIcons} value={icon} /> : null}
        {mode === "image" ? (
          <div className="cc-identity-upload">
            <input accept="image/png,image/jpeg,image/webp" className="sr-only" id={fileId} onChange={uploadImage} ref={fileRef} type="file" />
            <label className="btn btn-outline btn-sm" htmlFor={fileId}><i className="ph-bold ph-upload-simple" aria-hidden="true"></i>{image ? labels.replaceFile : labels.chooseFile}</label>
            {image ? <button className="btn btn-ghost btn-sm" onClick={() => { setImage(""); setMode("initials"); onChange("initials"); if (fileRef.current) fileRef.current.value = ""; }} type="button"><i className="ph-bold ph-trash" aria-hidden="true"></i>{labels.removeFile}</button> : null}
            <small>{labels.imageHint}</small>
          </div>
        ) : null}
        {error ? <p className="text-sm font-semibold text-error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
