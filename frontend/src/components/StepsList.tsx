import { CheckCircle, Circle, Clock } from "lucide-react";
import type { Step } from "../types";

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  return (
    <div className="bg-transparent border border-zinc-500 rounded-xl shadow-xl p-3 h-full overflow-auto">
      <h2 className="font-semibold mb-4 text-gray-100">Build Steps</h2>
      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-1 rounded-lg cursor-pointer transition-colors ${
              currentStep === step.id
                ? "bg-zinc-800 border border-zinc-700"
                : "hover:bg-zinc-800"
            }`}
            onClick={() => onStepClick(step.id)}
          >
            <div className="flex items-center gap-2">
              {step.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : step.status === "in-progress" ? (
                <Clock className="w-5 h-5 text-blue-400" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600" />
              )}
              <h2 className="font-medium text-gray-100">{step.title}</h2>
            </div>
            <p className="text-sm text-gray-400 mt-2">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
