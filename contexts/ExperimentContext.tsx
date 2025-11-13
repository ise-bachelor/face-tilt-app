import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExperimentCondition, TaskType, ExperimentSession } from '../types';

interface ExperimentContextType {
  session: ExperimentSession | null;
  startSession: (participantId: string, condition: ExperimentCondition, taskName: TaskType) => void;
  endSession: () => void;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

export const ExperimentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ExperimentSession | null>(null);

  const startSession = (participantId: string, condition: ExperimentCondition, taskName: TaskType) => {
    setSession({
      participant_id: participantId,
      condition,
      task_name: taskName,
      start_time: Date.now(),
    });
  };

  const endSession = () => {
    setSession(null);
  };

  return (
    <ExperimentContext.Provider value={{ session, startSession, endSession }}>
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = (): ExperimentContextType => {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within ExperimentProvider');
  }
  return context;
};
