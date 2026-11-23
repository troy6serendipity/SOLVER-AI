import type { JobApplication as PrismaJobApplication } from "@prisma/client";
import type { JobApplication } from "./types";

export function toJobApplication(prismaApp: PrismaJobApplication): JobApplication {
  return {
    id: prismaApp.id,
    company: prismaApp.company,
    position: prismaApp.position,
    status: prismaApp.status as JobApplication["status"],
    interviewTime: prismaApp.interviewDate ? prismaApp.interviewDate.toISOString() : null,
    salary: prismaApp.salary,
    notes: prismaApp.notes,
    createdAt: prismaApp.createdAt.toISOString(),
    updatedAt: prismaApp.updatedAt.toISOString(),
  };
}
