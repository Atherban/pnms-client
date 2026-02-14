export interface Labour {
  _id: string;
  name: string;
  workType?: string;
  hoursWorked?: number;
  wagePerHour?: number;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabourPayload {
  name: string;
  workType?: string;
  hoursWorked?: number;
  wagePerHour?: number;
  date?: string;
}
