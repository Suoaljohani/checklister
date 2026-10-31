import type { Checklist, Department, Settings } from "./types";

const now = "2026-11-01T00:00:00.000Z";

export const seedDepartments: Department[] = [
  {
    id: "dep-er",
    slug: "er",
    name_en: "Emergency Room",
    name_ar: "قسم الطوارئ",
    icon: "Siren",
    sort: 1,
    active: true,
    created_at: now,
  },
];

export const seedChecklists: Checklist[] = [
  {
    id: "chk-stock-room",
    department_id: "dep-er",
    title_en: "Daily Temperature and Humidity Check for Stock Room",
    title_ar: "التحقق اليومي من درجة الحرارة والرطوبة لغرفة المستودع",
    icon: "Package",
    color: "#1691D0",
    fields: [
      { key: "temperature", label_en: "Temperature", label_ar: "درجة الحرارة", type: "number", unit: "°C", min: 22, max: 25, required: true },
      { key: "humidity", label_en: "Humidity", label_ar: "الرطوبة", type: "number", unit: "%", min: 0, max: 70, required: true },
    ],
    range_note: "NORMAL RANGE: TEMPERATURE RANGES FROM 22°C TO 25°C / RELATIVE HUMIDITY UP TO 70%",
    footer_note: "Infection Prevention and Control Department",
    orientation: "portrait",
    sort: 1,
    active: true,
    created_at: now,
  },
  {
    id: "chk-refrigerator",
    department_id: "dep-er",
    title_en: "Daily Temperature Check for Refrigerator",
    title_ar: "جدول تشييك على درجة حرارة الثلاجة",
    icon: "Refrigerator",
    color: "#3AC0C3",
    fields: [
      { key: "temperature", label_en: "Temperature", label_ar: "الحرارة", type: "number", unit: "°C", min: 2, max: 8, required: true },
    ],
    range_note: "NORMAL RANGE: 2°C TO 8°C",
    footer_note: "Infection Prevention and Control Department",
    orientation: "landscape",
    sort: 2,
    active: true,
    created_at: now,
  },
];

export const defaultSettings: Settings = {
  header_en: [
    "Kingdom of Saudi Arabia",
    "Ministry of Health",
    "Gurayat Health Affairs",
    "Haditha General Hospital",
  ],
  header_ar: [
    "المملكة العربية السعودية",
    "وزارة الصحة",
    "الشئون الصحية بمحافظة القريات",
    "مستشفى الحديثة العام",
  ],
  copyright_owner: "MAlanazi354",
  timezone: "Asia/Riyadh",
};
