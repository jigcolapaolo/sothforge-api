export type OrganizationResponse = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMemberResponse = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
};
