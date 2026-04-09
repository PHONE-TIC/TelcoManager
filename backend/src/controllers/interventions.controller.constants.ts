export const interventionNotificationRelationSelect = {
  nom: true,
} as const;

export const interventionCreateReturnInclude = {
  client: {
    select: interventionNotificationRelationSelect,
  },
  technicien: {
    select: interventionNotificationRelationSelect,
  },
} as const;

export const interventionClosedStatuses = ["terminee", "annulee"] as const;
