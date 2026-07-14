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
  bmi: {
    disclaimer:
      "המידע המוצג הוא הערכה כללית בלבד ואינו מהווה ייעוץ רפואי. BMI הוא כלי סקר אוכלוסייתי ואינו מודד הרכב גוף.",
  },
} as const;

export type Strings = typeof strings;
