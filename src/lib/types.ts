export type UUID = string;

export type Project = {
  id: UUID;
  title: string;
  desc?: string;
  notes?: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  contractBudget?: number;
  finalBudget?: number;
  calendarEventId?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type FieldDefinition = {
  id: UUID;
  name: string;
  createdAt: string; // ISO
};

export type CustomValue = {
  id: UUID;
  projectId: UUID;
  fieldName: string;
  value: string;
};

export type MonthStats = {
  free: number;
  busy: number;
  overlap: number;
};

export type TabKey = 'current' | 'pending' | 'past';
