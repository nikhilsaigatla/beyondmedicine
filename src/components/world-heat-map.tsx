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
    [point.key, point.label, ...(countryIsoAliases[normalizedKey] ?? []), ...(countryIsoAliases[normalizedLabel] ?? [])]
      .filter(Boolean)
      .flatMap((value) => [value, normalizeLookup(value)]),
  );
}

function sanitizeSvg(markup: string) {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
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
  if (intensity >= 0.75) return "#104F55";
  if (intensity >= 0.45) return "#32746D";
  if (intensity >= 0.2) return "#3D5467";
  return "#9EC5AB";
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
  return Math.max(5, Math.min(95, value));
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
    const host = hostRef.current;
    if (!host || !svgMarkup) return undefined;

    const candidates = [...host.querySelectorAll<SVGElement>("path, polygon, g")];
    for (const element of candidates) {
      if (element.tagName.toLowerCase() === "g") continue;
      element.style.fill = "#DDE7E0";
      element.style.stroke = "rgba(255, 255, 255, 0.82)";
      element.style.strokeWidth = "0.7";
      element.style.transition = "fill 180ms ease, opacity 180ms ease, filter 180ms ease";
    }

    const cleanups: Array<() => void> = [];

    for (const point of points) {
      const aliases = getLookupValues(point);
      const matches = candidates.filter((element) => {
        const title = element.querySelector("title")?.textContent ?? element.getAttribute("title") ?? "";
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
        element.style.stroke = "rgba(255, 255, 255, 0.95)";
        element.style.strokeWidth = "1";
        element.style.filter = `drop-shadow(0 0 6px ${color}66)`;
        element.style.cursor = "pointer";
        element.setAttribute("tabindex", "0");
        element.setAttribute(
          "aria-label",
          `${point.label}: ${point.count} ${point.count === 1 ? countLabel : countLabelPlural}`,
        );

        const showAtPointer = (event: Event) => {
          const position = getPointerPosition(event as PointerEvent, host);
          setTooltip({ ...point, x: position.x, y: position.y });
        };
        const showAtElement = () => {
          const position = getElementPosition(element, host, point);
          setTooltip({ ...point, x: position.x, y: position.y });
        };
        const hide = () => setTooltip(null);

        element.addEventListener("pointerenter", showAtPointer);
        element.addEventListener("pointermove", showAtPointer);
        element.addEventListener("focus", showAtElement);
        element.addEventListener("pointerleave", hide);
        element.addEventListener("blur", hide);
        cleanups.push(() => {
          element.removeEventListener("pointerenter", showAtPointer);
          element.removeEventListener("pointermove", showAtPointer);
          element.removeEventListener("focus", showAtElement);
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
    <div ref={hostRef} className={cn("relative overflow-hidden rounded-2xl border border-border bg-muted", className)}>
      <style>
        {`
          .bm-world-heat-map svg {
            display: block;
            height: 100%;
            width: 100%;
          }

          .bm-world-heat-map path:focus-visible,
          .bm-world-heat-map polygon:focus-visible {
            outline: 2px solid #32746D;
            outline-offset: 2px;
          }
        `}
      </style>
      {svgMarkup ? (
        <div className="bm-world-heat-map h-full w-full" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      ) : (
        <img src="/images/world.svg" alt="" className="h-full w-full object-contain opacity-80" draggable={false} />
      )}

      {points
        .filter((point) => point.x !== undefined && point.y !== undefined)
        .map((point) => {
          const color = heatColor(point.count, largestCount);
          const size = 16 + Math.round((point.count / largestCount) * 14);
          return (
            <button
              key={point.key}
              type="button"
              aria-label={`${point.label}: ${point.count} ${
                point.count === 1 ? countLabel : countLabelPlural
              }`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onPointerEnter={() => setTooltip({ ...point, x: point.x!, y: point.y! })}
              onFocus={() => setTooltip({ ...point, x: point.x!, y: point.y! })}
              onPointerLeave={() => setTooltip(null)}
              onBlur={() => setTooltip(null)}
            >
              <span
                className="absolute rounded-full opacity-25 blur-sm transition-opacity group-hover:opacity-45 group-focus-visible:opacity-45"
                style={{
                  backgroundColor: color,
                  height: size + 18,
                  left: -9,
                  top: -9,
                  width: size + 18,
                }}
              />
              <span
                className="relative grid place-items-center rounded-full border-2 border-background text-[10px] font-semibold text-white shadow-md transition-transform group-hover:scale-110 group-focus-visible:scale-110"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 ${size}px ${color}66`,
                  height: size,
                  width: size,
                }}
              >
                {point.count}
              </span>
            </button>
          );
        })}

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[14rem] -translate-x-1/2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs text-ink shadow-xl"
          style={{
            left: `${clampPercent(tooltip.x)}%`,
            top: `${clampPercent(tooltip.y + 6)}%`,
          }}
        >
          <span className="block font-medium">{tooltip.label}</span>
          <span className="text-muted-foreground">
            {tooltip.count} {tooltip.count === 1 ? countLabel : countLabelPlural}
          </span>
          {tooltip.detail && <span className="mt-1 block text-muted-foreground">{tooltip.detail}</span>}
        </div>
      )}
    </div>
  );
}
