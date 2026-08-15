export interface LocalityOption {
  value: string;
  label: string;
  keywords: string[];
}

export const localities: LocalityOption[] = [
  { value: "all", label: "Все населённые пункты / сёла", keywords: [] },
  { value: "turkestan_cluster", label: "🎯 Туркестан и окрестности (Туркестан, Кентау, Шаулдер, Карнак, Икан)", keywords: ["туркестан", "түркістан", "кентау", "кент", "карнак", "қарнақ", "икан", "иқан", "шаульдер", "шауілдір", "отырар", "сауран", "шорнак"] },
  { value: "turkestan_city", label: "г. Туркестан (только город)", keywords: ["туркестан", "түркістан"] },
  { value: "kentau", label: "г. Кентау и посёлки", keywords: ["кентау", "кент", "ащысай", "байылдыр"] },
  { value: "otyrar", label: "Отырарский р-н / с. Шаулдер", keywords: ["отырар", "шаульдер", "шауілдір", "темир"] },
  { value: "sauran", label: "Сауранский р-н / с. Шорнак, с. Икан", keywords: ["сауран", "шорнак", "икан", "иқан", "карнак", "қарнақ"] },
  { value: "saryagash", label: "Сарыагашский р-н / г. Сарыагаш", keywords: ["сарыагаш", "сарыағаш"] },
  { value: "shymkent", label: "г. Шымкент", keywords: ["шымкент", "шимкент"] },
  { value: "almaty", label: "г. Алматы", keywords: ["алматы"] },
  { value: "astana", label: "г. Астана", keywords: ["астана", "нур-султан"] },
  { value: "taraz", label: "г. Тараз", keywords: ["тараз", "жамбыл"] },
  { value: "kyzylorda", label: "г. Кызылорда", keywords: ["кызылорда", "қызылорда"] },
  { value: "aktau", label: "г. Актау", keywords: ["актау", "ақтау"] },
  { value: "atyrau", label: "г. Атырау", keywords: ["атырау"] },
  { value: "aktobe", label: "г. Актобе", keywords: ["актобе", "ақтөбе"] },
  { value: "karaganda", label: "г. Караганда", keywords: ["караганда", "қарағанды"] },
  { value: "kaskelen", label: "г. Каскелен / Карасайский р-н", keywords: ["каскелен", "қаскелең", "карасай", "шамалган"] },
  { value: "talgar", label: "г. Талгар / Талгарский р-н", keywords: ["талгар", "талғар", "бесагаш"] },
  { value: "konaev", label: "г. Конаев", keywords: ["конаев", "қонаев", "капшагай"] },
  { value: "semey", label: "г. Семей", keywords: ["семей", "семипалатинск"] },
  { value: "ust_kamenogorsk", label: "г. Усть-Каменогорск", keywords: ["усть-каменогорск", "өскемен"] },
  { value: "pavlodar", label: "г. Павлодар", keywords: ["павлодар"] },
  { value: "kostanay", label: "г. Костанай", keywords: ["костанай", "қостанай"] },
  { value: "petropavlovsk", label: "г. Петропавловск", keywords: ["петропавловск", "петропавл"] },
  { value: "kokshetau", label: "г. Кокшетау", keywords: ["кокшетау", "көкшетау"] },
  { value: "uralsk", label: "г. Уральск", keywords: ["уральск", "орал"] },
];
