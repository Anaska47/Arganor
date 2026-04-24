import { Suspense } from "react";
import Script from "next/script";

import TrafficTracker from "@/components/analytics/TrafficTracker";

const pinterestTagId = (process.env.NEXT_PUBLIC_PINTEREST_TAG_ID || "").trim();

export default function SiteAnalytics() {
    return (
        <>
            {pinterestTagId ? (
                <>
                    <Script id="pinterest-tag" strategy="afterInteractive">{`
!function(url){
  if (!window.pintrk) {
    window.pintrk = function () {
      window.pintrk.queue.push(Array.prototype.slice.call(arguments));
    };
    var tracker = window.pintrk;
    tracker.queue = [];
    tracker.version = "3.0";
    var script = document.createElement("script");
    script.async = true;
    script.src = url;
    var firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    }
  }
}("https://s.pinimg.com/ct/core.js");
pintrk("load", "${pinterestTagId}");
                    `}</Script>
                    <noscript>
                        <img
                            alt=""
                            height="1"
                            width="1"
                            style={{ display: "none" }}
                            src={`https://ct.pinterest.com/v3/?event=init&tid=${pinterestTagId}&noscript=1`}
                        />
                    </noscript>
                </>
            ) : null}
            <Suspense fallback={null}>
                <TrafficTracker pinterestTagEnabled={Boolean(pinterestTagId)} />
            </Suspense>
        </>
    );
}
