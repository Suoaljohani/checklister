import "server-only";

type ResourceLocation = {
  code: string;
  label: string;
  english: string;
  category: string;
  reference: string;
};

// Pilot location IDs are permanent once printed. Rename labels without changing their codes.
export const resourceLocations: ResourceLocation[] = [
  {
    code: "ER-MED-HA-01",
    label: "خزانة الأدوية عالية الخطورة",
    english: "High-alert medications cabinet",
    category: "High Alert Medications",
    reference: "راجعي قائمة الصيدلية السارية وسجل تواريخ الانتهاء في ملف الطوارئ.",
  },
  {
    code: "ER-MED-LASA-01",
    label: "درج الأدوية المتشابهة",
    english: "LASA drawer",
    category: "Look-Alike / Sound-Alike",
    reference: "راجعي قائمة الأدوية المتشابهة الصادرة من الصيدلية وملصقات الدرج.",
  },
  {
    code: "ER-MED-EXP-01",
    label: "درج متابعة انتهاء الأدوية",
    english: "Medication expiry drawer",
    category: "Medication Expiry",
    reference: "راجعي سجل الانتهاء الأصلي في ملف الطوارئ.",
  },
  {
    code: "ER-EQP-ECG-01",
    label: "جهاز تخطيط القلب",
    english: "ECG machine",
    category: "Equipment",
    reference: "راجعي قائمة فحص جهاز تخطيط القلب ضمن القوائم التشغيلية في ER Checklist.",
  },
];

export const resourceReferences = [
  {
    label: "الأدوية الخاضعة للرقابة",
    english: "Narcotics & Controlled Drugs",
    reference: "راجعي النماذج المعتمدة في ARCUS AIR وسجل العهدة الرسمي حسب صلاحياتك.",
  },
  {
    label: "الأدوية المبردة",
    english: "Refrigerated Medications",
    reference: "راجعي قائمة فحص حرارة ثلاجة الأدوية ضمن القوائم التشغيلية.",
  },
  {
    label: "النماذج وإجراءات التعطل",
    english: "Forms & Downtime",
    reference: "توجد النسخ الورقية المعتمدة في دولاب نماذج الطوارئ.",
  },
];

export function resourceLocationPath(code: string) {
  return `/resources/${code}`;
}
