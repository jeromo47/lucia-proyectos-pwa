import Dexie, { Table } from 'dexie';
import type { Project, FieldDefinition, CustomValue } from './types';

class LuciaDB extends Dexie {
  projects!: Table<Project, string>;
  fieldDefs!: Table<FieldDefinition, string>;
  customValues!: Table<CustomValue, string>;

  constructor() {
    super('lucia-proyectos-db');
    this.version(1).stores({
      projects: 'id, startDate, endDate, updatedAt, calendarEventId',
      fieldDefs: 'id, createdAt',
      customValues: 'id, projectId, fieldName'
    });
  }
}

export const db = new LuciaDB();

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('startDate').toArray();
}

export async function upsertProject(p: Project) {
  await db.projects.put(p);
}

export async function deleteProject(id: string) {
  await db.projects.delete(id);
  await db.customValues.where({ projectId: id }).delete();
}
