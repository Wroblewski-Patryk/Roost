import { useEffect, useState } from "react";
import { api } from "../api/client";
import { userErrorMessage } from "../api/errors";
import { Translate } from "../i18n/i18n";
import { LoadState } from "../types";

export function useOwnerPacket<T>(path: string, enabled: boolean, t: Translate): LoadState<T> {
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
    api<T>(path)
      .then((data) => {
        if (active) {
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
  }, [enabled, path, t]);

  return state;
}
