import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scenario, availableScenarios } from '@/lib/scenarios';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadScenario: (scenario: Scenario) => void;
}

export function ScenarioModal({ isOpen, onClose, onLoadScenario }: ScenarioModalProps) {
  const handleLoadScenario = (scenario: Scenario) => {
    onLoadScenario(scenario);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Scenario</DialogTitle>
          <DialogDescription>
            Choose a scenario to load objects into the scene.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {availableScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-lg">{scenario.title}</h3>
                <p className="text-sm text-gray-600">{scenario.description}</p>
              </div>
              <div className="text-sm text-gray-500">
                Objects: {scenario.objects.map(obj => obj.name).join(', ')}
              </div>
              <Button
                onClick={() => handleLoadScenario(scenario)}
                className="w-full"
              >
                Load Scenario
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 