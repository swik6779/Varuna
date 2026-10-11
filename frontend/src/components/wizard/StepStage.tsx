import React, { useEffect, useRef } from "react";
import type { WizardStepId } from "./types";

export interface StepStageProps {
  stepId: WizardStepId;
  title: string;
  subtitle: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function StepStage({
  stepId,
  title,
  subtitle,
  actionButton,
  children,
  className = "",
}: StepStageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Shift focus to the stage heading when step changes for accessibility
    headingRef.current?.focus();
  }, [stepId]);

  return (
    <section
      className={`wizard-stage-section ${className}`}
      aria-labelledby={`stage-heading-${stepId}`}
    >
      <header className="stage-header">
        <div className="stage-title-block">
          <h2
            ref={headingRef}
            id={`stage-heading-${stepId}`}
            tabIndex={-1}
            className="stage-heading"
          >
            {title}
          </h2>
          <p className="stage-subtitle muted">{subtitle}</p>
        </div>

        {actionButton && <div className="stage-action-slot">{actionButton}</div>}
      </header>

      <div className="stage-content-body">{children}</div>
    </section>
  );
}
