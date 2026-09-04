import { Prisma } from 'src/generated/prisma/client';

export const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
} satisfies Prisma.CommentSelect;
