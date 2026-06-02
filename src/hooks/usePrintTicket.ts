"use client";

import { useState } from "react";

export function usePrintTicket() {
  const [printing, setPrinting] = useState(false);

  const printTicket = async (orderId: string) => {
    setPrinting(true);
    try {
      // Ouvre le ticket dans une iframe invisible pour imprimer silencieusement
      const iframeId = "print-iframe-pos";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement;

      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.position = "absolute";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      iframe.src = `/api/orders/${orderId}/ticket`;
      
      // Attendre le chargement et le déclenchement du print
      await new Promise<void>((resolve) => {
        iframe.onload = () => {
          resolve();
        };
      });

    } catch (err) {
      console.error("[Printing] Failed to print:", err);
    } finally {
      setPrinting(false);
    }
  };

  return { printTicket, printing };
}
