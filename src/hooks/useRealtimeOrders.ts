"use client";

import { useEffect, useState } from "react";
import type { OrderData } from "@/lib/orderService";

export function useRealtimeOrders(restaurantId: string = "default") {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 1. Initial fetch
    fetch(`/api/orders?restaurantId=${restaurantId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 2. Connect to real-time events SSE
    const es = new EventSource(`/api/tables/events?restaurantId=${restaurantId}`);

    es.onopen = () => {
      setConnected(true);
    };

    es.onerror = () => {
      setConnected(false);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === "ORDER_CREATED") {
          setOrders((prev) => [data.order, ...prev]);
        } else if (data.event === "ORDER_STATUS_UPDATED") {
          setOrders((prev) =>
            prev.map((o) => (o.id === data.order.id ? data.order : o))
          );
        }
      } catch { /* parse error skip */ }
    };

    return () => {
      es.close();
    };
  }, [restaurantId]);

  return { orders, setOrders, loading, connected };
}
