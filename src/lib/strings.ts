export const strings = {
  common: {
    appName: "יומן תזונה",
    save: "שמירה",
    cancel: "ביטול",
    loading: "טוען...",
  },
  auth: {
    unauthorized: "יש להתחבר כדי להמשיך",
    forbidden: "אין לך הרשאה לגשת לאפליקציה זו",
  },
} as const;

export type Strings = typeof strings;
