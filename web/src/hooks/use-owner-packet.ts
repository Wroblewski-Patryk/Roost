import { useEffect, useState } from "react";
import { api } from "../api/client";
import { userErrorMessage } from "../api/errors";
import { Translate } from "../i18n/i18n";
import { LoadState } from "../types";

export function useOwnerPacket<T>(path: string, enabled: boolean, t: Translate, refreshKey: string | number = 0): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: enabled ? "loading" : "idle", data: null });

  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ status: "idle", data: null });
      return () => {
        active = false;
      };
    }

    setState({ status: "loading", data: null });
    api<T | { data: T }>(path)
      .then((response) => {
        if (active) {
          const data = response && typeof response === "object" && "data" in response
            ? (response as { data: T }).data
            : response as T;
          setState({ status: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: "error", data: null, error: userErrorMessage(error, t) });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, path, refreshKey, t]);

  return state;
}
