export type TaskResponse = {
  id: string;
  boardId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  estimatedHours: number | null;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
};

export type TaskListResponse = {
  data: TaskResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
