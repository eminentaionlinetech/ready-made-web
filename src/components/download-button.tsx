import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDownloadLink } from "@/lib/downloads.functions";

export function DownloadButton({ purchaseId, title }: { purchaseId: string; title: string }) {
  const fetchLink = useServerFn(getDownloadLink);
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const { url } = await fetchLink({ data: { purchaseId } });
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error("Couldn't start the download", {
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" onClick={download} disabled={busy} aria-label={`Download ${title}`}>
      {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Download />} Download
    </Button>
  );
}
