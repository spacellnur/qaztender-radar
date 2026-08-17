export interface LocalityOption {
  value: string;
  label: string;
  regionId: string;
  regionCode?: string;
  keywords: string[];
}

export interface RegionOption {
  id: string;
  name: string;
  code: string;
  icon: string;
  items: LocalityOption[];
}

export const REGIONS: RegionOption[] = [
  {
    id: "turkestan",
    name: "Туркестанская область",
    code: "61",
    icon: "🕌",
    items: [
      { value: "all_turkestan", label: "🌐 Вся Туркестанская область", regionId: "turkestan", regionCode: "61", keywords: ["туркестан", "түркістан", "кент", "отырар", "сауран", "сарыагаш", "жетысай", "казыгурт", "шардара", "арыс", "толеби", "ленгер", "сайрам", "тюлькубас", "сузак", "байдибек", "ордабасы", "мактаарал", "келес"] },
      { value: "turkestan_cluster", label: "🎯 Кластер Туркестан (город + Сауран + Кентау + Отырар + сёла)", regionId: "turkestan", regionCode: "61", keywords: ["туркестан", "түркістан", "кентау", "кент", "карнак", "қарнақ", "икан", "иқан", "шаульдер", "шауілдір", "отырар", "сауран", "шорнак", "байылдыр", "ащысай"] },
      { value: "turkestan_city", label: "🏢 г. Туркестан (только город)", regionId: "turkestan", regionCode: "61", keywords: ["туркестан", "түркістан"] },
      { value: "kentau", label: "⛏ г. Кентау и посёлки (Ащысай, Байылдыр, Хантаги)", regionId: "turkestan", regionCode: "61", keywords: ["кентау", "кент", "ащысай", "байылдыр", "хантаги"] },
      { value: "otyrar", label: "🌾 Отырарский р-н (с. Шаулдер, с. Темир, с. Коксарай)", regionId: "turkestan", regionCode: "61", keywords: ["отырар", "шаульдер", "шауілдір", "темир", "көксарай", "коксарай"] },
      { value: "sauran", label: "🏛 Сауранский р-н (с. Шорнак, с. Икан, с. Карнак, с. Шага)", regionId: "turkestan", regionCode: "61", keywords: ["сауран", "шорнак", "шорнақ", "икан", "иқан", "карнак", "қарнақ", "шага", "шаға"] },
      { value: "saryagash", label: "🍇 Сарыагашский р-н (г. Сарыагаш, с. Коктерек)", regionId: "turkestan", regionCode: "61", keywords: ["сарыагаш", "сарыағаш", "коктерек", "көктерек"] },
      { value: "zhetysay", label: "🚜 Жетысайский р-н (г. Жетысай, п. Асыката)", regionId: "turkestan", regionCode: "61", keywords: ["жетысай", "жетісай", "асыката", "асықата"] },
      { value: "kazyqurt", label: "⛰️ Казыгуртский р-н (с. Казыгурт, с. Рабат)", regionId: "turkestan", regionCode: "61", keywords: ["казыгурт", "қазығұрт", "рабат"] },
      { value: "shardara", label: "🌊 Шардаринский р-н (г. Шардара, с. Узуната)", regionId: "turkestan", regionCode: "61", keywords: ["шардара", "шардара", "узуната"] },
      { value: "arys", label: "🚂 г. Арыс и сельские округа (с. Монтайтас, с. Акдала)", regionId: "turkestan", regionCode: "61", keywords: ["арыс", "арысь", "монтайтас", "акдала"] },
      { value: "tolebi", label: "🌲 Толебийский р-н (г. Ленгер, с. Первомаевка)", regionId: "turkestan", regionCode: "61", keywords: ["толеби", "төлеби", "ленгер", "леңгір"] },
      { value: "sayram", label: "🏠 Сайрамский р-н (с. Аксукент, с. Карабулак, с. Манкент)", regionId: "turkestan", regionCode: "61", keywords: ["сайрам", "аксукент", "ақсукент", "карабулак", "қарабұлақ", "манкент"] },
      { value: "tyulkubas", label: "🍎 Тюлькубасский р-н (с. Т. Рыскулова, п. Тюлькубас)", regionId: "turkestan", regionCode: "61", keywords: ["тюлькубас", "түлкібас", "рыскулов", "рысқұлов"] },
      { value: "suzak", label: "🏜 Сузакский р-н (с. Шолаккорган, с. Созак, с. Таукент)", regionId: "turkestan", regionCode: "61", keywords: ["сузак", "созақ", "шолаккорган", "шолаққорған", "таукент"] },
      { value: "baidibek", label: "🏔 Байдибекский р-н (с. Шаян, с. Агыбет)", regionId: "turkestan", regionCode: "61", keywords: ["байдибек", "бәйдібек", "шаян", "агыбет"] },
      { value: "ordabasy", label: "🏹 Ордабасинский р-н (с. Темирлановка, с. Бадам)", regionId: "turkestan", regionCode: "61", keywords: ["ордабасы", "темирлановка", "темірлан", "бадам"] },
      { value: "maktaaral", label: "🌿 Мактааральский р-н (п. Мырзакент, с. Атакент)", regionId: "turkestan", regionCode: "61", keywords: ["мактаарал", "мақтаарал", "мырзакент", "атакент"] },
      { value: "keles", label: "🌱 Келесский р-н (с. Абай, с. Кошкарата)", regionId: "turkestan", regionCode: "61", keywords: ["келес", "абай", "кошкарата"] },
    ],
  },
  {
    id: "shymkent",
    name: "г. Шымкент",
    code: "79",
    icon: "🏙",
    items: [
      { value: "all_shymkent", label: "🌐 Весь город Шымкент", regionId: "shymkent", regionCode: "79", keywords: ["шымкент", "шимкент"] },
      { value: "shymkent_cluster", label: "🎯 Шымкент и пригород (Бадам, Сайрам, Шапырашты, Мартобе)", regionId: "shymkent", regionCode: "79", keywords: ["шымкент", "шимкент", "бадам", "сайрам", "мартобе", "шапырашты", "тассай", "бозарык"] },
      { value: "shymkent_abay", label: "🏢 Абайский район", regionId: "shymkent", regionCode: "79", keywords: ["абайский район", "абай ауданы", "шымкент"] },
      { value: "shymkent_al_farabi", label: "🏛 Аль-Фарабийский район", regionId: "shymkent", regionCode: "79", keywords: ["аль-фараби", "әл-фараби", "шымкент"] },
      { value: "shymkent_enbekshi", label: "🏭 Енбекшинский район", regionId: "shymkent", regionCode: "79", keywords: ["енбекшинский", "еңбекші", "шымкент"] },
      { value: "shymkent_karatau", label: "🏔 Каратауский район", regionId: "shymkent", regionCode: "79", keywords: ["каратауский", "қаратау", "шымкент"] },
      { value: "shymkent_turan", label: "🌳 Туранский район", regionId: "shymkent", regionCode: "79", keywords: ["туран", "тұран", "шымкент"] },
    ],
  },
  {
    id: "almaty_city",
    name: "г. Алматы",
    code: "75",
    icon: "🍎",
    items: [
      { value: "all_almaty", label: "🌐 Весь город Алматы", regionId: "almaty_city", regionCode: "75", keywords: ["алматы", "алма-ата"] },
      { value: "almaty_cluster", label: "🎯 Алматы и пригород (Каскелен, Талгар, Боралдай, Отеген Батыр)", regionId: "almaty_city", regionCode: "75", keywords: ["алматы", "каскелен", "талгар", "боралдай", "отеген", "шамалган", "бесагаш"] },
      { value: "almaty_medeu_bostandyk", label: "🏔 Медеуский и Бостандыкский районы", regionId: "almaty_city", regionCode: "75", keywords: ["медеу", "бостандык", "алматы"] },
      { value: "almaty_auezov_almaly", label: "🏢 Ауэзовский и Алмалинский районы", regionId: "almaty_city", regionCode: "75", keywords: ["ауэзов", "алмалин", "алматы"] },
      { value: "almaty_alatau_turksib", label: "✈️ Алатауский, Турксибский и Жетысуский", regionId: "almaty_city", regionCode: "75", keywords: ["алатау", "турксиб", "жетысу", "наурызбай", "алматы"] },
    ],
  },
  {
    id: "astana",
    name: "г. Астана",
    code: "71",
    icon: "🏛",
    items: [
      { value: "all_astana", label: "🌐 Весь город Астана", regionId: "astana", regionCode: "71", keywords: ["астана", "нур-султан"] },
      { value: "astana_cluster", label: "🎯 Астана и пригород (Косшы, Жибек Жолы, Ильинка, Талапкер)", regionId: "astana", regionCode: "71", keywords: ["астана", "косшы", "қошы", "жибек жолы", "ильинка", "талапкер", "коянды"] },
      { value: "astana_esil_nura", label: "🏛 Есильский и Нуринский районы (Левый берег)", regionId: "astana", regionCode: "71", keywords: ["есиль", "есіл", "нура", "нұра", "астана"] },
      { value: "astana_almaty_baykonur", label: "🏢 Алматинский и Байконурский районы (Правый берег)", regionId: "astana", regionCode: "71", keywords: ["алматы", "байконур", "байқоңыр", "сарыарка", "астана"] },
    ],
  },
  {
    id: "almaty_region",
    name: "Алматинская область",
    code: "19",
    icon: "🏞",
    items: [
      { value: "all_almaty_region", label: "🌐 Вся Алматинская область", regionId: "almaty_region", regionCode: "19", keywords: ["алматинская", "конаев", "каскелен", "талгар", "есик", "отеген", "кеген"] },
      { value: "konaev", label: "🌊 г. Конаев (Капшагай)", regionId: "almaty_region", regionCode: "19", keywords: ["конаев", "қонаев", "капшагай", "қапшағай"] },
      { value: "kaskelen", label: "🏢 Карасайский р-н / г. Каскелен (Шамалган)", regionId: "almaty_region", regionCode: "19", keywords: ["карасай", "қарасай", "каскелен", "қаскелең", "шамалган"] },
      { value: "talgar", label: "🏔 Талгарский р-н / г. Талгар (Бесагаш, Туздыбастау)", regionId: "almaty_region", regionCode: "19", keywords: ["талгар", "талғар", "бесагаш", "тұздыбастау"] },
      { value: "enbekshikazakh", label: "🍇 Енбекшиказахский р-н / г. Есик (Шелек)", regionId: "almaty_region", regionCode: "19", keywords: ["енбекшиказах", "еңбекшіқазақ", "есик", "есік", "шелек"] },
      { value: "ilie", label: "🏭 Илийский р-н / п. Отеген Батыр (Боралдай)", regionId: "almaty_region", regionCode: "19", keywords: ["илийский", "іле", "отеген", "өтеген", "боралдай"] },
      { value: "zhambyl_raion", label: "🌾 Жамбылский р-н / с. Узынагаш (Фабричный)", regionId: "almaty_region", regionCode: "19", keywords: ["жамбылский район", "узынагаш", "ұзынағаш", "каргалы"] },
    ],
  },
  {
    id: "zhambyl",
    name: "Жамбылская область",
    code: "31",
    icon: "🌾",
    items: [
      { value: "all_zhambyl", label: "🌐 Вся Жамбылская область", regionId: "zhambyl", regionCode: "31", keywords: ["жамбыл", "тараз", "шу", "кордай", "мерке", "каратау", "жанатас"] },
      { value: "taraz", label: "🏢 г. Тараз", regionId: "zhambyl", regionCode: "31", keywords: ["тараз"] },
      { value: "korday", label: "⛰️ Кордайский р-н / с. Кордай", regionId: "zhambyl", regionCode: "31", keywords: ["кордай", "қордай"] },
      { value: "shu", label: "🚂 Шуский р-н / г. Шу", regionId: "zhambyl", regionCode: "31", keywords: ["шу", "шуский", "төле би"] },
      { value: "merke", label: "🌳 Меркенский р-н / с. Мерке", regionId: "zhambyl", regionCode: "31", keywords: ["мерке", "меркі"] },
      { value: "karatau_city", label: "⛏ Таласский р-н / г. Каратау", regionId: "zhambyl", regionCode: "31", keywords: ["каратау", "қаратау", "талас"] },
      { value: "zhanatas", label: "⛏ Сарысуский р-н / г. Жанатас", regionId: "zhambyl", regionCode: "31", keywords: ["жанатас", "жаңатас", "сарысу"] },
      { value: "baizak", label: "🌾 Байзакский р-н / с. Сарыкемер", regionId: "zhambyl", regionCode: "31", keywords: ["байзак", "байзақ", "сарыкемер"] },
    ],
  },
  {
    id: "karaganda",
    name: "Карагандинская область",
    code: "35",
    icon: "🏭",
    items: [
      { value: "all_karaganda", label: "🌐 Вся Карагандинская область", regionId: "karaganda", regionCode: "35", keywords: ["караганда", "қарағанды", "темиртау", "балхаш", "шахтинск", "сарань", "абай"] },
      { value: "karaganda_city", label: "🏢 г. Караганда", regionId: "karaganda", regionCode: "35", keywords: ["караганда", "қарағанды"] },
      { value: "temirtau", label: "🏭 г. Темиртау (п. Актау)", regionId: "karaganda", regionCode: "35", keywords: ["темиртау", "теміртау"] },
      { value: "balkhash", label: "🌊 г. Балхаш (п. Саяк)", regionId: "karaganda", regionCode: "35", keywords: ["балхаш", "балқаш"] },
      { value: "shakhtinsk", label: "⛏ г. Шахтинск (п. Шахан)", regionId: "karaganda", regionCode: "35", keywords: ["шахтинск", "шахан"] },
      { value: "saran", label: "🏢 г. Сарань", regionId: "karaganda", regionCode: "35", keywords: ["сарань", "саран"] },
      { value: "abai_karaganda", label: "⛏ Абайский р-н / г. Абай", regionId: "karaganda", regionCode: "35", keywords: ["абай", "абайский"] },
      { value: "osakarovka", label: "🌾 Осакаровский р-н / п. Осакаровка", regionId: "karaganda", regionCode: "35", keywords: ["осакаров", "осакаровка"] },
    ],
  },
  {
    id: "atyrau",
    name: "Атырауская область",
    code: "23",
    icon: "🛢",
    items: [
      { value: "all_atyrau", label: "🌐 Вся Атырауская область", regionId: "atyrau", regionCode: "23", keywords: ["атырау", "кульсары", "макат", "индер", "курмангазы"] },
      { value: "atyrau_city", label: "🏢 г. Атырау", regionId: "atyrau", regionCode: "23", keywords: ["атырау"] },
      { value: "kulsary", label: "🛢 Жылыойский р-н / г. Кульсары", regionId: "atyrau", regionCode: "23", keywords: ["кульсары", "құлсары", "жылыой", "тениз"] },
      { value: "makat", label: "🚂 Макатский р-н / п. Макат", regionId: "atyrau", regionCode: "23", keywords: ["макат", "мақат", "доссор"] },
      { value: "inder", label: "🌊 Индерский р-н / п. Индерборский", regionId: "atyrau", regionCode: "23", keywords: ["индер", "индербор"] },
      { value: "kurmangazy", label: "🌾 Курмангазинский р-н / с. Курмангазы", regionId: "atyrau", regionCode: "23", keywords: ["курмангазы", "құрманғазы", "ганюшкино"] },
    ],
  },
  {
    id: "mangystau",
    name: "Мангистауская область",
    code: "47",
    icon: "🌊",
    items: [
      { value: "all_mangystau", label: "🌐 Вся Мангистауская область", regionId: "mangystau", regionCode: "47", keywords: ["мангистау", "маңғыстау", "актау", "жанаозен", "бейнеу", "тупкараган"] },
      { value: "aktau", label: "🌊 г. Актау", regionId: "mangystau", regionCode: "47", keywords: ["актау", "ақтау"] },
      { value: "zhanaozen", label: "🛢 г. Жанаозен", regionId: "mangystau", regionCode: "47", keywords: ["жанаозен", "жаңаөзен", "тенге"] },
      { value: "munaily", label: "🏢 Мунайлинский р-н / с. Мангистау", regionId: "mangystau", regionCode: "47", keywords: ["мунайлы", "мұнайлы", "баскудук"] },
      { value: "beyneu", label: "🐪 Бейнеуский р-н / с. Бейнеу", regionId: "mangystau", regionCode: "47", keywords: ["бейнеу", "бейнеуский"] },
      { value: "tupkaragan", label: "⚓ Тупкараганский р-н / г. Форт-Шевченко", regionId: "mangystau", regionCode: "47", keywords: ["тупкараган", "түпқараған", "форт-шевченко", "баутино"] },
    ],
  },
  {
    id: "aktobe",
    name: "Актюбинская область",
    code: "15",
    icon: "🏢",
    items: [
      { value: "all_aktobe", label: "🌐 Вся Актюбинская область", regionId: "aktobe", regionCode: "15", keywords: ["актюбинская", "ақтөбе", "актобе", "хромтау", "кандыагаш", "шалкар"] },
      { value: "aktobe_city", label: "🏢 г. Актобе", regionId: "aktobe", regionCode: "15", keywords: ["актобе", "ақтөбе"] },
      { value: "khromtau", label: "⛏ Хромтауский р-н / г. Хромтау", regionId: "aktobe", regionCode: "15", keywords: ["хромтау", "хром"] },
      { value: "kandyagash", label: "🚂 Мугалжарский р-н / г. Кандыагаш", regionId: "aktobe", regionCode: "15", keywords: ["мугалжар", "мұғалжар", "кандыагаш", "қандыағаш", "эмба"] },
      { value: "shalkar", label: "🌾 Шалкарский р-н / г. Шалкар", regionId: "aktobe", regionCode: "15", keywords: ["шалкар", "шалқар"] },
      { value: "martuk", label: "🌾 Мартукский р-н / с. Мартук", regionId: "aktobe", regionCode: "15", keywords: ["мартук", "мәртөк"] },
    ],
  },
  {
    id: "kyzylorda",
    name: "Кызылординская область",
    code: "43",
    icon: "🚀",
    items: [
      { value: "all_kyzylorda", label: "🌐 Вся Кызылординская область", regionId: "kyzylorda", regionCode: "43", keywords: ["кызылорда", "қызылорда", "байконур", "арал", "казалы", "шиели", "жанакорган"] },
      { value: "kyzylorda_city", label: "🏢 г. Кызылорда", regionId: "kyzylorda", regionCode: "43", keywords: ["кызылорда", "қызылорда"] },
      { value: "baikonur", label: "🚀 г. Байконур (п. Торетам)", regionId: "kyzylorda", regionCode: "43", keywords: ["байконур", "байқоңыр", "торетам"] },
      { value: "aral", label: "🌊 Аральский р-н / г. Аральск", regionId: "kyzylorda", regionCode: "43", keywords: ["арал", "аральск", "аралқұм"] },
      { value: "kazaly", label: "🌾 Казалинский р-н / п. Айтеке би (г. Казалинск)", regionId: "kyzylorda", regionCode: "43", keywords: ["казалы", "қазалы", "айтеке би"] },
      { value: "shieli", label: "🌾 Шиелийский р-н / п. Шиели", regionId: "kyzylorda", regionCode: "43", keywords: ["шиели", "шиелі"] },
      { value: "zhanakorgan", label: "🌾 Жанакорганский р-н / п. Жанакорган", regionId: "kyzylorda", regionCode: "43", keywords: ["жанакорган", "жаңақорған"] },
    ],
  },
  {
    id: "pavlodar",
    name: "Павлодарская область",
    code: "55",
    icon: "⚡",
    items: [
      { value: "all_pavlodar", label: "🌐 Вся Павлодарская область", regionId: "pavlodar", regionCode: "55", keywords: ["павлодар", "экибастуз", "аксу", "баянаул"] },
      { value: "pavlodar_city", label: "🏢 г. Павлодар", regionId: "pavlodar", regionCode: "55", keywords: ["павлодар"] },
      { value: "ekibastuz", label: "⚡ г. Экибастуз", regionId: "pavlodar", regionCode: "55", keywords: ["экибастуз", "екібастұз"] },
      { value: "aksu", label: "🏭 г. Аксу", regionId: "pavlodar", regionCode: "55", keywords: ["аксу", "ақсу"] },
      { value: "bayanaul", label: "🌲 Баянаульский р-н / с. Баянаул", regionId: "pavlodar", regionCode: "55", keywords: ["баянаул", "баянауыл"] },
    ],
  },
  {
    id: "kostanay",
    name: "Костанайская область",
    code: "39",
    icon: "🌾",
    items: [
      { value: "all_kostanay", label: "🌐 Вся Костанайская область", regionId: "kostanay", regionCode: "39", keywords: ["костанай", "қостанай", "рудный", "лисаковск", "житикара", "аркалык"] },
      { value: "kostanay_city", label: "🏢 г. Костанай", regionId: "kostanay", regionCode: "39", keywords: ["костанай", "қостанай"] },
      { value: "rudny", label: "⛏ г. Рудный (п. Качар)", regionId: "kostanay", regionCode: "39", keywords: ["рудный", "рудный", "качар"] },
      { value: "lisakovsk", label: "🏢 г. Лисаковск", regionId: "kostanay", regionCode: "39", keywords: ["лисаковск", "лисаков"] },
      { value: "zhitikara", label: "⛏ Житикаринский р-н / г. Житикара", regionId: "kostanay", regionCode: "39", keywords: ["житикара", "жітіқара"] },
      { value: "arkalyk", label: "🌾 г. Аркалык", regionId: "kostanay", regionCode: "39", keywords: ["аркалык", "арқалық"] },
    ],
  },
  {
    id: "zko",
    name: "Западно-Казахстанская область",
    code: "27",
    icon: "🏛",
    items: [
      { value: "all_zko", label: "🌐 Вся Западно-Казахстанская область", regionId: "zko", regionCode: "27", keywords: ["западно-казахстанская", "зко", "уральск", "орал", "аксай", "теректи"] },
      { value: "uralsk", label: "🏢 г. Уральск", regionId: "zko", regionCode: "27", keywords: ["уральск", "орал"] },
      { value: "aksay", label: "🛢 Бурлинский р-н / г. Аксай (Карачаганак)", regionId: "zko", regionCode: "27", keywords: ["аксай", "ақсай", "бурлин", "карачаганак"] },
      { value: "terekti", label: "🌾 Теректинский р-н / с. Теректи", regionId: "zko", regionCode: "27", keywords: ["теректи", "теректі", "федоровка"] },
    ],
  },
  {
    id: "vko",
    name: "Восточно-Казахстанская область",
    code: "63",
    icon: "🏔",
    items: [
      { value: "all_vko", label: "🌐 Вся Восточно-Казахстанская область", regionId: "vko", regionCode: "63", keywords: ["восточно-казахстанская", "вко", "усть-каменогорск", "өскемен", "риддер", "алтай", "зайсан"] },
      { value: "oskemen", label: "🏢 г. Усть-Каменогорск", regionId: "vko", regionCode: "63", keywords: ["усть-каменогорск", "өскемен"] },
      { value: "ridder", label: "⛏ г. Риддер", regionId: "vko", regionCode: "63", keywords: ["риддер", "леcount"] },
      { value: "altay_city", label: "🏔 р-н Алтай / г. Алтай (Зыряновск)", regionId: "vko", regionCode: "63", keywords: ["алтай", "зыряновск"] },
      { value: "zaysan", label: "🌾 Зайсанский р-н / г. Зайсан", regionId: "vko", regionCode: "63", keywords: ["зайсан", "зайсаң"] },
    ],
  },
  {
    id: "sko",
    name: "Северо-Казахстанская область",
    code: "59",
    icon: "🌾",
    items: [
      { value: "all_sko", label: "🌐 Вся Северо-Казахстанская область", regionId: "sko", regionCode: "59", keywords: ["северо-казахстанская", "ско", "петропавловск", "петропавл", "тайынша", "булаево"] },
      { value: "petropavlovsk", label: "🏢 г. Петропавловск", regionId: "sko", regionCode: "59", keywords: ["петропавловск", "петропавл"] },
      { value: "tayinsha", label: "🌾 Тайыншинский р-н / г. Тайынша", regionId: "sko", regionCode: "59", keywords: ["тайынша", "тайыншинский"] },
      { value: "bulaevo", label: "🌾 р-н М. Жумабаева / г. Булаево", regionId: "sko", regionCode: "59", keywords: ["булаево", "жумабаев"] },
    ],
  },
  {
    id: "akmola",
    name: "Акмолинская область",
    code: "11",
    icon: "🌲",
    items: [
      { value: "all_akmola", label: "🌐 Вся Акмолинская область", regionId: "akmola", regionCode: "11", keywords: ["акмолинская", "кокшетау", "косшы", "бурабай", "щучинск", "степногорск", "атбасар"] },
      { value: "kokshetau", label: "🏢 г. Кокшетау", regionId: "akmola", regionCode: "11", keywords: ["кокшетау", "көкшетау"] },
      { value: "kosshy_city", label: "🏘 г. Косшы (пригород Астаны)", regionId: "akmola", regionCode: "11", keywords: ["косшы", "қосшы", "тайтобе"] },
      { value: "burabay", label: "🌲 Бурабайский р-н / г. Щучинск (Бурабай)", regionId: "akmola", regionCode: "11", keywords: ["бурабай", "борубай", "щучинск"] },
      { value: "stepnogorsk", label: "🏭 г. Степногорск", regionId: "akmola", regionCode: "11", keywords: ["степногорск", "степногор"] },
      { value: "atbasar", label: "🌾 Атбасарский р-н / г. Атбасар", regionId: "akmola", regionCode: "11", keywords: ["атбасар", "атбасарский"] },
    ],
  },
  {
    id: "abai",
    name: "Абайская область",
    code: "10",
    icon: "🏛",
    items: [
      { value: "all_abai", label: "🌐 Вся Абайская область", regionId: "abai", regionCode: "10", keywords: ["абайская", "семей", "семипалатинск", "аягоз", "курчатов"] },
      { value: "semey", label: "🏢 г. Семей", regionId: "abai", regionCode: "10", keywords: ["семей", "семипалатинск"] },
      { value: "ayagoz", label: "🚂 Аягозский р-н / г. Аягоз", regionId: "abai", regionCode: "10", keywords: ["аягоз", "аягөз"] },
      { value: "kurchatov", label: "🔬 г. Курчатов", regionId: "abai", regionCode: "10", keywords: ["курчатов"] },
    ],
  },
  {
    id: "zhetysu",
    name: "Жетысуская область",
    code: "33",
    icon: "🏞",
    items: [
      { value: "all_zhetysu", label: "🌐 Вся Жетысуская область", regionId: "zhetysu", regionCode: "33", keywords: ["жетысу", "жетісу", "талдыкорган", "текели", "жаркент", "ушарал"] },
      { value: "taldykorgan", label: "🏢 г. Талдыкорган", regionId: "zhetysu", regionCode: "33", keywords: ["талдыкорган", "талдықорған"] },
      { value: "tekeli", label: "⛰️ г. Текели", regionId: "zhetysu", regionCode: "33", keywords: ["текели", "текелі"] },
      { value: "zharkent", label: "🏰 Панфиловский р-н / г. Жаркент (Хоргос)", regionId: "zhetysu", regionCode: "33", keywords: ["жаркент", "жаркент", "панфилов", "хоргос"] },
      { value: "usharal", label: "🌊 Алакольский р-н / г. Ушарал (Алаколь)", regionId: "zhetysu", regionCode: "33", keywords: ["ушарал", "үшарал", "алаколь", "алакөл"] },
    ],
  },
  {
    id: "ulytau",
    name: "Улытауская область",
    code: "62",
    icon: "⛏",
    items: [
      { value: "all_ulytau", label: "🌐 Вся Улытауская область", regionId: "ulytau", regionCode: "62", keywords: ["улытау", "ұлытау", "жезказган", "сатпаев", "каражал", "жанаарка"] },
      { value: "zhezkazgan", label: "🏢 г. Жезказган", regionId: "ulytau", regionCode: "62", keywords: ["жезказган", "жезқазған"] },
      { value: "satpayev", label: "⛏ г. Сатпаев", regionId: "ulytau", regionCode: "62", keywords: ["сатпаев", "сәтбаев"] },
      { value: "karazhal", label: "⛏ г. Каражал", regionId: "ulytau", regionCode: "62", keywords: ["каражал", "қаражал"] },
      { value: "zhanaarka", label: "🌾 Жанааркинский р-н / п. Жанаарка (Атасу)", regionId: "ulytau", regionCode: "62", keywords: ["жанаарка", "жаңаарқа", "атасу"] },
    ],
  },
];

// Flat array for lookup
export const localities: LocalityOption[] = [
  { value: "all", label: "🌐 Весь Казахстан (все 20 регионов)", regionId: "all", keywords: [] },
  ...REGIONS.flatMap((r) => r.items),
];

export function getRegionById(regionId: string): RegionOption | undefined {
  return REGIONS.find((r) => r.id === regionId);
}

export function getLocalityByValue(value: string): LocalityOption | undefined {
  if (value === "all") {
    return { value: "all", label: "🌐 Весь Казахстан (все 20 регионов)", regionId: "all", keywords: [] };
  }
  return localities.find((l) => l.value === value);
}

export function getLocalityLabel(value: string): string {
  const loc = getLocalityByValue(value);
  return loc?.label || "Весь Казахстан";
}

export function matchesTenderLocation(
  localityVal: string,
  tender: {
    regionCode?: string | null;
    regionName?: string | null;
    kato?: string | null;
    title: string;
    buyer: string;
  }
): boolean {
  if (!localityVal || localityVal === "all") return true;

  const loc = getLocalityByValue(localityVal);
  if (!loc) return true;

  const textToSearch = `${tender.title} ${tender.buyer} ${tender.regionName || ""} ${tender.kato || ""}`.toLowerCase();

  // 1. If filtering by whole region (e.g. all_turkestan -> "61")
  if (loc.regionCode && loc.value.startsWith("all_")) {
    if (tender.regionCode && tender.regionCode === loc.regionCode) return true;
    if (loc.keywords && loc.keywords.some((k) => textToSearch.includes(k.toLowerCase()))) return true;
    return false;
  }

  // 2. If region code matches and user chose region cluster (e.g. turkestan_cluster -> "61")
  if (loc.regionCode && loc.value.endsWith("_cluster")) {
    if (tender.regionCode && tender.regionCode === loc.regionCode) return true;
    // Cross-border south overlap for Shymkent / Turkestan
    if ((loc.regionCode === "61" && tender.regionCode === "79") || (loc.regionCode === "79" && tender.regionCode === "61")) {
      if (loc.keywords && loc.keywords.some((k) => textToSearch.includes(k.toLowerCase()))) return true;
    }
  }

  // 3. Keyword matching for specific district/city/village
  if (loc.keywords && loc.keywords.length > 0) {
    const hasKeyword = loc.keywords.some((k) => textToSearch.includes(k.toLowerCase()));
    if (hasKeyword) return true;
  }

  // 4. Fallback on matching region code only if no specific sub-city was requested
  if (loc.regionCode && tender.regionCode && tender.regionCode === loc.regionCode) {
    if (loc.value === `all_${loc.regionId}` || loc.value === `${loc.regionId}_cluster`) {
      return true;
    }
  }

  return false;
}
