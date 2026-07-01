export const DISPLAY_NAME_STORAGE_KEY = "yenshia.displayName";
export const DISPLAY_NAME_MAX_LENGTH = 32;

export const cleanDisplayName = (value?: string | string[] | null) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return (rawValue || "").replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
};

export const displayNameQuery = (value: string) => encodeURIComponent(cleanDisplayName(value));
