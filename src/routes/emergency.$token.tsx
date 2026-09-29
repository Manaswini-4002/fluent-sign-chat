import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const EmergencyMap = lazy(() => import("@/components/EmergencyMap"));

export const Route = createFileRoute("/emergency/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Emergency alert — SignBridge AI" },
      { name: "description", content: "Live emergency alert details shared from SignBridge AI." },
      { property: "og:title", content: "Emergency alert — SignBridge AI" },
      { property: "og:description", content: "Location, timestamp and accuracy for a SignBridge AI emergency alert." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SharedEmergency,
});

function SharedEmergency() {
  const { token } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["shared-emergency", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_events")
        .select("created_at, trigger_type, gesture, latitude, longitude, accuracy_m, location_error, message, resolved")
        .eq("share_token", token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen aurora px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="surface border-destructive/50 p-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-destructive">
            <AlertTriangle className="h-6 w-6" /> Emergency alert
          </h1>

          {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading alert…</p>}
          {error && <p className="mt-4 text-sm text-destructive">This alert could not be loaded.</p>}
          {!isLoading && !error && !data && (
            <p className="mt-4 text-sm text-muted-foreground">This alert link is not valid or has been removed.</p>
          )}

          {data && (
            <>
              <p className="mt-4 text-lg">{data.message}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Raised at</dt>
                  <dd>{new Date(data.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{data.resolved ? "Marked resolved" : "Active"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Triggered by</dt>
                  <dd>{data.trigger_type === "manual" ? "Manual alert" : `Gesture: ${data.gesture ?? "Unknown"}`}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">GPS accuracy</dt>
                  <dd>{data.accuracy_m ? `±${Math.round(data.accuracy_m)} m` : "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Coordinates</dt>
                  <dd>
                    {data.latitude
                      ? `${data.latitude.toFixed(5)}, ${data.longitude!.toFixed(5)}`
                      : (data.location_error ?? "Location was not available")}
                  </dd>
                </div>
              </dl>

              {data.latitude && data.longitude && (
                <div className="mt-5">
                  <ClientOnly fallback={<div className="h-72 rounded-2xl border border-border" />}>
                    <Suspense fallback={<div className="h-72 rounded-2xl border border-border" />}>
                      <EmergencyMap lat={data.latitude} lng={data.longitude} accuracy={data.accuracy_m} />
                    </Suspense>
                  </ClientOnly>
                  <a
                    className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
                    href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=17/${data.latitude}/${data.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in OpenStreetMap
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
