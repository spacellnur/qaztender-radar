"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { CompanyProfile } from "../../tender-types";

const regions = [
  "Астана", "Алматы", "Шымкент", "Абайская область", "Акмолинская область",
  "Актюбинская область", "Алматинская область", "Атырауская область",
  "Восточно-Казахстанская область", "Жамбылская область", "Жетысуская область",
  "Западно-Казахстанская область", "Карагандинская область", "Костанайская область",
  "Кызылординская область", "Мангистауская область", "Павлодарская область",
  "Северо-Казахстанская область", "Туркестанская область", "Улытауская область",
];

const activities = [
  { id: "construction", label: "Строительство и ремонт" },
  { id: "goods", label: "Товары и оборудование" },
  { id: "services", label: "Услуги для организаций" },
  { id: "it", label: "IT и связь" },
  { id: "transport", label: "Транспорт и логистика" },
  { id: "medical", label: "Медицина и фармацевтика" },
  { id: "food", label: "Продукты и питание" },
  { id: "other", label: "Другое" },
];

const constructionTypes = [
  "Новое строительство", "Капитальный ремонт", "Текущий ремонт", "Инженерные сети",
  "Дорожные работы", "Благоустройство", "Проектирование", "Монтажные работы",
];

function ChoiceButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className={`choice-chip ${active ? "selected" : ""}`} aria-pressed={active} onClick={onClick}>{children}</button>;
}

export default function CompanyForm({ username, initialProfile, editing = false }: { username: string; initialProfile?: CompanyProfile; editing?: boolean }) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialProfile?.regions ?? []);
  const [selectedActivities, setSelectedActivities] = useState<string[]>(() => activities.filter((activity) => initialProfile?.directions.includes(activity.label)).map((activity) => activity.id));
  const [selectedConstruction, setSelectedConstruction] = useState<string[]>(initialProfile?.constructionTypes ?? []);
  const [unlimitedBudget, setUnlimitedBudget] = useState(initialProfile?.maxBudget === -1);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function toggle(value: string, values: string[], setValues: (values: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function chooseAllActivities() {
    if (selectedActivities.length === activities.length) {
      setSelectedActivities([]);
      setSelectedConstruction([]);
    } else {
      setSelectedActivities(activities.map((item) => item.id));
      setSelectedConstruction(constructionTypes);
    }
  }

  function toggleActivity(id: string) {
    if (id === "construction" && selectedActivities.includes(id)) setSelectedConstruction([]);
    toggle(id, selectedActivities, setSelectedActivities);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedRegions.length === 0) return setError("Выберите хотя бы один регион работы");
    if (selectedActivities.length === 0) return setError("Выберите хотя бы одно направление деятельности");
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const selectedLabels = activities.filter((item) => selectedActivities.includes(item.id)).map((item) => item.label);
    const payload = {
      companyName: form.get("companyName"),
      bin: form.get("bin"),
      regions: JSON.stringify(selectedRegions),
      workCategories: JSON.stringify({ directions: selectedLabels, construction: selectedConstruction }),
      licenses: form.get("licenses"),
      experienceYears: form.get("experienceYears") || 0,
      employeeCount: form.get("employeeCount") || 0,
      minBudget: 0,
      maxBudget: unlimitedBudget ? -1 : form.get("maxBudget"),
    };
    const response = await fetch("/api/company-profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setPending(false); return; }
    window.location.assign("/");
  }

  const allActivitiesSelected = selectedActivities.length === activities.length;
  const constructionSelected = selectedActivities.includes("construction");

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-top"><span>QT</span><div><small>АККАУНТ ТЕНДЕРЩИКА</small><strong>{username}</strong></div></div>
        <p className="eyebrow">{editing ? "НАСТРОЙКА ПОДБОРА" : "ПЕРСОНАЛИЗАЦИЯ РАДАРА"}</p>
        <h1>{editing ? "Профиль компании" : "Расскажите о компании"}</h1>
        <p className="onboarding-intro">{editing ? "Изменения сразу повлияют на объяснения соответствия тендеров." : "Выберите только то, что известно сейчас. Необязательные сведения можно добавить позже."}</p>
        <p className="required-note"><span>*</span> Обязательны только название, регион и направление деятельности</p>

        <form className="company-form" onSubmit={submit}>
          <label className="wide">Название компании <span className="required-mark">*</span><input name="companyName" required defaultValue={initialProfile?.companyName ?? ""} /></label>
          <label>БИН <small>необязательно</small><input name="bin" inputMode="numeric" pattern="\d{12}" maxLength={12} placeholder="12 цифр" defaultValue={initialProfile?.bin ?? ""} /></label>
          <label>Опыт работы, лет <small>необязательно</small><input name="experienceYears" type="number" min="0" max="100" placeholder="Например, 8" defaultValue={initialProfile?.experienceYears || ""} /></label>

          <fieldset className="wide choice-fieldset">
            <legend>Регионы работы <span className="required-mark">*</span></legend>
            <p>Можно выбрать несколько регионов.</p>
            <div className="choice-grid region-choices">
              <ChoiceButton active={selectedRegions.length === regions.length} onClick={() => setSelectedRegions(selectedRegions.length === regions.length ? [] : regions)}>Весь Казахстан</ChoiceButton>
              {regions.map((region) => <ChoiceButton key={region} active={selectedRegions.includes(region)} onClick={() => toggle(region, selectedRegions, setSelectedRegions)}>{region}</ChoiceButton>)}
            </div>
          </fieldset>

          <fieldset className="wide choice-fieldset">
            <legend>Чем занимается компания <span className="required-mark">*</span></legend>
            <p>Выберите одно или несколько направлений.</p>
            <div className="choice-grid activity-choices">
              <ChoiceButton active={allActivitiesSelected} onClick={chooseAllActivities}>Все направления</ChoiceButton>
              {activities.map((activity) => <ChoiceButton key={activity.id} active={selectedActivities.includes(activity.id)} onClick={() => toggleActivity(activity.id)}>{activity.label}</ChoiceButton>)}
            </div>
          </fieldset>

          {constructionSelected && <fieldset className="wide choice-fieldset subcategory-fieldset">
            <legend>Какие строительные работы подходят?</legend>
            <p>Если ничего не выбирать, система будет учитывать все строительные тендеры.</p>
            <div className="choice-grid construction-choices">
              <ChoiceButton active={selectedConstruction.length === constructionTypes.length} onClick={() => setSelectedConstruction(selectedConstruction.length === constructionTypes.length ? [] : constructionTypes)}>Все строительные работы</ChoiceButton>
              {constructionTypes.map((type) => <ChoiceButton key={type} active={selectedConstruction.includes(type)} onClick={() => toggle(type, selectedConstruction, setSelectedConstruction)}>{type}</ChoiceButton>)}
            </div>
          </fieldset>}

          <label className="wide">Лицензии и категории <small>необязательно — можно заполнить позже</small><textarea name="licenses" placeholder="Например: СМР II категории" defaultValue={initialProfile?.licenses ?? ""} /></label>
          <label>Количество сотрудников <small>необязательно</small><input name="employeeCount" type="number" min="1" placeholder="Например, 35" defaultValue={initialProfile?.employeeCount || ""} /></label>

          <fieldset className="budget-field wide">
            <legend>Финансовый масштаб тендера</legend>
            <p>Укажите максимальную сумму тендера, с которой компания готова работать.</p>
            <label className="unlimited-choice"><input type="checkbox" checked={unlimitedBudget} onChange={(event) => setUnlimitedBudget(event.target.checked)} /> Без ограничений по бюджету</label>
            {!unlimitedBudget && <label>Максимальная сумма тендера, ₸ <small>необязательно</small><input name="maxBudget" type="number" min="1" step="1000000" placeholder="Например, 300 000 000" defaultValue={initialProfile && initialProfile.maxBudget > 0 ? initialProfile.maxBudget : ""} /></label>}
          </fieldset>

          {error && <p className="login-error wide" role="alert">{error}</p>}
          <button className="wide" disabled={pending}>{pending ? "Сохраняем…" : editing ? "Сохранить изменения" : "Сохранить и открыть радар"}</button>
          {editing && <Link className="profile-back-link wide" href="/">Вернуться без изменений</Link>}
        </form>
      </section>
    </main>
  );
}
