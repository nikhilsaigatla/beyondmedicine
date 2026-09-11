import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type WorldHeatMapPoint = {
  key: string;
  label: string;
  count: number;
  detail?: string;
  x?: number;
  y?: number;
};

type TooltipState = WorldHeatMapPoint & {
  x: number;
  y: number;
  markerX: number;
  markerY: number;
  pinned?: boolean;
};

const countryIsoAliases: Record<string, string[]> = {
  america: ["US", "USA", "United States", "United States of America"],
  australia: ["AU", "AUS"],
  bangladesh: ["BD", "BGD"],
  brazil: ["BR", "BRA"],
  canada: ["CA", "CAN"],
  china: ["CN", "CHN"],
  egypt: ["EG", "EGY"],
  france: ["FR", "FRA"],
  germany: ["DE", "DEU"],
  hungary: ["HU", "HUN"],
  india: ["IN", "IND"],
  indonesia: ["ID", "IDN"],
  italy: ["IT", "ITA"],
  japan: ["JP", "JPN"],
  kenya: ["KE", "KEN"],
  mexico: ["MX", "MEX"],
  netherlands: ["NL", "NLD"],
  nigeria: ["NG", "NGA"],
  pakistan: ["PK", "PAK"],
  philippines: ["PH", "PHL"],
  singapore: ["SG", "SGP"],
  "south africa": ["ZA", "ZAF"],
  "south korea": ["KR", "KOR", "Korea, Republic of"],
  spain: ["ES", "ESP"],
  "u.s.": ["US", "USA", "United States", "United States of America"],
  "u.s.a.": ["US", "USA", "United States", "United States of America"],
  uk: ["GB", "GBR", "United Kingdom", "Great Britain"],
  "united arab emirates": ["AE", "ARE", "UAE"],
  "united kingdom": ["GB", "GBR", "UK", "Great Britain"],
  "united states": ["US", "USA", "United States of America"],
  "united states of america": ["US", "USA", "United States"],
  usa: ["US", "United States", "United States of America"],
  us: ["US", "USA", "United States", "United States of America"],
  vietnam: ["VN", "VNM", "Viet Nam"],
  "viet nam": ["VN", "VNM", "Vietnam"],
};

function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getLookupValues(point: WorldHeatMapPoint) {
  const normalizedKey = normalizeLookup(point.key);
  const normalizedLabel = normalizeLookup(point.label);
  return new Set(
    [
      point.key,
      point.label,
      ...(countryIsoAliases[normalizedKey] ?? []),
      ...(countryIsoAliases[normalizedLabel] ?? []),
    ]
      .filter(Boolean)
      .flatMap((value) => [value, normalizeLookup(value)]),
  );
}

function sanitizeSvg(markup: string) {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const root = doc.documentElement;
  const width = Number.parseFloat(root.getAttribute("width") ?? "");
  const height = Number.parseFloat(root.getAttribute("height") ?? "");

  if (!root.getAttribute("viewBox") && Number.isFinite(width) && Number.isFinite(height)) {
    root.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  root.setAttribute("preserveAspectRatio", "none");
  root.removeAttribute("width");
  root.removeAttribute("height");
  root.setAttribute("focusable", "false");

  doc.querySelectorAll("script, foreignObject").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.toLowerCase();
      if (name.startsWith("on") || value.includes("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return doc.documentElement.outerHTML;
}

function heatColor(count: number, largestCount: number) {
  const intensity = largestCount > 0 ? count / largestCount : 0;
  if (intensity >= 0.75) return "#2DD4BF";
  if (intensity >= 0.45) return "#38BDF8";
  if (intensity >= 0.2) return "#9EC5AB";
  return "#D7F9E9";
}

function getPointerPosition(event: PointerEvent, host: HTMLElement) {
  const rect = host.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  };
}

function getElementPosition(element: Element, host: HTMLElement, fallback: WorldHeatMapPoint) {
  if (fallback.x !== undefined && fallback.y !== undefined) {
    return { x: fallback.x, y: fallback.y };
  }

  const rect = element.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  return {
    x: ((rect.left + rect.width / 2 - hostRect.left) / hostRect.width) * 100,
    y: ((rect.top + rect.height / 2 - hostRect.top) / hostRect.height) * 100,
  };
}

function clampPercent(value: number) {
  return Math.max(12, Math.min(88, value));
}

export function WorldHeatMap({
  points,
  className,
  countLabel = "signup",
  countLabelPlural = "signups",
}: {
  points: WorldHeatMapPoint[];
  className?: string;
  countLabel?: string;
  countLabelPlural?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const largestCount = useMemo(() => Math.max(1, ...points.map((point) => point.count)), [points]);

  useEffect(() => {
    let cancelled = false;
    fetch("/images/world.svg")
      .then((response) => response.text())
      .then((markup) => {
        if (!cancelled) setSvgMarkup(sanitizeSvg(markup));
      })
      .catch(() => {
        if (!cancelled) setSvgMarkup("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && svgMarkup) {
      mapRef.current.innerHTML = svgMarkup;
    }
  }, [svgMarkup]);

  useEffect(() => {
    const host = hostRef.current;
    const map = mapRef.current;
    if (!host || !map || !svgMarkup) return undefined;

    const candidates = [...map.querySelectorAll<SVGElement>("path, polygon, g")];
    for (const element of candidates) {
      if (element.tagName.toLowerCase() === "g") continue;
      element.style.fill = "rgba(158, 197, 171, 0.24)";
      element.style.stroke = "rgba(158, 197, 171, 0.22)";
      element.style.strokeWidth = "0.8";
      element.style.transition =
        "fill 180ms ease, opacity 180ms ease, filter 180ms ease, stroke 180ms ease";
      element.style.filter = "none";
      element.style.cursor = "default";
      element.removeAttribute("tabindex");
      element.removeAttribute("aria-label");
      element.removeAttribute("data-bm-map-region");
    }

    const cleanups: Array<() => void> = [];

    for (const point of points) {
      const aliases = getLookupValues(point);
      const matches = candidates.filter((element) => {
        const title =
          element.querySelector("title")?.textContent ?? element.getAttribute("title") ?? "";
        const values = [
          element.id,
          element.getAttribute("name") ?? "",
          element.getAttribute("data-name") ?? "",
          element.getAttribute("aria-label") ?? "",
          title,
        ].flatMap((value) => [value, normalizeLookup(value)]);
        return values.some((value) => value && aliases.has(value));
      });

      const color = heatColor(point.count, largestCount);
      for (const element of matches) {
        element.style.fill = color;
        element.style.stroke = "rgba(241, 237, 238, 0.92)";
        element.style.strokeWidth = "1.15";
        element.style.filter = `drop-shadow(0 0 7px ${color}99) drop-shadow(0 0 18px ${color}4d)`;
        element.style.cursor = "pointer";
        element.setAttribute("tabindex", "0");
        element.setAttribute("data-bm-map-region", "true");
        element.setAttribute(
          "aria-label",
          `${point.label}: ${point.count} ${point.count === 1 ? countLabel : countLabelPlural}`,
        );

        const showAtPointer = (event: Event) => {
          if ((event as PointerEvent).pointerType === "touch") return;
          const position = getPointerPosition(event as PointerEvent, host);
          setTooltip({
            ...point,
            x: position.x,
            y: position.y,
            markerX: point.x ?? position.x,
            markerY: point.y ?? position.y,
          });
        };
        const showAtElement = () => {
          const position = getElementPosition(element, host, point);
          setTooltip({
            ...point,
            x: position.x,
            y: position.y,
            markerX: point.x ?? position.x,
            markerY: point.y ?? position.y,
          });
        };
        const toggleAtPointer = (event: Event) => {
          event.stopPropagation();
          const position = getPointerPosition(event as PointerEvent, host);
          setTooltip((current) =>
            current?.key === point.key && current.pinned
              ? null
              : {
                  ...point,
                  x: position.x,
                  y: position.y,
                  markerX: point.x ?? position.x,
                  markerY: point.y ?? position.y,
                  pinned: true,
                },
          );
        };
        const hide = () =>
          setTooltip((current) => (current?.key === point.key && !current.pinned ? null : current));

        element.addEventListener("pointerenter", showAtPointer);
        element.addEventListener("pointermove", showAtPointer);
        element.addEventListener("focus", showAtElement);
        element.addEventListener("click", toggleAtPointer);
        element.addEventListener("pointerleave", hide);
        element.addEventListener("blur", hide);
        cleanups.push(() => {
          element.removeEventListener("pointerenter", showAtPointer);
          element.removeEventListener("pointermove", showAtPointer);
          element.removeEventListener("focus", showAtElement);
          element.removeEventListener("click", toggleAtPointer);
          element.removeEventListener("pointerleave", hide);
          element.removeEventListener("blur", hide);
        });
      }
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [countLabel, countLabelPlural, largestCount, points, svgMarkup]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative min-w-0 w-full aspect-[1.95/1] overflow-hidden rounded-2xl border border-border bg-muted",
        className,
      )}
      onClick={(event) => {
        const target = event.target as Element | null;
        if (!target?.closest("[data-bm-map-region='true']")) setTooltip(null);
      }}
    >
      <style>
        {`
          .bm-world-heat-map svg {
            display: block;
            height: 100%;
            width: 100%;
          }

          .bm-world-heat-map path,
          .bm-world-heat-map polygon {
            fill: rgba(158, 197, 171, 0.24);
            stroke: rgba(158, 197, 171, 0.22);
            stroke-width: 0.8;
          }

          .bm-world-heat-map path:focus-visible,
          .bm-world-heat-map polygon:focus-visible {
            outline: 2px solid #2DD4BF;
            outline-offset: 2px;
          }

          @keyframes bm-map-pulse {
            0%, 100% {
              opacity: 0.28;
              transform: scale(0.92);
            }
            50% {
              opacity: 0.56;
              transform: scale(1.08);
            }
          }
        `}
      </style>
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] bg-[radial-gradient(circle_at_28%_38%,rgba(56,189,248,0.16),transparent_27%),radial-gradient(circle_at_68%_48%,rgba(45,212,191,0.13),transparent_30%),linear-gradient(180deg,rgba(16,79,85,0.28),rgba(16,79,85,0.08))]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(158,197,171,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(158,197,171,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-50" />
        {svgMarkup ? (
          <div ref={mapRef} className="bm-world-heat-map absolute inset-0" />
        ) : (
          <img
            src="/images/world.svg"
            alt=""
            className="absolute inset-0 h-full w-full object-fill opacity-80"
            draggable={false}
          />
        )}
      </div>

      {tooltip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${tooltip.markerX}%`, top: `${tooltip.markerY}%` }}
        >
          <span
            className="absolute rounded-full blur-sm"
            style={{
              backgroundColor: heatColor(tooltip.count, largestCount),
              height: 44,
              left: -22,
              opacity: 0.32,
              top: -22,
              width: 44,
            }}
          />
          <span
            className="absolute rounded-full border"
            style={{
              animation: "bm-map-pulse 2.4s ease-in-out infinite",
              borderColor: heatColor(tooltip.count, largestCount),
              height: 52,
              left: -26,
              opacity: 0.5,
              top: -26,
              width: 52,
            }}
          />
          <span
            className="relative grid h-7 w-7 place-items-center rounded-full border-2 border-background text-[10px] font-semibold text-[#062F35] shadow-md"
            style={{
              backgroundColor: heatColor(tooltip.count, largestCount),
              boxShadow: `0 0 22px ${heatColor(tooltip.count, largestCount)}99`,
            }}
          >
            {tooltip.count}
          </span>
        </div>
      )}

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[14rem] -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-left text-xs text-ink shadow-xl backdrop-blur"
          style={{
            left: `${clampPercent(tooltip.x)}%`,
            top: `${clampPercent(tooltip.y + 6)}%`,
          }}
        >
          <span className="block font-medium">{tooltip.label}</span>
          <span className="text-muted-foreground">
            {tooltip.count} {tooltip.count === 1 ? countLabel : countLabelPlural}
          </span>
          {tooltip.detail && (
            <span className="mt-1 block text-muted-foreground">{tooltip.detail}</span>
          )}
        </div>
      )}
    </div>
  );
}
