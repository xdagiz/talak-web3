import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseRealtimeSubscriptionOptions {
  table: string;
  /** Filter the realtime payload: return false to ignore an incoming row. */
  filter?: (record: Record<string, unknown>) => boolean;
  onEvent: (record: Record<string, unknown>) => void;
  enabled?: boolean;
}

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export function useRealtimeSubscription({
  table,
  filter,
  onEvent,
  enabled = true,
}: UseRealtimeSubscriptionOptions): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onEventRef = useRef(onEvent);
  const filterRef = useRef(filter);
  onEventRef.current = onEvent;
  filterRef.current = filter;

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }
    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table },
        (payload) => {
          const record = payload.new as Record<string, unknown>;
          if (filterRef.current && !filterRef.current(record)) return;
          onEventRef.current(record);
        }
      )
      .subscribe((statusCode) => {
        setStatus(statusCode === "SUBSCRIBED" ? "connected" : "disconnected");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, enabled]);

  return status;
}
