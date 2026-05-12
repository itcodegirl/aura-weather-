import { useEffect, useRef, useState } from "react";

function readStorageValue(key, defaultValue) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return defaultValue;
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : stored;
  } catch {
    return defaultValue;
  }
}

function writeStorageValue(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage may be unavailable in restricted contexts.
  }
}

export function useLocalStorageState(
  key,
  defaultValue,
  options = {}
) {
  const {
    deserialize = (value) => value,
    serialize = (value) => String(value),
  } = options;

  const [value, setValue] = useState(() => {
    const stored = readStorageValue(key, null);
    if (stored === null) return defaultValue;

    try {
      const deserializeFn = typeof deserialize === "function"
        ? deserialize
        : (rawValue) => rawValue;
      const parsed = deserializeFn(stored);
      return parsed == null ? defaultValue : parsed;
    } catch {
      return defaultValue;
    }
  });

  const hasRunWriteEffectRef = useRef(false);

  useEffect(() => {
    try {
      const serializeFn = typeof serialize === "function"
        ? serialize
        : (rawValue) => String(rawValue);

      // On the first run the state was derived from storage (or is the
      // untouched default). If nothing is persisted under this key yet,
      // don't write the default — that would turn an "the user has not
      // chosen" state into a stored value, masking first-run detection
      // and writing to localStorage for a visitor who never interacted.
      // Real changes (and any legacy-format normalisation when storage
      // *did* have a value) still write through normally.
      if (!hasRunWriteEffectRef.current) {
        hasRunWriteEffectRef.current = true;
        if (readStorageValue(key, null) === null) {
          return;
        }
      }

      writeStorageValue(key, serializeFn(value));
    } catch {
      // localStorage may be unavailable or serialization may fail.
    }
  }, [key, value, serialize]);

  return [value, setValue];
}
