import type { Checklist, Field } from "./types";

export type Template = Pick<Checklist, "title_en" | "title_ar" | "icon" | "color" | "range_note" | "orientation"> & {
  name: string;
  fields: Field[];
};

const num = (key: string, label_en: string, label_ar: string, unit: string, min: number | null, max: number | null): Field => ({
  key,
  label_en,
  label_ar,
  type: "number",
  unit,
  min,
  max,
  required: true,
});
const yes = (key: string, label_en: string, label_ar: string): Field => ({ key, label_en, label_ar, type: "yesno", required: true });

/** Ready-made forms the admin can start from. Ranges are common defaults; check them against hospital policy. */
export const TEMPLATES: Template[] = [
  {
    name: "Medication refrigerator",
    title_en: "Daily Temperature Check for Medication Refrigerator",
    title_ar: "التحقق اليومي من درجة حرارة ثلاجة الأدوية",
    icon: "Refrigerator",
    color: "#3AC0C3",
    fields: [num("temperature", "Temperature", "الحرارة", "°C", 2, 8)],
    range_note: "NORMAL RANGE: 2°C TO 8°C",
    orientation: "landscape",
  },
  {
    name: "Freezer",
    title_en: "Daily Temperature Check for Freezer",
    title_ar: "التحقق اليومي من درجة حرارة الفريزر",
    icon: "Snowflake",
    color: "#2BAAE2",
    fields: [num("temperature", "Temperature", "الحرارة", "°C", -25, -15)],
    range_note: "NORMAL RANGE: -25°C TO -15°C",
    orientation: "landscape",
  },
  {
    name: "Room temperature & humidity",
    title_en: "Daily Temperature and Humidity Check for Medication Room",
    title_ar: "التحقق اليومي من درجة الحرارة والرطوبة لغرفة الأدوية",
    icon: "Thermometer",
    color: "#1691D0",
    fields: [num("temperature", "Temperature", "درجة الحرارة", "°C", 15, 25), num("humidity", "Humidity", "الرطوبة", "%", 0, 60)],
    range_note: "NORMAL RANGE: TEMPERATURE 15°C TO 25°C / RELATIVE HUMIDITY UP TO 60%",
    orientation: "portrait",
  },
  {
    name: "Crash cart",
    title_en: "Daily Crash Cart Check",
    title_ar: "التحقق اليومي من عربة الطوارئ",
    icon: "HeartPulse",
    color: "#E0475B",
    fields: [
      yes("sealed", "Cart sealed", "العربة مقفلة"),
      { key: "seal_no", label_en: "Seal number", label_ar: "رقم القفل", type: "text", required: true },
      yes("defib_ok", "Defibrillator OK", "جهاز الصدمات سليم"),
      yes("suction_ok", "Suction working", "الشفط يعمل"),
      yes("oxygen_ok", "Oxygen full", "الأكسجين ممتلئ"),
    ],
    range_note: "Report any “No” to the charge nurse immediately.",
    orientation: "landscape",
  },
  {
    name: "Defibrillator",
    title_en: "Daily Defibrillator Check",
    title_ar: "التحقق اليومي من جهاز الصدمات الكهربائية",
    icon: "Zap",
    color: "#E9A23B",
    fields: [
      yes("battery", "Battery charged", "البطارية مشحونة"),
      yes("self_test", "Self-test passed", "نجح الفحص الذاتي"),
      yes("pads", "Pads in date", "اللصقات صالحة"),
      yes("paper", "Paper available", "الورق متوفر"),
    ],
    range_note: "",
    orientation: "portrait",
  },
  {
    name: "Oxygen cylinder",
    title_en: "Daily Oxygen Cylinder Check",
    title_ar: "التحقق اليومي من أسطوانة الأكسجين",
    icon: "Cylinder",
    color: "#04A67A",
    fields: [
      num("pressure", "Pressure", "الضغط", "psi", 500, null),
      yes("regulator", "Regulator working", "المنظم يعمل"),
      yes("secured", "Cylinder secured", "الأسطوانة مثبتة"),
    ],
    range_note: "Replace the cylinder when pressure is below 500 psi.",
    orientation: "portrait",
  },
  {
    name: "Glucometer quality control",
    title_en: "Glucometer Quality Control",
    title_ar: "ضبط جودة جهاز قياس السكر",
    icon: "Droplet",
    color: "#7A5AF8",
    fields: [
      num("low_control", "Low control", "المحلول المنخفض", "mg/dL", null, null),
      num("high_control", "High control", "المحلول المرتفع", "mg/dL", null, null),
      yes("strips", "Strips in date", "الشرائط صالحة"),
    ],
    range_note: "Compare results with the control range printed on the strip vial.",
    orientation: "portrait",
  },
  {
    name: "Cleaning & disinfection",
    title_en: "Daily Cleaning and Disinfection Log",
    title_ar: "سجل التنظيف والتطهير اليومي",
    icon: "SprayCan",
    color: "#51938B",
    fields: [
      { key: "area", label_en: "Area", label_ar: "المنطقة", type: "text", required: true },
      {
        key: "disinfectant",
        label_en: "Disinfectant",
        label_ar: "المطهر",
        type: "select",
        options: ["Alcohol 70%", "Chlorine 1000 ppm", "Quaternary ammonium"],
        required: true,
      },
      yes("surfaces", "Surfaces disinfected", "تم تطهير الأسطح"),
      yes("waste", "Waste bins emptied", "تم تفريغ النفايات"),
    ],
    range_note: "",
    orientation: "landscape",
  },
  {
    name: "Hand hygiene supplies",
    title_en: "Daily Hand Hygiene Supplies Check",
    title_ar: "التحقق اليومي من مستلزمات نظافة الأيدي",
    icon: "Hand",
    color: "#9ECC3B",
    fields: [
      yes("hand_rub", "Hand rub available", "معقم الأيدي متوفر"),
      yes("soap", "Soap available", "الصابون متوفر"),
      yes("towels", "Paper towels available", "المناديل متوفرة"),
    ],
    range_note: "",
    orientation: "portrait",
  },
  {
    name: "Fire extinguisher",
    title_en: "Fire Extinguisher Check",
    title_ar: "التحقق من طفاية الحريق",
    icon: "Flame",
    color: "#E0475B",
    fields: [
      yes("gauge", "Gauge in green", "المؤشر في المنطقة الخضراء"),
      yes("pin", "Pin and seal intact", "المسمار والختم سليمان"),
      yes("damage", "No visible damage", "لا يوجد تلف ظاهر"),
    ],
    range_note: "",
    orientation: "portrait",
  },
];
