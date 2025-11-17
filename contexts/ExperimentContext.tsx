import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExperimentCondition, TaskType, ExperimentSession, ParticipantInfo } from '../types';

interface ExperimentContextType {
  session: ExperimentSession | null;
  participantInfo: ParticipantInfo | null;
  setParticipantInfo: (info: ParticipantInfo) => void;
  startSession: (participantId: string, condition: ExperimentCondition, taskName: TaskType) => void;
  endSession: () => void;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

export const ExperimentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);

  const startSession = (participantId: string, condition: ExperimentCondition, taskName: TaskType) => {
    setSession({
      participant_id: participantId,
      condition,
      task_name: taskName,
      start_time: Date.now(),
      participantInfo: participantInfo || undefined,
    });
  };

  const endSession = () => {
    setSession(null);
  };

  return (
    <ExperimentContext.Provider value={{ session, participantInfo, setParticipantInfo, startSession, endSession }}>
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
