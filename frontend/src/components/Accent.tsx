import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function Accent({ kind, value }: { kind: string; value: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const context = gsap.context(() => {
      gsap.fromTo(
        ".metric-cube",
        { opacity: 0, scale: 0.65, y: 14 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.58,
          stagger: 0.1,
          ease: "back.out(1.5)",
        },
      );
      gsap.to(".metric-sculpture", {
        y: -3,
        rotation: 1.2,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.5,
      });
    }, root);
    return () => context.revert();
  }, [kind, value]);

  return (
    <div ref={root} className={`accent accent-${kind}`} aria-hidden="true">
      <div className="metric-sculpture">
        <i className="metric-cube cube-one"><span /></i>
        <i className="metric-cube cube-two"><span /></i>
        <i className="metric-cube cube-three"><span /></i>
      </div>
    </div>
  );
}
