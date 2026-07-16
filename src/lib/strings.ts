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
    loginTitle: "התחברות",
    loginDevOnly: "מסך פיתוח בלבד — בייצור ההתחברות מתבצעת דרך Cloudflare Access.",
    loginEmailLabel: "כתובת אימייל",
    loginSubmit: "התחברות",
  },
  bmi: {
    disclaimer:
      "המידע המוצג הוא הערכה כללית בלבד ואינו מהווה ייעוץ רפואי. BMI הוא כלי סקר אוכלוסייתי ואינו מודד הרכב גוף.",
  },
  today: {
    title: "היום",
    calories: "קלוריות",
    protein: "חלבון",
    carbs: "פחמימות",
    fat: "שומן",
    remaining: "נותרו",
    noTarget: "לא הוגדר יעד — עברו למסך הפרופיל כדי להגדיר יעד יומי.",
    noEntries: "לא נרשמו פריטים ביום זה.",
    addFood: "הוספת מאכל",
    today: "היום",
    previousDay: "יום קודם",
    nextDay: "יום הבא",
    delete: "מחיקה",
  },
  mealTypes: {
    breakfast: "ארוחת בוקר",
    lunch: "צהריים",
    dinner: "ערב",
    snack: "נשנוש",
  },
  addFood: {
    title: "הוספת מאכל",
    searchPlaceholder: "חיפוש מוצר...",
    quantityLabel: "כמות (גרם)",
    mealLabel: "ארוחה",
    noResults: "לא נמצאו תוצאות",
    submit: "הוספה",
  },
} as const;

export type Strings = typeof strings;
