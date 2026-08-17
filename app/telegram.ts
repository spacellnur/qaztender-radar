import {
  consumeTelegramConnectToken, createOrUpdateTelegramSubscriber, createTelegramWebLogin,
  createTenderNote, getCompanyProfile, getDbUserById, getTelegramFilter,
  getTelegramSubscriberByChatId, getTelegramSubscriberByUserId, getTelegramSubscriberStats,
  getTenderById, getTenderDetails, getTenderTask, getTenderTaskWorkspace,
  grantUserSubscription, INDUSTRY_CATEGORIES, IndustryCategory, isTenderDeliveredToUser,
  listApprovedTelegramSubscribers, listTelegramSubscribers, listTenderNotes, listTenders,
  listTenderWorkflow, recordTelegramDelivery, rewardReferrer, saveTelegramFilter,
  saveTenderWorkflow, seedTenderTaskTemplate, touchTelegramSubscriberActivity,
  updateTelegramSubscriberStatus, updateTenderTask, verifyTelegramWebLoginCode,
  NotificationSchedule, matchesIndustryCategory,
} from "./db";
import {
  REGIONS,
  getLocalityLabel,
  getRegionById,
  localities,
  matchesTenderLocation
} from "./localities";
import { explainTenderMatch } from "./tender-matching";
import type { CompanyProfile, TelegramSubscriber, TenderRecord, TenderStage } from "./tender-types";

function getBotToken(): string {
  const env = (globalThis as unknown as { __QAZTENDER_ENV?: Record<string, string> }).__QAZTENDER_ENV;
  return process.env.TELEGRAM_BOT_TOKEN || env?.TELEGRAM_BOT_TOKEN || "8719115205:AAFO6sZ6p0HN_IKFFpnDGp97fTYQ6hxTpoM";
}

export function getAdminChatId(): string {
  const env = (globalThis as unknown as { __QAZTENDER_ENV?: Record<string, string> }).__QAZTENDER_ENV;
  return process.env.ADMIN_TELEGRAM_CHAT_ID || env?.ADMIN_TELEGRAM_CHAT_ID || "964524397";
}

export function isSubActive(sub: TelegramSubscriber): { active: boolean; isTrial: boolean; daysLeft: number; expiresStr: string } {
  const adminId = getAdminChatId();
  if (sub.chatId === adminId) {
    return { active: true, isTrial: false, daysLeft: 9999, expiresStr: "Бессрочно (Администратор)" };
  }

  const now = Date.now();
  const subExpires = sub.subscriptionExpiresAt || 0;
  const trialExpires = sub.trialExpiresAt || (sub.createdAt + 3 * 24 * 60 * 60 * 1000);

  if (subExpires > now) {
    const daysLeft = Math.ceil((subExpires - now) / 86400000);
    const expiresStr = dateFormatter.format(subExpires);
    return { active: true, isTrial: false, daysLeft, expiresStr };
  }

  if (trialExpires > now) {
    const daysLeft = Math.ceil((trialExpires - now) / 86400000);
    const expiresStr = dateFormatter.format(trialExpires);
    return { active: true, isTrial: true, daysLeft, expiresStr };
  }

  const lastExpire = subExpires || trialExpires;
  const expiresStr = dateFormatter.format(lastExpire);
  return { active: false, isTrial: !subExpires, daysLeft: 0, expiresStr };
}

export function parseCustomBudgetAmount(input: string): number | null {
  const clean = input.toLowerCase().replace(/₸|тенге|тг|бюджет|до|сумма|максимум/gi, "").trim();
  if (/^(0|любой|все|сброс|любая|без ограничений|все суммы)$/i.test(clean)) {
    return 0;
  }
  // Billions (млрд, b, миллиард)
  const billionMatch = clean.match(/^([\d.,]+)\s*(млрд|b|миллиард)/i);
  if (billionMatch) {
    const val = parseFloat(billionMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0) return Math.round(val * 1_000_000_000);
  }
  // Millions (млн, m, миллион)
  const millionMatch = clean.match(/^([\d.,]+)\s*(млн|m|миллион)/i);
  if (millionMatch) {
    const val = parseFloat(millionMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0) return Math.round(val * 1_000_000);
  }
  // Thousands (тыс, k, тысяч)
  const thousandMatch = clean.match(/^([\d.,]+)\s*(тыс|k|тысяч)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1].replace(",", "."));
    if (!isNaN(val) && val > 0) return Math.round(val * 1_000);
  }
  // Plain numbers (e.g. "35 000 000" or "35000000")
  const numericOnly = clean.replace(/\s+/g, "").replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(numericOnly)) {
    const val = parseFloat(numericOnly);
    if (!isNaN(val) && val >= 0) return Math.round(val);
  }
  return null;
}

export const pendingBudgetInput = new Map<string, number>();

export function formatPaywallMessage(chatId: string | number, username?: string, firstName?: string) {
  const userTag = username ? `@${username}` : (firstName || "Пользователь");
  const waText = encodeURIComponent(`Здравствуйте! Хочу оплатить подписку на QazTender Radar.\nМой Telegram: ${userTag} (ID: ${chatId})`);
  const waUrl = `https://wa.me/77773828303?text=${waText}`;

  const text = `🔒 <b>ВАШ БЕСПЛАТНЫЙ ДОСТУП ЗАВЕРШЁН</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
    `Чтобы продолжить находить прибыльные закупки и выигрывать тендеры:\n\n` +
    `💼 <b>ТАРИФНЫЕ ПЛАНЫ QAZTENDER RADAR:</b>\n` +
    `🥉 <b>1 месяц (Стандарт)</b> — <code>14 990 ₸</code>\n` +
    `🥈 <b>3 месяца (Выгодный -20%)</b> — <code>34 990 ₸</code> <i>(11 660 ₸/мес)</i>\n` +
    `🥇 <b>12 месяцев (VIP Безлимит -45%)</b> — <code>99 000 ₸</code> <i>(8 250 ₸/мес + персональный менеджер)</i>\n\n` +
    `📲 <b>Оплата через Kaspi Gold / Kaspi Pay:</b>\n` +
    `Номер Kaspi: <code>87773828303</code> (Нурсултан А.)\n` +
    `В назначении перевода укажите ваш ID: <code>${chatId}</code>\n\n` +
    `💡 <i>Хотите продлить бесплатно? Пригласите коллегу по ссылке и получите <b>+3 дня</b> в подарок!</i>`;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "💳 Оплатить через Kaspi (Реквизиты)", callback_data: "pay_kaspi" }],
      [{ text: "🧾 Я оплатил (Отправить чек)", callback_data: "submit_receipt" }],
      [{ text: "🎁 Получить +3 дня бесплатно (Пригласить друга)", callback_data: "cmd_ref" }],
      [{ text: "📲 Написать в WhatsApp (+7 777 382 83 03)", url: waUrl }],
      [{ text: "💬 Написать разработчику в TG (@mielonur)", url: "https://t.me/mielonur" }],
      [{ text: "🔄 Проверить статус подписки", callback_data: "check_subscription" }],
    ],
  };

  return { text, reply_markup };
}

export const MAIN_INLINE_MENU = {
  inline_keyboard: [
    [{ text: "🎯 Мои тендеры", callback_data: "cmd_my_tenders" }, { text: "📁 Мои в работе", callback_data: "cmd_inwork" }],
    [{ text: "🔥 Горящие лоты", callback_data: "cmd_hot" }, { text: "💎 Топ по сумме", callback_data: "cmd_top" }],
    [{ text: "⚙️ Настроить фильтр", callback_data: "cmd_filter" }, { text: "🌐 Войти на сайт", callback_data: "cmd_web" }],
    [{ text: "🎁 Пригласить друга (+3 дн.)", callback_data: "cmd_ref" }, { text: "💼 Тарифы и связь", callback_data: "cmd_pricing" }],
    [{ text: "📈 Мой статус", callback_data: "cmd_status" }, { text: "ℹ️ Справка", callback_data: "cmd_info" }],
  ],
};

export const ADMIN_INLINE_MENU = {
  inline_keyboard: [
    [{ text: "📊 Статистика и CRM", callback_data: "cmd_stats" }, { text: "🎯 Мои тендеры", callback_data: "cmd_my_tenders" }],
    [{ text: "🔥 Горящие лоты", callback_data: "cmd_hot" }, { text: "💎 Топ по сумме", callback_data: "cmd_top" }],
    [{ text: "⚙️ Настроить фильтр", callback_data: "cmd_filter" }, { text: "🌐 Войти на сайт", callback_data: "cmd_web" }],
    [{ text: "🎁 Рефералы", callback_data: "cmd_ref" }, { text: "ℹ️ Справка", callback_data: "cmd_info" }],
  ],
};

export const MAIN_REPLY_KEYBOARD = {
  remove_keyboard: true,
};

function getLocalityLabel(val: string): string {
  const item = localities.find((l) => l.value === val);
  return item ? item.label : "Все населённые пункты";
}

function getCategoryLabel(val: string): string {
  const item = INDUSTRY_CATEGORIES.find((c) => c.id === val);
  return item ? item.label : "🌐 Все сферы деятельности";
}

const userSearchTimestamps = new Map<string, number[]>();
const userActionTimestamps = new Map<string, number[]>();
const userCooldownUntil = new Map<string, number>();
const userApplicationMode = new Map<string, { inProgress: boolean; referrerChatId?: string }>();

export const MAX_SEARCHES_PER_HOUR = 10; // 10 searches per hour for free text search / tender matching
export const MAX_BURST_ACTIONS = 6; // max 6 button clicks / commands within 4 seconds (Anti-Flood)

export function checkFloodSpam(chatId: string | number): { blocked: boolean; remainingSeconds: number } {
  const idStr = String(chatId);
  const adminId = getAdminChatId();
  if (idStr === adminId) return { blocked: false, remainingSeconds: 0 };

  const now = Date.now();
  const cooldown = userCooldownUntil.get(idStr) || 0;
  if (now < cooldown) {
    return { blocked: true, remainingSeconds: Math.ceil((cooldown - now) / 1000) };
  }

  const fourSecAgo = now - 4000;
  let timestamps = (userActionTimestamps.get(idStr) || []).filter((ts) => ts > fourSecAgo);
  timestamps.push(now);
  userActionTimestamps.set(idStr, timestamps);

  if (timestamps.length > MAX_BURST_ACTIONS) {
    const penaltyMs = 60 * 1000; // 60s cooldown
    userCooldownUntil.set(idStr, now + penaltyMs);
    return { blocked: true, remainingSeconds: 60 };
  }

  return { blocked: false, remainingSeconds: 0 };
}

export function checkSearchRateLimit(chatId: string | number): { allowed: boolean; remaining: number; resetMinutes: number } {
  const idStr = String(chatId);
  const adminId = getAdminChatId();
  if (idStr === adminId) return { allowed: true, remaining: 9999, resetMinutes: 0 };

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  let timestamps = (userSearchTimestamps.get(idStr) || []).filter((ts) => ts > oneHourAgo);

  if (timestamps.length >= MAX_SEARCHES_PER_HOUR) {
    const oldest = timestamps[0];
    const resetMinutes = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
    userSearchTimestamps.set(idStr, timestamps);
    return { allowed: false, remaining: 0, resetMinutes };
  }

  timestamps.push(now);
  userSearchTimestamps.set(idStr, timestamps);
  return { allowed: true, remaining: MAX_SEARCHES_PER_HOUR - timestamps.length, resetMinutes: 0 };
}

export const SCHEDULE_LABELS: Record<NotificationSchedule, string> = {
  "3times": "⚡ 3 раза в день (09:00, 14:00, 19:00)",
  "morning": "🌅 Только утром (~09:00)",
  "afternoon": "☀️ Только в обед (~14:00)",
  "evening": "🌆 Только вечером (~19:00)",
  "instant": "🔔 Мгновенно о новых лотах",
  "off": "🔕 Только вручную (без авто-сообщений)",
};

export async function sendFilterSettingsMessage(chatId: string | number) {
  const currentFilter = await getTelegramFilter(String(chatId));
  const locLabel = getLocalityLabel(currentFilter.locality);
  const catLabel = getCategoryLabel(currentFilter.category);
  const budgetLabel = currentFilter.maxBudget > 0 ? `До ${moneyFormatter.format(currentFilter.maxBudget)}` : "Любой";
  const scheduleLabel = SCHEDULE_LABELS[currentFilter.schedule] || "⚡ 3 раза в день (09:00, 14:00, 19:00)";

  const msg = `⚙️ <b>НАСТРОЙКИ ВАШЕГО ФИЛЬТРА И АВТО-УВЕДОМЛЕНИЙ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📍 <b>Регион / Город / Село:</b>\n👉 <code>${locLabel}</code>\n\n` +
    `📁 <b>Сфера деятельности / Ниша:</b>\n👉 <code>${catLabel}</code>\n\n` +
    `💰 <b>Бюджет:</b> ${budgetLabel}\n\n` +
    `⏰ <b>Авто-присылание новых тендеров:</b>\n👉 <code>${scheduleLabel}</code>\n\n` +
    `💡 <i>Нажмите кнопку ниже, чтобы настроить параметры:</i>`;

  const buttons = [
    [{ text: "📍 Сменить город / район / село", callback_data: "menu_locality" }],
    [{ text: "📁 Сменить сферу деятельности", callback_data: "menu_category" }],
    [{ text: currentFilter.maxBudget > 0 ? "💰 Бюджет: Ограничен" : "💰 Бюджет: Любой", callback_data: "menu_budget" }],
    [{ text: "⏰ Время и частота уведомлений", callback_data: "menu_schedule" }],
    [{ text: "🎯 Показать подходящие тендеры", callback_data: "cmd_my_tenders" }],
  ];

  await sendTelegramMessage(chatId, msg, { reply_markup: { inline_keyboard: buttons } });
}

export async function registerBotCommands(): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    const commands = [
      { command: "menu", description: "📋 Главное меню платформы" },
      { command: "tenders", description: "🎯 Мои подобранные тендеры" },
      { command: "inwork", description: "📁 Мои закупки в работе" },
      { command: "hot", description: "🔥 Горящие лоты перед дедлайном" },
      { command: "top", description: "💎 Топ тендеров по бюджету" },
      { command: "filter", description: "⚙️ Настроить город, сферу и сумму" },
      { command: "web", description: "🌐 Войти на сайт QazTender Radar" },
      { command: "ref", description: "🎁 Пригласить друга (+3 дня)" },
      { command: "status", description: "📈 Мой статус подписки и лимиты" },
      { command: "pricing", description: "💼 Тарифы и связь с разработчиком" },
      { command: "hide", description: "❌ Убрать клавиатуру с экрана" },
    ];
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string, options?: {
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    is_persistent?: boolean;
    remove_keyboard?: boolean;
  };
  parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
}): Promise<{ ok: boolean; message_id?: number; description?: string }> {
  const token = getBotToken();
  if (!token) return { ok: false, description: "No bot token configured" };

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode ?? "HTML",
    disable_web_page_preview: true,
  };

  if (options?.reply_markup) {
    payload.reply_markup = options.reply_markup;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    return {
      ok: data.ok,
      message_id: data.result?.message_id,
      description: data.description,
    };
  } catch (error) {
    return { ok: false, description: error instanceof Error ? error.message : "Failed to send message" };
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text ?? "",
        show_alert: showAlert,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function editTelegramMessageText(
  chatId: string | number,
  messageId: number,
  text: string,
  options?: {
    reply_markup?: {
      inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
    };
    parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
  }
): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parse_mode ?? "HTML",
        disable_web_page_preview: true,
        reply_markup: options?.reply_markup ?? { inline_keyboard: [] },
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteTelegramMessage(chatId: string | number, messageId: number): Promise<boolean> {
  const token = getBotToken();
  if (!token) return false;
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    return true;
  } catch {
    return false;
  }
}

const moneyFormatter = new Intl.NumberFormat("ru-KZ", { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Almaty", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STAGE_LABELS: Record<string, string> = {
  studying: "⏳ Изучаем",
  preparing: "📝 Готовим заявку",
  applied: "🚀 Подали заявку",
  won: "🏆 Победили",
  lost: "❌ Проиграли",
};

export function formatSingleTenderReviewCard(tender: TenderRecord, currentIndex: number, totalCount: number, nextOffset: number) {
  const days = tender.endDate ? Math.ceil((tender.endDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  let text = `🔍 <b>ИНДИВИДУАЛЬНЫЙ ПОДБОР ТЕНДЕРА [${currentIndex} из ${totalCount}]</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>№ ${tender.numberAnno}</b> · ${tender.methodName}\n`;
  text += `📌 <b>${tender.title}</b>\n\n`;
  text += `💰 <b>Бюджет:</b> ${moneyFormatter.format(tender.budget)}\n`;
  text += `🏢 <b>Заказчик:</b> ${tender.buyer}\n`;
  text += `📍 <b>Регион:</b> ${tender.regionName}\n`;
  text += `⏳ <b>Приём заявок:</b> ${tender.endDate ? `${dateFormatter.format(tender.endDate)} (${days !== null ? `${days} дн.` : "скоро"})` : "Не указано"}\n\n`;
  text += `<i>Вам интересен данный лот?</i>`;

  const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [
    [
      { text: "💚 👍 Интересно (В избранное)", callback_data: `swipe_yes:${tender.externalId}:${nextOffset}` },
    ],
    [
      { text: "📁 В работу", callback_data: `swipe_work:${tender.externalId}:${nextOffset}` },
      { text: "🌐 На Госзакупки", url: tender.sourceUrl },
    ],
    [
      { text: "❌ 👎 Не интересно (Пропустить)", callback_data: `swipe_no:${tender.externalId}:${nextOffset}` },
    ],
    [
      { text: "📋 Завершить просмотр", callback_data: "cmd_filter" },
    ],
  ];

  return { text, buttons, reply_markup: { inline_keyboard: buttons } };
}

export function formatTenderTelegramCard(tender: TenderRecord, profile?: CompanyProfile | null, note?: string, isAdmin = false, currentStage?: string) {
  const match = profile ? explainTenderMatch(tender, profile) : null;
  const days = tender.endDate ? Math.ceil((tender.endDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  let text = `🏛 <b>ГОСЗАКУПКИ РК</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📋 <b>№ ${tender.numberAnno}</b> · ${tender.methodName}\n`;
  text += `📌 <b>${tender.title}</b>\n\n`;
  text += `💰 <b>Бюджет:</b> ${moneyFormatter.format(tender.budget)}\n`;
  text += `🏢 <b>Заказчик:</b> ${tender.buyer}\n`;
  text += `📍 <b>Регион:</b> ${tender.regionName}\n`;
  text += `⏳ <b>Приём заявок:</b> ${tender.endDate ? `${dateFormatter.format(tender.endDate)} (${days !== null ? `${days} дн.` : "скоро"})` : "Не указано"}\n`;

  if (currentStage && STAGE_LABELS[currentStage]) {
    text += `📂 <b>Статус:</b> <code>${STAGE_LABELS[currentStage]}</code>\n`;
  }

  if (match && match.matchedKeywords.length > 0) {
    text += `\n🎯 <b>Ключевые слова:</b> ${match.matchedKeywords.join(", ")}`;
  }

  if (note) {
    text += `\n\n💬 <b>Комментарий:</b>\n<i>«${note}»</i>`;
  }

  const buttons: Array<Array<{ text: string; url?: string; callback_data?: string }>> = [
    [
      { text: "🌐 На Goszakup", url: tender.sourceUrl },
      { text: "★ В избранное", callback_data: `fav:${tender.externalId}` },
    ],
    [
      { text: "📂 Статус в работе", callback_data: `menu_stage:${tender.externalId}` },
      { text: "📑 Чек-лист", callback_data: `tasks:${tender.externalId}` },
      { text: "📦 Лоты", callback_data: `lots:${tender.externalId}` },
    ],
    [
      { text: "💬 Заметки", callback_data: `notes:${tender.externalId}` },
      { text: "⛔ Скрыть", callback_data: `hide:${tender.externalId}` },
    ],
  ];

  if (isAdmin) {
    buttons.push([
      { text: "👤 Назначить сотруднику", callback_data: `delegate:${tender.externalId}` },
    ]);
  }

  return { text, buttons, reply_markup: { inline_keyboard: buttons } };
}

export async function notifyAdminAboutNewRequest(user: { id: string; username: string }, companyProfile: CompanyProfile | null, telegramUser: { id: number; username?: string; first_name?: string }) {
  const adminChatId = getAdminChatId();
  if (!adminChatId) return;

  const dateStr = dateFormatter.format(Date.now());
  let text = `🔔 <b>НОВАЯ ЗАЯВКА НА ПОДКЛЮЧЕНИЕ TELEGRAM</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 <b>Пользователь:</b> @${user.username}\n`;
  text += `🏢 <b>Компания:</b> ${companyProfile?.companyName || "Не указано"}\n`;
  text += `📍 <b>Регионы:</b> ${companyProfile?.regions?.join(", ") || "Все"}\n`;
  text += `✈️ <b>Telegram:</b> ${telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name || "—"} (ID: <code>${telegramUser.id}</code>)\n`;
  text += `📅 <b>Дата:</b> ${dateStr}\n\n`;
  text += `Одобрить получение персональных уведомлений по тендерам?`;

  const buttons = [
    [
      { text: "✅ Одобрить доступ", callback_data: `approve_user:${user.id}:${telegramUser.id}` },
      { text: "❌ Отклонить", callback_data: `reject_user:${user.id}:${telegramUser.id}` },
    ],
  ];

  await sendTelegramMessage(adminChatId, text, { reply_markup: { inline_keyboard: buttons } });
}

export async function handleTelegramUpdate(update: {
  message?: {
    chat: { id: number; username?: string; first_name?: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string; first_name?: string };
    message?: { chat: { id: number }; message_id: number; text?: string };
    data?: string;
  };
}) {
  const adminChatId = getAdminChatId();

  // 1. Handling incoming text messages (/start, /status, /help, etc.)
  if (update.message?.text) {
    const text = update.message.text.trim();
    const chatId = String(update.message.chat.id);
    const tgUser = update.message.from ?? update.message.chat;

    // 1. Anti-Flood Spam Protection
    const flood = checkFloodSpam(chatId);
    if (flood.blocked) {
      await sendTelegramMessage(chatId, `🛑 <b>Слишком частые действия (анти-спам защита)</b>\n\nПожалуйста, подождите <b>${flood.remainingSeconds} сек.</b> перед следующим запросом.`);
      return { ok: true };
    }

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1]?.trim();

      if (token) {
        const userId = await consumeTelegramConnectToken(token);
        if (userId) {
          const user = await getDbUserById(userId);
          const profile = await getCompanyProfile(userId);
          const isAdmin = user?.role === "super_admin" || String(tgUser.id) === adminChatId;

          // Create or update subscriber
          await createOrUpdateTelegramSubscriber({
            userId,
            chatId,
            username: tgUser.username ?? "",
            firstName: tgUser.first_name ?? "",
            status: isAdmin ? "approved" : "pending",
          });

          if (isAdmin) {
            await sendTelegramMessage(chatId, `👑 <b>Здравствуйте, Главный Администратор!</b>\n\nВаш Telegram успешно подключён к <b>QazTender Radar</b>. Сюда будут приходить заявки сотрудников на модерацию и системные отчёты.`);
          } else {
            await sendTelegramMessage(chatId, `⏳ <b>Заявка принята!</b>\n\nВаш аккаунт связан с ботом и отправлен Главному Администратору на одобрение.\n\nКак только администратор подтвердит доступ, вам начнут приходить лучшие тендеры и напоминания о дедлайнах.`);
            if (user) {
              await notifyAdminAboutNewRequest(user, profile, tgUser);
            }
          }
          return { ok: true };
        } else {
          await sendTelegramMessage(chatId, `⚠️ <b>Срок действия ссылки истёк или она недействительна.</b>\n\nПожалуйста, вернитесь на сайт QazTender Radar и нажмите кнопку «Подключить Telegram» заново.`);
          return { ok: true };
        }
      }

      // Direct Telegram Onboarding without website requirement
      if (chatId === adminChatId) {
        await sendTelegramMessage(chatId, `👑 <b>Здравствуйте, Главный Администратор!</b>\n━━━━━━━━━━━━━━━━━━━━\nВы авторизованы в <b>QazTender Radar</b>.\n\n⚡ <b>Быстрые функции:</b>\n• <b>📊 Статистика и CRM</b> — сколько людей пользуются ботом\n• <b>🎯 Мои тендеры</b> — подборка закупок по РК\n• <b>📁 Мои в работе</b> — воронка стадий и чек-листы документов\n• <b>🔥 Горящие тендеры</b> — срочные закупки перед дедлайном\n• <b>⚙️ Настроить фильтр</b> — выбор городов, отраслей и бюджета\n\n🔔 <i>Новые пользователи автоматически получают 3 дня бесплатного доступа.</i>`, {
          reply_markup: ADMIN_INLINE_MENU,
        });
        return { ok: true };
      }

      if (text === "/start web" || text === "/web" || text === "🌐 Войти на сайт") {
        const sub = await getTelegramSubscriberByChatId(chatId);
        const userId = sub ? sub.userId : `tg_${chatId}`;
        const login = await createTelegramWebLogin(chatId, userId);
        const webUrl = `https://qaztender-radar-xf7n.onrender.com/api/auth/telegram-login?token=${login.token}`;

        await sendTelegramMessage(chatId, `🌐 <b>ВХОД НА САЙТ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `Ваш персональный доступ к сайту готов!\n\n` +
          `🔑 <b>Ваш 6-значный код:</b>\n<code>${login.code}</code>\n\n` +
          `Либо просто нажмите кнопку ниже, чтобы <b>мгновенно войти на сайт в 1 клик</b> без ввода кода:\n\n` +
          `⏳ <i>Код и ссылка действуют 15 минут.</i>`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Войти на сайт в 1 клик", url: webUrl }],
            ],
          },
        });
        return { ok: true };
      }

      let sub = await getTelegramSubscriberByChatId(chatId);
      if (!sub) {
        // Instant seamless auto-registration with 3-day (or 6-day if ref) trial!
        const referrerChatId = text.startsWith("/start ref_") ? text.replace("/start ref_", "").trim() : "";
        const userId = `tg_${chatId}`;
        const bonusDays = referrerChatId ? 6 : 3;
        const trialExpiresAt = Date.now() + bonusDays * 24 * 60 * 60 * 1000;
        const trialDateStr = dateFormatter.format(trialExpiresAt);
        const userLabel = tgUser.username ? `@${tgUser.username}` : (tgUser.first_name || "Новый пользователь");

        sub = await createOrUpdateTelegramSubscriber({
          userId,
          chatId,
          username: tgUser.username ?? "",
          firstName: tgUser.first_name ?? "",
          companyInfo: "Зарегистрирован через Telegram",
          status: "approved",
          paymentStatus: "trial",
          trialExpiresAt,
          referredByChatId: referrerChatId,
        });

        // Reward referrer if applicable
        if (referrerChatId && referrerChatId !== chatId) {
          const rewarded = await rewardReferrer(referrerChatId, 3);
          if (rewarded) {
            const refExpStr = dateFormatter.format(rewarded.subscriptionExpiresAt || rewarded.trialExpiresAt || Date.now());
            await sendTelegramMessage(referrerChatId, `🎉 <b>БОНУС ЗА РЕФЕРАЛА!</b>\n━━━━━━━━━━━━━━━━━━━━\nПо вашей ссылке зарегистрировался <b>${userLabel}</b>!\n\nВам начислено <b>+3 дня</b> бесплатного доступа к QazTender Radar!\nНовый срок действия: до <b>${refExpStr}</b> (всего приглашено: ${rewarded.referralsCount || 1} чел.) 🚀`);
          }
        }

        // Informative notification to Admin
        const stats = await getTelegramSubscriberStats();
        const refNote = referrerChatId ? `\n🔗 <b>Пригласил:</b> <code>${referrerChatId}</code> (+6 дн.)` : "";
        const adminNotify = `👤 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ В БОТЕ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>Пользователь:</b> ${userLabel} (ID: <code>${chatId}</code>)\n` +
          `🎁 <b>Доступ:</b> ${bonusDays} дней бесплатно (до ${trialDateStr})${refNote}\n\n` +
          `📊 <b>Всего пользователей в системе:</b> <b>${stats.totalUsers} чел.</b> (активных: ${stats.activeToday})\n\n` +
          `<i>ℹ️ Доступ активирован автоматически на ${bonusDays} дней. Никаких подтверждений не требуется.</i>`;

        await sendTelegramMessage(adminChatId, adminNotify);

        const bonusBadge = referrerChatId ? `🎁 Вам начислен БОНУС ПО ПРИГЛАШЕНИЮ: <b>6 ДНЕЙ БЕСПЛАТНО</b>` : `🎁 Вам открыт <b>ПОЛНЫЙ ДОСТУП НА 3 ДНЯ БЕСПЛАТНО</b>`;
        const welcomeMsg = `👋 <b>ДОБРО ПОЖАЛОВАТЬ В QAZTENDER RADAR!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `Здравствуйте, <b>${tgUser.first_name || "партнёр"}</b>!\n\n` +
          `${bonusBadge} (до <b>${trialDateStr}</b>)!\n\n` +
          `Вам сразу доступны все инструменты платформы:\n` +
          `• 🎯 <b>Мои тендеры</b> — подборка закупок по вашим ключевым словам\n` +
          `• ⚙️ <b>Настроить фильтр</b> — выбор региона, сферы и бюджета\n` +
          `• 📁 <b>Мои в работе</b> — персональная воронка и чек-листы документов РК\n` +
          `• 🔥 <b>Горящие тендеры</b> — топ срочных лотов перед дедлайном\n` +
          `• 🌐 <b>Войти на сайт</b> — веб-кабинет без паролей (/web)\n` +
          `• 🎁 <b>Пригласить друга</b> — получайте +3 дня за каждого друга (/ref)\n\n` +
          `<i>Воспользуйтесь меню ниже или кнопкой <b>[/]</b> слева внизу:</i>`;

        await sendTelegramMessage(chatId, welcomeMsg, { reply_markup: MAIN_INLINE_MENU });
        return { ok: true };
      }

      // If existing user
      const subCheck = isSubActive(sub);
      if (subCheck.active) {
        const typeBadge = subCheck.isTrial ? `🎁 Бесплатный период (осталось ${subCheck.daysLeft} дн. до ${subCheck.expiresStr})` : `💎 Подписка активна (до ${subCheck.expiresStr})`;
        await sendTelegramMessage(chatId, `✅ <b>Здравствуйте, ${tgUser.first_name || "партнёр"}!</b>\n━━━━━━━━━━━━━━━━━━━━\nСтатус: <b>${typeBadge}</b>\n\nВам доступны все возможности QazTender Radar:\n• 🎯 <b>Мои тендеры</b> — подборка по вашим фильтрам и региону\n• 📁 <b>Мои в работе</b> — персональная воронка стадий и чек-листы документов РК\n• 🔥 <b>Горящие тендеры</b> — срочные закупки перед дедлайном\n• ⚙️ <b>Настроить фильтр</b> — выбор города, отрасли и суммы\n• 🌐 <b>Войти на сайт</b> — веб-кабинет (/web)\n• 🎁 <b>Рефералы</b> — приглашайте друзей и получайте +3 дня (/ref)\n\n<i>Воспользуйтесь кнопками меню:</i>`, {
          reply_markup: MAIN_INLINE_MENU,
        });
      } else {
        const pw = formatPaywallMessage(chatId, tgUser.username, tgUser.first_name);
        await sendTelegramMessage(chatId, pw.text, { reply_markup: pw.reply_markup });
      }
      return { ok: true };
    }

    // Touch subscriber activity timestamp
    await touchTelegramSubscriberActivity(chatId === adminChatId ? "admin" : `tg_${chatId}`);

    // Gate: check subscriber status & paywall for non-admin users
    if (chatId !== adminChatId) {
      let sub = await getTelegramSubscriberByChatId(chatId);
      if (!sub) {
        const userId = `tg_${chatId}`;
        const trialExpiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000;
        sub = await createOrUpdateTelegramSubscriber({
          userId,
          chatId,
          username: tgUser.username ?? "",
          firstName: tgUser.first_name ?? "",
          status: "approved",
          paymentStatus: "trial",
          trialExpiresAt,
        });
      }

      // Check if trial or subscription is active
      const subCheck = isSubActive(sub);
      if (!subCheck.active) {
        // Expired! Show paywall with Kaspi and WhatsApp details
        const pw = formatPaywallMessage(chatId, tgUser.username, tgUser.first_name);
        await sendTelegramMessage(chatId, pw.text, { reply_markup: pw.reply_markup });
        return { ok: true };
      }
    }

    if (text === "/menu" || text === "📋 Главное меню" || text === "📋 Меню") {
      const isAdm = chatId === adminChatId;
      await sendTelegramMessage(chatId, `📋 <b>ГЛАВНОЕ МЕНЮ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\nВыберите нужный раздел платформы:`, {
        reply_markup: isAdm ? ADMIN_INLINE_MENU : MAIN_INLINE_MENU,
      });
      return { ok: true };
    }

    if (text === "/hide" || text === "/close" || text === "/keyboard_off") {
      await sendTelegramMessage(chatId, "✅ Клавиатура скрыта. Чтобы открыть меню, напишите <code>/menu</code> или нажмите кнопку <b>[/]</b> слева внизу.", {
        reply_markup: { remove_keyboard: true },
      });
      return { ok: true };
    }

    if (text === "/hot" || text === "🔥 Горящие тендеры") {
      const tenders = await listTenders(100);
      const now = Date.now();
      const hot = tenders
        .filter((t) => t.endDate && t.endDate > now)
        .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0))
        .slice(0, 3);

      if (hot.length === 0) {
        await sendTelegramMessage(chatId, "ℹ️ На данный момент нет срочных активных объявлений. Запустите синхронизацию на сайте.");
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `🔥 <b>ТОП-3 ГОРЯЩИХ ТЕНДЕРА (СКОРО ДЕДЛАЙН):</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of hot) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/top" || text === "💎 Топ по бюджету") {
      const tenders = await listTenders(100);
      const top = [...tenders].sort((a, b) => b.budget - a.budget).slice(0, 3);

      if (top.length === 0) {
        await sendTelegramMessage(chatId, "ℹ️ Тендеры ещё не загружены в базу.");
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `💎 <b>ТОП-3 КРУПНЕЙШИХ ТЕНДЕРА ПО БЮДЖЕТУ:</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of top) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/digest" || text === "📊 Сводка рынка" || text === "📊 Сводка") {
      const tenders = await listTenders(500);
      const now = Date.now();
      const active = tenders.filter((t) => !t.endDate || t.endDate > now);
      const hotCount = active.filter((t) => t.endDate && (t.endDate - now) <= 3 * 86400000).length;
      const totalBudget = active.reduce((acc, t) => acc + t.budget, 0);

      const msg = `📊 <b>СВОДКА ТЕНДЕРОВ НА СЕГОДНЯ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Всего активных объявлений: <b>${active.length}</b>\n` +
        `🔥 Срочных (дедлайн ≤ 3 дней): <b>${hotCount}</b>\n` +
        `💰 Общий объём закупок: <b>${moneyFormatter.format(totalBudget)}</b>\n\n` +
        `💡 <i>Нажмите /hot для просмотра срочных или /top для крупных закупок.</i>`;

      await sendTelegramMessage(chatId, msg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/status" || text === "📈 Мой статус") {
      if (chatId === adminChatId) {
        const subs = await listTelegramSubscribers();
        const activeCount = subs.filter((s) => s.chatId !== adminChatId && isSubActive(s).active).length;
        await sendTelegramMessage(chatId, `👑 <b>Статус: Главный Администратор</b>\n━━━━━━━━━━━━━━━━━━━━\nChat ID: <code>${chatId}</code>\nДоступ: Полный административный\nПользователей в базе: ${subs.length - 1} (активных: ${activeCount})\n\n⚡ <b>Команды управления:</b>\n• <code>/crm</code> или <code>/users</code> — база пользователей и подписок\n• <code>/grant CHAT_ID ДНИ</code> — выдать или продлить подписку\n• <code>/reapply_all</code> — запросить повторную анкету`);
        return { ok: true };
      }

      const existing = await getTelegramSubscriberByChatId(chatId);
      if (!existing) {
        await sendTelegramMessage(chatId, `ℹ️ <b>Для использования бота заполните короткую анкету:</b>`, {
          reply_markup: {
            inline_keyboard: [[{ text: "📝 Заполнить анкету", callback_data: "apply_access" }]],
          },
        });
      } else {
        const check = isSubActive(existing);
        const typeBadge = check.active ? (check.isTrial ? `🎁 Бесплатный триал (осталось ${check.daysLeft} дн.)` : `💎 Платная подписка`) : `🔒 Срок истёк`;
        await sendTelegramMessage(chatId, `📊 <b>ВАШ СТАТУС ПОДПИСКИ</b>\n━━━━━━━━━━━━━━━━━━━━\nСтатус: <b>${typeBadge}</b>\nДействует до: <b>${check.expiresStr}</b>\nЛимит запросов: ${rate.remaining}/${MAX_REQUESTS_PER_HOUR} в этот час\nМгновенные алерты: ${existing.instantEnabled ? "Вкл" : "Выкл"}\nДайджест: ${existing.digestEnabled ? "Вкл" : "Выкл"}\n\n<i>Для продления подписки нажмите «💼 Тарифы и связь».</i>`);
      }
      return { ok: true };
    }

    if (text.startsWith("/grant")) {
      if (chatId !== adminChatId) {
        await sendTelegramMessage(chatId, "❌ Доступно только Главному Администратору.");
        return { ok: true };
      }
      const parts = text.split(" ");
      const targetChatId = parts[1]?.trim();
      const days = parseInt(parts[2]?.trim() || "30", 10);
      if (!targetChatId || isNaN(days)) {
        await sendTelegramMessage(chatId, "ℹ️ Формат команды:\n<code>/grant CHAT_ID ДНИ</code>\nНапример:\n<code>/grant 777888999 30</code>");
        return { ok: true };
      }
      const updated = await grantUserSubscription(targetChatId, days, tgUser.username || "admin");
      if (!updated) {
        await sendTelegramMessage(chatId, `❌ Пользователь с ID <code>${targetChatId}</code> не найден в базе.`);
        return { ok: true };
      }
      const expStr = dateFormatter.format(updated.subscriptionExpiresAt || Date.now());
      await sendTelegramMessage(chatId, `✅ <b>Подписка успешно активирована!</b>\nПользователь ID: <code>${targetChatId}</code>\nПродлено на: <b>${days} дн.</b> (до ${expStr})`);

      await sendTelegramMessage(targetChatId, `🎉 <b>Ваша подписка на QazTender Radar успешно активирована!</b>\n━━━━━━━━━━━━━━━━━━━━\nСрок действия: <b>${days} дней</b> (до <b>${expStr}</b>).\n\nВам снова открыты все функции бота и мгновенные алерты!`, {
        reply_markup: MAIN_REPLY_KEYBOARD,
      });
      return { ok: true };
    }

    if (text === "/crm" || text === "/users" || text === "/stats" || text === "/analytics" || text.includes("Статистика") || text.includes("CRM") || text.includes("crm")) {
      const stats = await getTelegramSubscriberStats();
      let report = `📊 <b>СТАТИСТИКА АКТИВНОСТИ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 <b>Всего пользователей:</b> <b>${stats.totalUsers} чел.</b>\n` +
        `⚡ <b>Активных за 24 часа:</b> <b>${stats.activeToday} чел.</b>\n` +
        `🎁 <b>На бесплатном триале:</b> <b>${stats.activeTrial} чел.</b>\n` +
        `💎 <b>С активной подпиской:</b> <b>${stats.activePaid} чел.</b>\n` +
        `🔒 <b>С истекшим доступом:</b> <b>${stats.expired} чел.</b>\n` +
        `🔗 <b>Приглашено по рефералам:</b> <b>${stats.totalReferrals} чел.</b>\n\n` +
        `📋 <b>Пользователи в системе:</b>\n\n`;

      if (stats.subscribers.length === 0) {
        report += `<i>Пока нет зарегистрированных пользователей.</i>\n`;
      } else {
        for (const [idx, s] of stats.subscribers.slice(0, 10).entries()) {
          const check = isSubActive(s);
          const statusIcon = check.active ? (check.isTrial ? "⏳ Триал" : "✅ Оплачен") : "🔒 Истёк";
          const name = s.firstName || (s.username ? `@${s.username}` : "Пользователь");
          report += `<b>${idx + 1}. ${name}</b> (ID: <code>${s.chatId}</code>)\n` +
            `• Статус: <b>${statusIcon}</b> (до ${check.expiresStr}, ост. ${check.daysLeft} дн.)\n` +
            `• Рефералов: ${s.referralsCount || 0}\n\n`;
        }
      }
      report += `💡 <i>Выдать / продлить подписку:</i> <code>/grant CHAT_ID ДНИ</code>`;

      await sendTelegramMessage(chatId, report, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Обновить статистику", callback_data: "cmd_stats" }],
            [{ text: "🌐 Веб-панель администратора", url: "https://qaztender-radar-xf7n.onrender.com/admin/users" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/pricing" || text === "/tariff" || text === "💼 Тарифы и связь" || text === "💬 Написать разработчику" || text === "/contact" || text === "/developer") {
      const pricingMsg = `💼 <b>ТАРИФЫ И СВЯЗЬ С РАЗРАБОТЧИКОМ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>QazTender Radar</b> предлагает гибкие индивидуальные тарифы для поставщиков и тендерных специалистов:\n\n` +
        `🔹 <b>Индивидуальный специалист / ИП:</b>\n` +
        `• До 3 регионов поиска и алертов\n` +
        `• Мгновенные push-уведомления о новых лотах в Telegram\n` +
        `• Интерактивные чек-листы и персональная воронка\n\n` +
        `🏢 <b>Компания / ТОО (Корпоративный):</b>\n` +
        `• Мониторинг по всему Казахстану (все 20 регионов)\n` +
        `• Многопользовательский доступ для вашей команды\n` +
        `• Делегирование задач сотрудникам и заметки по лотам\n` +
        `• Прямая интеграция с реестром Госзакупок goszakup.gov.kz\n\n` +
        `🤝 <i>Нажмите кнопку ниже, чтобы написать разработчику в личные сообщения и обсудить стоимость и спец-условия:</i>`;

      await sendTelegramMessage(chatId, pricingMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Написать разработчику (@mielonur)", url: "https://t.me/mielonur" }],
            [{ text: "📝 Подать заявку на доступ", callback_data: "apply_access" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/ref" || text === "/referral" || text === "🎁 Пригласить друга (+3 дня)" || text === "🎁 Рефералы") {
      const sub = await getTelegramSubscriberByChatId(chatId);
      const refCount = sub?.referralsCount || 0;
      const refBonusDays = refCount * 3;
      const refLink = `https://t.me/QazTendeRadar_bot?start=ref_${chatId}`;
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🇰🇿 Рекомендую QazTender Radar — умный поиск госзакупок РК и дедлайны! Переходи по ссылке и получи 6 дней бесплатного доступа:")}`;

      const refMsg = `🎁 <b>ПРИГЛАШАЙТЕ ДРУЗЕЙ И ПОЛУЧАЙТЕ +3 ДНЯ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Поделитесь вашей персональной ссылкой с коллегами, партнёрами и предпринимателями:\n\n` +
        `🔗 <b>Ваша реферальная ссылка:</b>\n<code>${refLink}</code>\n\n` +
        `👥 <b>Условия бонусной программы:</b>\n` +
        `• <b>Приглашённый друг</b> получает <b>6 дней бесплатного доступа</b> (вместо 3)!\n` +
        `• <b>Вы получаете +3 дня</b> к вашей подписке за каждого зарегистрированного друга!\n\n` +
        `📊 <b>Ваша статистика:</b>\n` +
        `• Приглашено друзей: <b>${refCount} чел.</b>\n` +
        `• Начислено бонусов: <b>+${refBonusDays} дней</b>\n\n` +
        `<i>Нажмите кнопку ниже, чтобы переслать ссылку другу в Telegram:</i>`;

      await sendTelegramMessage(chatId, refMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📲 Поделиться ссылкой с другом", url: shareUrl }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/web" || text === "🌐 Войти на сайт") {
      const sub = await getTelegramSubscriberByChatId(chatId);
      const userId = sub ? sub.userId : `tg_${chatId}`;
      const login = await createTelegramWebLogin(chatId, userId);
      const webUrl = `https://qaztender-radar-xf7n.onrender.com/api/auth/telegram-login?token=${login.token}`;

      await sendTelegramMessage(chatId, `🌐 <b>ВХОД НА САЙТ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Ваш персональный доступ к сайту готов!\n\n` +
        `🔑 <b>Ваш 6-значный код для сайта:</b>\n<code>${login.code}</code>\n\n` +
        `Либо просто нажмите кнопку ниже, чтобы <b>мгновенно войти на сайт в 1 клик</b> без ввода кода:\n\n` +
        `⏳ <i>Код и ссылка действуют 15 минут.</i>`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Войти на сайт в 1 клик", url: webUrl }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/reapply_all" || text === "/reset_users") {
      if (chatId !== adminChatId) {
        await sendTelegramMessage(chatId, "❌ Доступно только Главному Администратору.");
        return { ok: true };
      }
      const res = await broadcastReapplyRequestToAllUsers();
      await sendTelegramMessage(chatId, `✅ <b>Запрос на повторное заполнение анкеты успешно отправлен ${res.notified} пользователям!</b>\n\nИх статус сброшен на «Ожидает заявки». Когда они отправят анкету, им будет выдан 3-дневный триал, а вам придет уведомление.`);
      return { ok: true };
    }

    if (text === "/info" || text === "ℹ️ Инфо" || text === "ℹ️ О системе" || text === "ℹ️ Справка о системе") {
      const infoMsg = `ℹ️ <b>О СИСТЕМЕ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>QazTender Radar</b> — радар и рабочее место для тендерных специалистов и поставщиков в Казахстане (Госзакупки goszakup.gov.kz).\n\n` +
        `🎯 <b>Ключевые возможности:</b>\n` +
        `• <b>Любые сферы бизнеса:</b> стройка, IT, поставка товаров, мебель, охрана, клининг, питание, транспорт, медицина\n` +
        `• <b>Точечный локальный фильтр:</b> выбор конкретного города (Туркестан, Кентау, Шаулдер), района и близлежащих сёл без шума по всей области\n` +
        `• <b>Защита от нагрузки:</b> лимит ${MAX_REQUESTS_PER_HOUR} запросов в час для стабильности серверов\n` +
        `• <b>Рабочее место:</b> чек-листы РК по 5 процедурам, заметки и таймлайн дедлайнов\n\n` +
        `⚡ <b>Быстрый поиск:</b> просто напишите боту ключевое слово (например: <i>компьютеры</i>, <i>мебель</i>, <i>охрана</i>, <i>Туркестан</i>) для мгновенного поиска!`;

      await sendTelegramMessage(chatId, infoMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "💬 Написать разработчику (@mielonur)", url: "https://t.me/mielonur" }],
            [{ text: "🔥 Горящие тендеры", callback_data: "cmd_hot" }, { text: "💎 Топ по бюджету", callback_data: "cmd_top" }],
            [{ text: "📊 Сводка дня", callback_data: "cmd_digest" }],
          ],
        },
      });
      return { ok: true };
    }

    if (text === "/inwork" || text === "📁 Мои в работе" || text === "📁 В работе") {
      const sub = await getTelegramSubscriberByChatId(chatId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${chatId}`;
      const workflows = await listTenderWorkflow(ownerKey);
      const inWork = workflows.filter((w) => w.stage && w.stage !== "none" && w.stage !== "skipped");

      if (inWork.length === 0) {
        await sendTelegramMessage(chatId, `📁 <b>У вас пока нет тендеров в работе.</b>\n\nЧтобы добавить тендер в работу, откройте любой тендер через «🎯 Мои тендеры» или «🔥 Горящие» и нажмите кнопку <b>[ 📂 Статус в работе ]</b>.`);
        return { ok: true };
      }

      await sendTelegramMessage(chatId, `📁 <b>ВАШИ ТЕНДЕРЫ В РАБОТЕ (${inWork.length}):</b>\n━━━━━━━━━━━━━━━━━━━━`);
      for (const item of inWork.slice(0, 5)) {
        const tender = await getTenderById(item.tenderId);
        if (tender) {
          const card = formatTenderTelegramCard(tender, null, undefined, chatId === adminChatId, item.stage);
          await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      }
      return { ok: true };
    }

    if (text.startsWith("/note")) {
      const parts = text.split(" ");
      const tenderId = parts[1]?.trim();
      const noteContent = parts.slice(2).join(" ").trim();

      if (!tenderId || !noteContent) {
        await sendTelegramMessage(chatId, `ℹ️ <b>Формат команды добавления заметки:</b>\n<code>/note НОМЕР_ТЕНДЕРА Текст вашей заметки</code>\n\n<i>Пример:</i>\n<code>/note 15234567-1 Согласовали с заказчиком минимальную цену 20 млн</code>`);
        return { ok: true };
      }

      const sub = await getTelegramSubscriberByChatId(chatId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${chatId}`;
      const authorName = tgUser.first_name || tgUser.username || "Специалист";

      try {
        await createTenderNote(tenderId, ownerKey, authorName, noteContent);
        await sendTelegramMessage(chatId, `✅ <b>Заметка успешно добавлена!</b>\n\nОна сохранена в базе и доступна как в Telegram, так и на веб-сайте.`);
      } catch (err) {
        await sendTelegramMessage(chatId, `❌ Не удалось сохранить заметку: ${err instanceof Error ? err.message : "Ошибка базы"}`);
      }
      return { ok: true };
    }

    if (text === "/my" || text === "🎯 Мои тендеры" || text === "/custom") {
      const searchLimit = checkSearchRateLimit(chatId);
      if (!searchLimit.allowed) {
        await sendTelegramMessage(chatId, `⏳ <b>Лимит поиска исчерпан (${MAX_SEARCHES_PER_HOUR} поисков в час)</b>\n\nДля защиты базы и стабильности работы действует лимит на глубокий подбор тендеров.\n\nЛимит обновится через <b>${searchLimit.resetMinutes} мин.</b>\nВы можете продолжать менять фильтры или использовать веб-дашборд.`);
        return { ok: true };
      }

      const currentFilter = await getTelegramFilter(String(chatId));
      const tenders = await listTenders(500);
      const now = Date.now();
      const cat = INDUSTRY_CATEGORIES.find((c) => c.id === currentFilter.category);

      const matched = tenders
        .filter((t) => !t.endDate || t.endDate > now)
        .filter((t) => matchesTenderLocation(currentFilter.locality, t))
        .filter((t) => {
          if (!cat || !cat.keywords || cat.keywords.length === 0) return true;
          if (cat.id === "construction" && t.isConstructionWork) return true;
          const textToSearch = `${t.title} ${t.buyer} ${t.subjectType} ${t.methodName}`.toLowerCase();
          return cat.keywords.some((k) => textToSearch.includes(k));
        })
        .filter((t) => !currentFilter.maxBudget || t.budget <= currentFilter.maxBudget)
        .slice(0, 3);

      const locLabel = getLocalityLabel(currentFilter.locality);
      const catLabel = getCategoryLabel(currentFilter.category);

      let displayTenders = matched;
      let headerNote = "";
      if (displayTenders.length === 0) {
        displayTenders = tenders.filter((t) => !t.endDate || t.endDate > now).slice(0, 3);
        if (displayTenders.length === 0) displayTenders = tenders.slice(0, 3);
        headerNote = `\n<i>(По фильтру «${locLabel} • ${catLabel}» точных совпадений нет, показываем ближайшие актуальные лоты)</i>`;
      }

      const remainingNote = chatId === adminChatId ? "" : `\n<i>(Осталось поисков: ${searchLimit.remaining}/${MAX_SEARCHES_PER_HOUR} на этот час)</i>`;
      await sendTelegramMessage(chatId, `🎯 <b>ВАШИ ПОДХОДЯЩИЕ ТЕНДЕРЫ\n(${locLabel} • ${catLabel}):</b>${headerNote}${remainingNote}\n━━━━━━━━━━━━━━━━━━━━`);
      for (const tender of displayTenders) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }
      return { ok: true };
    }

    if (text === "/filter" || text === "⚙️ Настроить фильтр" || text === "⚙️ Фильтр") {
      await sendFilterSettingsMessage(chatId);
      return { ok: true };
    }

    if (text === "🔍 Найти тендер") {
      await sendTelegramMessage(chatId, `🔍 <b>Умный поиск по госзакупкам</b>\n━━━━━━━━━━━━━━━━━━━━\nНапишите прямо в чат любое ключевое слово, название города (например: <i>Туркестан</i>, <i>школа</i>, <i>асфальт</i>) или номер объявления (например: <i>15234567-1</i>).`);
      return { ok: true };
    }

    // Check if user is typing a custom budget amount (e.g. "35 млн", "500 тыс", "15000000", "любой")
    const customBudget = parseCustomBudgetAmount(text);
    if (customBudget !== null && (pendingBudgetInput.has(chatId) || /млн|млрд|тыс|₸|тенге|тг|бюджет|до/i.test(text) || /^\d{4,}$/.test(text.replace(/\s+/g, "")))) {
      pendingBudgetInput.delete(chatId);
      await saveTelegramFilter({ chatId, maxBudget: customBudget });
      const budgetStr = customBudget > 0 ? `до ${moneyFormatter.format(customBudget)}` : "Любой бюджет (без ограничений)";
      await sendTelegramMessage(chatId, `✅ <b>Бюджет успешно установлен:</b> <code>${budgetStr}</code>\n\n` +
        `Теперь радар фильтрует закупки строго с учётом указанной максимальной суммы.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: `🎯 Показать тендеры (${budgetStr})`, callback_data: "cmd_my_tenders" }],
            [{ text: "⚙️ В меню фильтра", callback_data: "open_filter_menu" }],
          ]
        }
      });
      return { ok: true };
    }

    // Check payment receipt submission in text
    if (/оплатил|оплатила|перевел|перевела|чек|квитанция|чек об оплате/i.test(text)) {
      const userTag = tgUser.username ? `@${tgUser.username}` : (tgUser.first_name || "Пользователь");
      await sendTelegramMessage(chatId, `✅ <b>Спасибо! Ваше уведомление об оплате принято.</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Администратор проверяет платеж и активирует вашу подписку в течение нескольких минут.\n\n` +
        `<i>Для быстрой связи вы также можете отправить квитанцию в WhatsApp (+7 777 382 83 03) или в личные сообщения @mielonur.</i>`);

      if (adminChatId) {
        await sendTelegramMessage(adminChatId, `🔔 <b>СООБЩЕНИЕ ОБ ОПЛАТЕ ПОДПИСКИ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>Пользователь:</b> ${userTag} (ID: <code>${chatId}</code>)\n` +
          `💬 <b>Текст:</b> «${text}»\n` +
          `📅 <b>Дата:</b> ${dateFormatter.format(Date.now())}\n\n` +
          `Выберите срок для мгновенной активации:`, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🥉 1 мес (14 990 ₸)", callback_data: `approve_sub:${chatId}:1` },
                { text: "🥈 3 мес (34 990 ₸)", callback_data: `approve_sub:${chatId}:3` },
              ],
              [
                { text: "🥇 12 мес (99 000 ₸)", callback_data: `approve_sub:${chatId}:12` },
                { text: "❌ Отклонить", callback_data: `reject_sub:${chatId}` },
              ]
            ]
          }
        });
      }
      return { ok: true };
    }

    // Free text Smart Search
    const searchWords = text.trim().toLowerCase();
    if (searchWords.length >= 2 && !searchWords.startsWith("/")) {
      const searchLimit = checkSearchRateLimit(chatId);
      if (!searchLimit.allowed) {
        await sendTelegramMessage(chatId, `⏳ <b>Лимит поиска исчерпан (${MAX_SEARCHES_PER_HOUR} поисков в час)</b>\n\nДля защиты базы и стабильности серверов действует лимит на глубокий поиск тендеров.\n\nЛимит обновится через <b>${searchLimit.resetMinutes} мин.</b>\nВы по-прежнему можете использовать веб-версию без ограничений.`);
        return { ok: true };
      }

      const tenders = await listTenders(500);
      const matches = tenders.filter((t) => {
        const full = `${t.title} ${t.buyer} ${t.customerBin} ${t.numberAnno} ${t.regionName} ${t.kato}`.toLowerCase();
        return full.includes(searchWords);
      }).slice(0, 3);

      const remainingNote = chatId === adminChatId ? "" : `\n<i>(Осталось поисков: ${searchLimit.remaining}/${MAX_SEARCHES_PER_HOUR} на этот час)</i>`;
      if (matches.length > 0) {
        await sendTelegramMessage(chatId, `🔍 <b>НАЙДЕНО ПО ЗАПРОСУ «${text.trim()}» (${matches.length}):</b>${remainingNote}\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of matches) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }
      } else {
        await sendTelegramMessage(chatId, `🔍 По запросу <b>«${text.trim()}»</b> активных объявлений не найдено.${remainingNote}\n\nПопробуйте изменить запрос или посмотреть /hot (горящие тендеры).`);
      }
      return { ok: true };
    }
  }

  // 2. Handling Inline Buttons callback queries
  if (update.callback_query?.data) {
    const query = update.callback_query;
    const data = query.data ?? "";
    const fromId = String(query.from.id);

    // Anti-Flood check for button clicks
    const flood = checkFloodSpam(fromId);
    if (flood.blocked) {
      await answerCallbackQuery(query.id, `🛑 Анти-спам: подождите ${flood.remainingSeconds} сек.`, true);
      return { ok: true };
    }

    // Approve user by admin
    if (data.startsWith("approve_user:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может одобрять заявки.", true);
        return { ok: true };
      }
      const [, targetUserId, targetChatId] = data.split(":");
      await updateTelegramSubscriberStatus(targetUserId, "approved", "admin");
      await answerCallbackQuery(query.id, "✅ Заявка одобрена!");

      // Edit admin's message buttons
      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: "✅ Доступ успешно одобрен", callback_data: "done" }]],
        });
      }

      // Notify the employee
      if (targetChatId) {
        await sendTelegramMessage(targetChatId, `🎉 <b>Главный Администратор одобрил ваш доступ!</b>\n\nТеперь вам будут поступать персональные подборки интересных тендеров и важные напоминания по дедлайнам.`);
      }
      return { ok: true };
    }

    // Reject user by admin
    if (data.startsWith("reject_user:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может отклонять заявки.", true);
        return { ok: true };
      }
      const [, targetUserId, targetChatId] = data.split(":");
      await updateTelegramSubscriberStatus(targetUserId, "rejected", "admin");
      await answerCallbackQuery(query.id, "❌ Заявка отклонена.");

      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: "❌ Доступ отклонен", callback_data: "done" }]],
        });
      }

      if (targetChatId) {
        await sendTelegramMessage(targetChatId, `⛔ <b>Ваша заявка на подключение уведомлений отклонена администратором.</b>`);
      }
      return { ok: true };
    }

    // New user clicked 'Apply for access'
    if (data === "apply_access") {
      userApplicationMode.set(fromId, { inProgress: true });
      await answerCallbackQuery(query.id);
      await sendTelegramMessage(fromId, `📋 <b>ОТПРАВЬТЕ ВАШИ ДАННЫЕ В ОТВЕТНОМ СООБЩЕНИИ:</b>\n━━━━━━━━━━━━━━━━━━━━\nПожалуйста, напишите одним сообщением:\n\n1️⃣ <b>Имя и компания:</b> (например, <i>Арман, ТОО «Туркестан Строй»</i>)\n2️⃣ <b>Город / регион:</b> (например, <i>Туркестан, Кентау, Шымкент</i>)\n3️⃣ <b>Интересующие сферы тендеров:</b> (например, <i>Строительство, IT, Товары, Охрана</i>)\n\n<i>Просто напишите сообщение ниже 👇</i>`);
      return { ok: true };
    }

    // Check subscription status by user from paywall
    if (data === "check_subscription") {
      const sub = await getTelegramSubscriberByChatId(fromId);
      if (!sub) {
        await answerCallbackQuery(query.id, "Заполните анкету для начала", true);
        return { ok: true };
      }
      const check = isSubActive(sub);
      if (check.active) {
        await answerCallbackQuery(query.id, `✅ Ваша подписка активна до ${check.expiresStr}!`, true);
        await sendTelegramMessage(fromId, `🎉 <b>Ваша подписка активна!</b>\n━━━━━━━━━━━━━━━━━━━━\nСрок действия: до <b>${check.expiresStr}</b> (осталось ${check.daysLeft} дн.).\n\nВам доступны все разделы платформы:`, {
          reply_markup: MAIN_REPLY_KEYBOARD,
        });
      } else {
        await answerCallbackQuery(query.id, "🔒 Подписка ещё не подтверждена. Отправьте чек на WhatsApp: +7 777 382 83 03", true);
      }
      return { ok: true };
    }

    // Grant or extend subscription by admin via inline button
    if (data.startsWith("grant_sub:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может продлевать подписку.", true);
        return { ok: true };
      }
      const [, targetChatId, rawDays] = data.split(":");
      const days = parseInt(rawDays || "30", 10);
      const updated = await grantUserSubscription(targetChatId, days, "admin");
      if (updated) {
        const expStr = dateFormatter.format(updated.subscriptionExpiresAt || Date.now());
        await answerCallbackQuery(query.id, `✅ Подписка активирована на ${days} дн. (до ${expStr})!`, true);
        if (query.message) {
          await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
            inline_keyboard: [[{ text: `✅ Подписка выдана (${days} дн. до ${expStr})`, callback_data: "done" }]],
          });
        }
        await sendTelegramMessage(targetChatId, `🎉 <b>Ваша подписка на QazTender Radar активирована!</b>\n━━━━━━━━━━━━━━━━━━━━\nСрок действия: <b>${days} дней</b> (до <b>${expStr}</b>).\n\nВам снова открыт полный доступ ко всем функциям и push-уведомлениям!`, {
          reply_markup: MAIN_REPLY_KEYBOARD,
        });
      } else {
        await answerCallbackQuery(query.id, "❌ Пользователь не найден в базе.", true);
      }
      return { ok: true };
    }

    // Approve Telegram-only subscriber by admin
    if (data.startsWith("approve_tg:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может одобрять заявки.", true);
        return { ok: true };
      }
      const [, targetChatId, rawName] = data.split(":");
      const targetName = decodeURIComponent(rawName || "user");
      const targetUserId = `tg_${targetChatId}`;
      await updateTelegramSubscriberStatus(targetUserId, "approved", "admin");
      await answerCallbackQuery(query.id, `✅ Доступ для ${targetName} одобрен!`, true);

      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: `✅ Доступ одобрен (${targetName})`, callback_data: "done" }]],
        });
      }

      await sendTelegramMessage(targetChatId, `🎉 <b>Главный Администратор одобрил ваш доступ к QazTender Radar!</b>\n━━━━━━━━━━━━━━━━━━━━\nВам открыт полный доступ к платформе госзакупок:\n\n• 🎯 <b>Мои тендеры</b> — подборка по ключевым словам и вашему региону\n• ⚙️ <b>Настроить фильтр</b> — выбор городов, отраслей и бюджета\n• 📁 <b>Мои в работе</b> — персональная воронка стадий и чек-листы документов\n• 🔥 <b>Горящие тендеры</b> — топ срочных закупок перед дедлайном\n\n<i>Воспользуйтесь кнопками меню внизу экрана, чтобы начать:</i>`, {
        reply_markup: MAIN_REPLY_KEYBOARD,
      });
      return { ok: true };
    }

    // Reject Telegram-only subscriber by admin
    if (data.startsWith("reject_tg:")) {
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может отклонять заявки.", true);
        return { ok: true };
      }
      const [, targetChatId, rawName] = data.split(":");
      const targetName = decodeURIComponent(rawName || "user");
      const targetUserId = `tg_${targetChatId}`;
      await updateTelegramSubscriberStatus(targetUserId, "rejected", "admin");
      await answerCallbackQuery(query.id, `❌ Доступ для ${targetName} отклонён.`, true);

      if (query.message) {
        await editMessageReplyMarkup(query.message.chat.id, query.message.message_id, {
          inline_keyboard: [[{ text: `❌ Доступ отклонён (${targetName})`, callback_data: "done" }]],
        });
      }

      await sendTelegramMessage(targetChatId, `⛔ <b>Ваша заявка на доступ отклонена администратором.</b>`);
      return { ok: true };
    }

    // Favorite tender button
    if (data.startsWith("fav:")) {
      const tenderId = data.slice(4);
      const sub = await getTelegramSubscriberByChatId(fromId);
      if (sub) {
        const ownerKey = `user:${sub.userId}`;
        const existingEntries = await listTenderWorkflow(ownerKey);
        const existing = existingEntries.find((e) => e.tenderId === tenderId);
        await saveTenderWorkflow(ownerKey, tenderId, true, existing?.stage ?? "none");
        await answerCallbackQuery(query.id, "★ Тендер добавлен в избранное!");
      } else {
        await answerCallbackQuery(query.id, "★ Добавлено в избранное");
      }
      return { ok: true };
    }

    // Hide tender button
    if (data.startsWith("hide:")) {
      const tenderId = data.slice(5);
      const sub = await getTelegramSubscriberByChatId(fromId);
      if (sub) {
        const ownerKey = `user:${sub.userId}`;
        const existingEntries = await listTenderWorkflow(ownerKey);
        const existing = existingEntries.find((e) => e.tenderId === tenderId);
        await saveTenderWorkflow(ownerKey, tenderId, existing?.isFavorite ?? false, "skipped");
        await answerCallbackQuery(query.id, "⛔ Тендер скрыт из вашей ленты.");
      } else {
        await answerCallbackQuery(query.id, "⛔ Тендер скрыт.");
      }
      return { ok: true };
    }



    // Open filter menu
    if (data === "open_filter_menu") {
      await answerCallbackQuery(query.id);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Choose locality menu - Step 1: Regions of Kazakhstan
    if (data === "menu_locality") {
      await answerCallbackQuery(query.id);
      const regionButtons: Array<Array<{ text: string; callback_data: string }>> = [
        [{ text: "🌐 Весь Казахстан (все 20 регионов)", callback_data: "set_loc:all" }],
      ];
      for (let i = 0; i < REGIONS.length; i += 2) {
        const row = [];
        const r1 = REGIONS[i];
        row.push({ text: `${r1.icon} ${r1.name}`, callback_data: `select_region:${r1.id}` });
        if (i + 1 < REGIONS.length) {
          const r2 = REGIONS[i + 1];
          row.push({ text: `${r2.icon} ${r2.name}`, callback_data: `select_region:${r2.id}` });
        }
        regionButtons.push(row);
      }
      regionButtons.push([{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }]);

      await sendTelegramMessage(fromId, `📍 <b>ШАГ 1 ИЗ 2: ВЫБЕРИТЕ ОБЛАСТЬ ИЛИ ГОРОД:</b>\n━━━━━━━━━━━━━━━━━━━━\nВыберите область, чтобы увидеть список районов, городов и сёл:`, {
        reply_markup: { inline_keyboard: regionButtons },
      });
      return { ok: true };
    }

    // Step 2: Select sub-locality / district / city in the region
    if (data.startsWith("select_region:")) {
      const regionId = data.slice(14);
      const region = getRegionById(regionId);
      if (!region) {
        await answerCallbackQuery(query.id, "Область не найдена");
        return { ok: true };
      }
      await answerCallbackQuery(query.id);
      const subButtons: Array<Array<{ text: string; callback_data: string }>> = [];
      for (const item of region.items) {
        subButtons.push([{ text: item.label, callback_data: `set_loc:${item.value}` }]);
      }
      subButtons.push([
        { text: "⬅️ Назад к списку областей", callback_data: "menu_locality" },
        { text: "⚙️ В меню фильтра", callback_data: "open_filter_menu" },
      ]);

      await sendTelegramMessage(fromId, `📍 <b>ШАГ 2 ИЗ 2: ${region.name.toUpperCase()}</b>\n━━━━━━━━━━━━━━━━━━━━\nВыберите нужный город, район, кластер сёл либо всю область целиком:`, {
        reply_markup: { inline_keyboard: subButtons },
      });
      return { ok: true };
    }

    // Set locality
    if (data.startsWith("set_loc:")) {
      const locVal = data.slice(8);
      await saveTelegramFilter({ chatId: fromId, locality: locVal });
      const label = getLocalityLabel(locVal);
      await answerCallbackQuery(query.id, `✅ Выбрано: ${label}`, true);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Choose category menu
    if (data === "menu_category") {
      await answerCallbackQuery(query.id);
      const categoryButtons = [
        [{ text: "🏗 Строительство и ремонт", callback_data: "set_cat:construction" }, { text: "📦 Товары и мебель", callback_data: "set_cat:goods" }],
        [{ text: "💻 IT и оргтехника", callback_data: "set_cat:it" }, { text: "🛡 Охрана и безопасность", callback_data: "set_cat:security" }],
        [{ text: "🧹 Клининг и уборка", callback_data: "set_cat:cleaning" }, { text: "🚚 Транспорт и ГСМ", callback_data: "set_cat:transport" }],
        [{ text: "🍲 Продукты и питание", callback_data: "set_cat:food" }, { text: "💊 Медицина и фарма", callback_data: "set_cat:medical" }],
        [{ text: "🌐 Все сферы (без ограничений)", callback_data: "set_cat:all" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `📁 <b>ВЫБЕРИТЕ ВАШУ СФЕРУ ДЕЯТЕЛЬНОСТИ / НИШУ:</b>\n━━━━━━━━━━━━━━━━━━━━\nБот будет фильтровать тендеры строго по вашей специализации.`, {
        reply_markup: { inline_keyboard: categoryButtons },
      });
      return { ok: true };
    }

    // Set category
    if (data.startsWith("set_cat:")) {
      const catVal = data.slice(8) as IndustryCategory;
      await saveTelegramFilter({ chatId: fromId, category: catVal });
      const label = getCategoryLabel(catVal);
      await answerCallbackQuery(query.id, `✅ Сфера выбрана: ${label}`, true);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Menu budget
    if (data === "menu_budget") {
      await answerCallbackQuery(query.id);
      const budgetButtons = [
        [{ text: "✏️ Ввести свою сумму текстом (напр. 35 млн)", callback_data: "enter_custom_budget" }],
        [{ text: "Любой бюджет", callback_data: "set_budget:0" }],
        [{ text: "До 20 млн ₸", callback_data: "set_budget:20000000" }, { text: "До 50 млн ₸", callback_data: "set_budget:50000000" }],
        [{ text: "До 100 млн ₸", callback_data: "set_budget:100000000" }, { text: "До 500 млн ₸", callback_data: "set_budget:500000000" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `💰 <b>НАСТРОЙКА БЮДЖЕТА ЗАКУПОК:</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Вы можете выбрать готовый диапазон или нажать <b>«✏️ Ввести свою сумму»</b> и написать точную сумму в чат:`, {
        reply_markup: { inline_keyboard: budgetButtons },
      });
      return { ok: true };
    }

    // Custom free-form budget input prompt
    if (data === "enter_custom_budget") {
      await answerCallbackQuery(query.id);
      pendingBudgetInput.set(fromId, Date.now() + 5 * 60 * 1000);
      await sendTelegramMessage(fromId, `✏️ <b>НАПИШИТЕ СУММУ БЮДЖЕТА В ЧАТ:</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Вы можете написать сумму в любом удобном виде:\n\n` +
        `• <code>35 млн</code> или <code>35 000 000</code>\n` +
        `• <code>500 тыс</code> или <code>500 000</code>\n` +
        `• <code>1.5 млрд</code>\n` +
        `• <code>любой</code> или <code>0</code> (чтобы снять ограничение)\n\n` +
        `👇 <i>Отправьте сообщение с нужной суммой прямо сейчас:</i>`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Отмена", callback_data: "open_filter_menu" }]
          ]
        }
      });
      return { ok: true };
    }

    // Paywall: Kaspi details
    if (data === "pay_kaspi") {
      await answerCallbackQuery(query.id);
      const payMsg = `💳 <b>ОПЛАТА ПОДПИСКИ QAZTENDER RADAR ЧЕРЕЗ KASPI</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💼 <b>ТАРИФНЫЕ ПЛАНЫ:</b>\n` +
        `🥉 <b>1 месяц (Стандарт)</b> — <code>14 990 ₸</code>\n` +
        `🥈 <b>3 месяца (Выгодный -20%)</b> — <code>34 990 ₸</code> <i>(11 660 ₸/мес)</i>\n` +
        `🥇 <b>12 месяцев (VIP Безлимит -45%)</b> — <code>99 000 ₸</code> <i>(8 250 ₸/мес)</i>\n\n` +
        `📲 <b>Реквизиты для перевода Kaspi Gold / Kaspi Pay:</b>\n` +
        `• Номер: <code>87773828303</code> (Нурсултан А.)\n` +
        `• В комментарии укажите ваш Telegram ID: <code>${fromId}</code>\n\n` +
        `После совершения перевода нажмите кнопку <b>«🧾 Я оплатил (Отправить чек)»</b> ниже:`;

      await sendTelegramMessage(fromId, payMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🧾 Я оплатил (Отправить чек)", callback_data: "submit_receipt" }],
            [{ text: "📲 Отправить чек в WhatsApp", url: `https://wa.me/77773828303?text=${encodeURIComponent(`Здравствуйте! Оплатил подписку на QazTender Radar. Мой ID: ${fromId}`)}` }],
            [{ text: "💬 Написать разработчику в TG", url: "https://t.me/mielonur" }],
            [{ text: "⬅️ Назад", callback_data: "cmd_pricing" }],
          ]
        }
      });
      return { ok: true };
    }

    // Paywall: User submits receipt notification
    if (data === "submit_receipt") {
      await answerCallbackQuery(query.id, "Заявка отправлена администратору!", true);
      const userTag = query.from.username ? `@${query.from.username}` : (query.from.first_name || "Пользователь");

      await sendTelegramMessage(fromId, `✅ <b>ВАША ЗАЯВКА НА АКТИВАЦИЮ ПРИНЯТА!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Администратор уже получил уведомление о вашей оплате.\n\n` +
        `Вы также можете отправить скриншот чека разработчику:\n` +
        `👉 Telegram: @mielonur\n` +
        `👉 WhatsApp: +7 777 382 83 03\n\n` +
        `<i>Доступ будет активирован в течение нескольких минут!</i>`);

      if (adminChatId) {
        await sendTelegramMessage(adminChatId, `🔔 <b>УВЕДОМЛЕНИЕ ОБ ОПЛАТЕ ПОДПИСКИ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>Пользователь:</b> ${userTag} (ID: <code>${fromId}</code>)\n` +
          `📅 <b>Дата:</b> ${dateFormatter.format(Date.now())}\n\n` +
          `Выберите тариф для мгновенной активации подписки:`, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🥉 1 мес (14 990 ₸)", callback_data: `approve_sub:${fromId}:1` },
                { text: "🥈 3 мес (34 990 ₸)", callback_data: `approve_sub:${fromId}:3` },
              ],
              [
                { text: "🥇 12 мес (99 000 ₸)", callback_data: `approve_sub:${fromId}:12` },
                { text: "❌ Отклонить", callback_data: `reject_sub:${fromId}` },
              ]
            ]
          }
        });
      }
      return { ok: true };
    }

    // Admin approves subscription
    if (data.startsWith("approve_sub:")) {
      const parts = data.split(":");
      const targetChatId = parts[1];
      const months = parseInt(parts[2] || "1", 10);

      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только администратор может одобрять подписки.", true);
        return { ok: true };
      }

      const days = months * 30;
      const updated = await grantUserSubscription(targetChatId, days, "admin");
      await answerCallbackQuery(query.id, `✅ Подписка активирована на ${months} мес!`, true);

      if (query.message?.message_id) {
        await editTelegramMessageText(fromId, query.message.message_id, `✅ <b>ПОДПИСКА ОДОБРЕНА НА ${months} МЕСЯЦЕВ</b>\nПользователь ID: <code>${targetChatId}</code>`);
      }

      if (updated) {
        const expStr = dateFormatter.format(updated.subscriptionExpiresAt || Date.now());
        await sendTelegramMessage(targetChatId, `🎉 <b>ВАША ПОДПИСКА НА QAZTENDER RADAR АКТИВИРОВАНА!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `Тариф: <b>${months} мес.</b> (до <b>${expStr}</b>)\n\n` +
          `Вам снова открыт полный безлимитный доступ:\n` +
          `• 🎯 Персональный подбор закупок по вашим городам и нишам\n` +
          `• ⏰ Утренние, обеденные и вечерние рассылки новых лотов\n` +
          `• 📁 Управление стадиями и чек-листами документов РК\n` +
          `• 🔥 Мониторинг горящих лотов перед дедлайном\n\n` +
          `<i>Приятной и прибыльной работы! 🚀</i>`, {
          reply_markup: MAIN_INLINE_MENU,
        });
      }
      return { ok: true };
    }

    // Admin rejects subscription
    if (data.startsWith("reject_sub:")) {
      const targetChatId = data.split(":")[1];
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Доступ запрещен.", true);
        return { ok: true };
      }
      await answerCallbackQuery(query.id, "❌ Заявка отклонена.");
      if (query.message?.message_id) {
        await editTelegramMessageText(fromId, query.message.message_id, `❌ <b>Заявка на оплату отклонена</b> (ID: <code>${targetChatId}</code>)`);
      }
      await sendTelegramMessage(targetChatId, `⚠️ <b>Ваша заявка на оплату не подтверждена.</b>\n\nЕсли вы совершили перевод, пожалуйста, свяжитесь напрямую с разработчиком @mielonur или в WhatsApp: +7 777 382 83 03.`);
      return { ok: true };
    }

    // Menu schedule
    if (data === "menu_schedule") {
      await answerCallbackQuery(query.id);
      const scheduleButtons = [
        [{ text: "⚡ 3 раза в день (09:00, 14:00, 19:00) ★", callback_data: "set_sched:3times" }],
        [{ text: "🌅 Только утром (~09:00)", callback_data: "set_sched:morning" }, { text: "☀️ В обед (~14:00)", callback_data: "set_sched:afternoon" }],
        [{ text: "🌆 Только вечером (~19:00)", callback_data: "set_sched:evening" }, { text: "🔔 Мгновенно о новых", callback_data: "set_sched:instant" }],
        [{ text: "🔕 Только вручную (без авто-сообщений)", callback_data: "set_sched:off" }],
        [{ text: "⬅️ Назад в настройки", callback_data: "open_filter_menu" }],
      ];
      await sendTelegramMessage(fromId, `⏰ <b>НАСТРОЙКА ВРЕМЕНИ АВТО-УВЕДОМЛЕНИЙ:</b>\n━━━━━━━━━━━━━━━━━━━━\nБаза Госзакупок обновляется утром, в обед и вечером.\n\nВыберите, когда боту присылать вам персональную подборку свежих лотов:`, {
        reply_markup: { inline_keyboard: scheduleButtons },
      });
      return { ok: true };
    }

    if (data.startsWith("set_sched:")) {
      const sched = data.slice(10) as NotificationSchedule;
      await saveTelegramFilter({ chatId: fromId, schedule: sched });
      const label = SCHEDULE_LABELS[sched] || sched;
      await answerCallbackQuery(query.id, `✅ Расписание сохранено: ${label}`, true);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Set budget
    if (data.startsWith("set_budget:")) {
      const budgetNum = Number(data.slice(11)) || 0;
      await saveTelegramFilter({ chatId: fromId, maxBudget: budgetNum });
      await answerCallbackQuery(query.id, budgetNum > 0 ? `✅ Бюджет до ${moneyFormatter.format(budgetNum)}` : "✅ Бюджет: Любой");
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    // Workflow Stage Menu
    if (data.startsWith("menu_stage:")) {
      const tenderId = data.slice(11);
      await answerCallbackQuery(query.id);
      const stageButtons = [
        [{ text: "⏳ Изучаем", callback_data: `set_stage:${tenderId}:studying` }, { text: "📝 Готовим заявку", callback_data: `set_stage:${tenderId}:preparing` }],
        [{ text: "🚀 Подали заявку", callback_data: `set_stage:${tenderId}:applied` }, { text: "🏆 Победили", callback_data: `set_stage:${tenderId}:won` }],
        [{ text: "❌ Проиграли", callback_data: `set_stage:${tenderId}:lost` }, { text: "🗑 Снять с контроля", callback_data: `set_stage:${tenderId}:none` }],
      ];
      await sendTelegramMessage(fromId, `📂 <b>ВЫБЕРИТЕ СТАДИЮ В РАБОТЕ (Тендер № ${tenderId}):</b>\n━━━━━━━━━━━━━━━━━━━━\nСтатус сразу синхронизируется с дашбордом компании.`, {
        reply_markup: { inline_keyboard: stageButtons },
      });
      return { ok: true };
    }

    // Set Workflow Stage
    if (data.startsWith("set_stage:")) {
      const [, tenderId, stage] = data.split(":");
      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${fromId}`;
      const isFav = stage !== "none";
      await saveTenderWorkflow(ownerKey, tenderId, isFav, stage as TenderStage);
      const stageName = STAGE_LABELS[stage] || "Снято с контроля";
      await answerCallbackQuery(query.id, `✅ Статус изменен: ${stageName}`, true);
      await sendTelegramMessage(fromId, `✅ <b>Статус тендера обновлен:</b> <code>${stageName}</code>\n\nВы можете просмотреть все закупки в работе через кнопку «📁 Мои в работе».`);
      return { ok: true };
    }

    // Interactive Checklists
    if (data.startsWith("tasks:")) {
      const tenderId = data.slice(6);
      await answerCallbackQuery(query.id, "Загрузка чек-листа...");
      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub ? `user:${sub.userId}` : `admin:${fromId}`;
      let workspace = await getTenderTaskWorkspace(tenderId);
      if (workspace.tasks.length === 0) {
        await seedTenderTaskTemplate(tenderId, ownerKey);
        workspace = await getTenderTaskWorkspace(tenderId);
      }
      const tender = await getTenderById(tenderId);

      let taskMsg = `📑 <b>ЧЕК-ЛИСТ ДОКУМЕНТОВ РК</b>\n`;
      taskMsg += `📋 <b>Тендер № ${tender?.numberAnno || tenderId}</b> · ${tender?.methodName || "Госзакупки"}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      const taskButtons: Array<Array<{ text: string; callback_data: string }>> = [];
      workspace.tasks.forEach((t, i) => {
        const isDone = t.status === "done";
        taskMsg += `${i + 1}. ${isDone ? "✅" : "⬜"} <b>${t.title}</b>\n`;
        taskButtons.push([{
          text: `${isDone ? "✅ [Сделано]" : "⬜ [Отметить]"} ${t.title.slice(0, 30)}`,
          callback_data: `toggle_task:${t.id}:${tenderId}`,
        }]);
      });

      taskMsg += `\n💡 <i>Нажимайте кнопки ниже, чтобы отмечать выполненные шаги:</i>`;
      await sendTelegramMessage(fromId, taskMsg, { reply_markup: { inline_keyboard: taskButtons } });
      return { ok: true };
    }

    // Toggle Task status
    if (data.startsWith("toggle_task:")) {
      const [, taskId, tenderId] = data.split(":");
      const task = await getTenderTask(taskId);
      if (task) {
        const nextStatus = task.status === "done" ? "todo" : "done";
        await updateTenderTask(taskId, nextStatus, task.assignedUserId, task.dueAt);
        await answerCallbackQuery(query.id, nextStatus === "done" ? "✅ Шаг выполнен!" : "⬜ Шаг возвращен в работу");

        const workspace = await getTenderTaskWorkspace(tenderId);
        const tender = await getTenderById(tenderId);
        let taskMsg = `📑 <b>ЧЕК-ЛИСТ ДОКУМЕНТОВ РК</b>\n`;
        taskMsg += `📋 <b>Тендер № ${tender?.numberAnno || tenderId}</b> · ${tender?.methodName || "Госзакупки"}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

        const taskButtons: Array<Array<{ text: string; callback_data: string }>> = [];
        workspace.tasks.forEach((t, i) => {
          const isDone = t.status === "done";
          taskMsg += `${i + 1}. ${isDone ? "✅" : "⬜"} <b>${t.title}</b>\n`;
          taskButtons.push([{
            text: `${isDone ? "✅ [Сделано]" : "⬜ [Отметить]"} ${t.title.slice(0, 30)}`,
            callback_data: `toggle_task:${t.id}:${tenderId}`,
          }]);
        });
        taskMsg += `\n💡 <i>Нажимайте кнопки ниже, чтобы отмечать выполненные шаги:</i>`;
        await sendTelegramMessage(fromId, taskMsg, { reply_markup: { inline_keyboard: taskButtons } });
      }
      return { ok: true };
    }

    // Lot Breakdown & Documents
    if (data.startsWith("lots:")) {
      const tenderId = data.slice(5);
      await answerCallbackQuery(query.id, "Загрузка лотов...");
      const tender = await getTenderById(tenderId);
      const details = await getTenderDetails(tenderId);

      let lotMsg = `📦 <b>ЛОТЫ И СПЕЦИФИКАЦИЯ</b>\n`;
      lotMsg += `📋 <b>№ ${tender?.numberAnno || tenderId}</b> · ${tender?.title}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (details.lots && details.lots.length > 0) {
        details.lots.forEach((lot, i) => {
          lotMsg += `🔹 <b>Лот №${lot.lotNumber || i + 1}: ${lot.title}</b>\n`;
          lotMsg += `   Количество: <b>${lot.quantity}</b> | Сумма: <b>${moneyFormatter.format(lot.amount)}</b>\n`;
          if (lot.description) lotMsg += `   <i>${lot.description.slice(0, 100)}...</i>\n`;
          lotMsg += `\n`;
        });
      } else {
        lotMsg += `ℹ️ В данном объявлении 1 комплексный лот на сумму <b>${moneyFormatter.format(tender?.budget || 0)}</b>.\n`;
      }

      if (details.documents && details.documents.length > 0) {
        lotMsg += `\n📎 <b>Документация к закупке (${details.documents.length}):</b>\n`;
        details.documents.slice(0, 5).forEach((doc) => {
          lotMsg += `• <a href="${doc.url}">${doc.name || doc.originalName || "Скачать файл"}</a>\n`;
        });
      }

      await sendTelegramMessage(fromId, lotMsg);
      return { ok: true };
    }

    // Notes List
    if (data.startsWith("notes:")) {
      const tenderId = data.slice(6);
      await answerCallbackQuery(query.id);
      const tender = await getTenderById(tenderId);
      const notes = await listTenderNotes(tenderId);

      let noteMsg = `💬 <b>ЗАМЕТКИ ПО ТЕНДЕРУ № ${tender?.numberAnno || tenderId}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      if (notes.length === 0) {
        noteMsg += `Заметок пока нет.\n\n`;
      } else {
        notes.forEach((n) => {
          const date = dateFormatter.format(n.createdAt);
          noteMsg += `👤 <b>${n.authorName}</b> (${date}):\n<i>«${n.content}»</i>\n\n`;
        });
      }

      noteMsg += `💡 <i>Чтобы добавить новую заметку, отправьте сообщение:</i>\n<code>/note ${tenderId} Текст вашей заметки</code>`;
      await sendTelegramMessage(fromId, noteMsg);
      return { ok: true };
    }

    // Admin Delegation
    if (data.startsWith("delegate:")) {
      const tenderId = data.slice(9);
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Только Главный Администратор может назначать тендеры.", true);
        return { ok: true };
      }
      await answerCallbackQuery(query.id);
      const subscribers = await listApprovedTelegramSubscribers();
      if (subscribers.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ Нет активных сотрудников с подключенным Telegram.");
        return { ok: true };
      }

      const employeeButtons = subscribers.map((s) => [{
        text: `👤 @${s.username || s.firstName || "Специалист"}`,
        callback_data: `assign:${tenderId}:${s.userId}`,
      }]);

      await sendTelegramMessage(fromId, `👤 <b>КОМУ ИЗ СОТРУДНИКОВ НАЗНАЧИТЬ ТЕНДЕР?</b>\n━━━━━━━━━━━━━━━━━━━━\nТендер будет отправлен специалисту в Telegram с пометкой поручения.`, {
        reply_markup: { inline_keyboard: employeeButtons },
      });
      return { ok: true };
    }

    // Assign to employee
    if (data.startsWith("assign:")) {
      const [, tenderId, targetUserId] = data.split(":");
      if (fromId !== adminChatId) {
        await answerCallbackQuery(query.id, "❌ Доступ запрещен.", true);
        return { ok: true };
      }
      const tender = await getTenderById(tenderId);
      const targetSub = await getTelegramSubscriberByUserId(targetUserId);

      if (tender && targetSub) {
        await saveTenderWorkflow(`user:${targetUserId}`, tenderId, true, "studying");
        const card = formatTenderTelegramCard(tender, null, "👑 ПОРУЧЕНИЕ ОТ РУКОВОДИТЕЛЯ: Тендер передан вам в работу.");
        await sendTelegramMessage(targetSub.chatId, card.text, { reply_markup: card.reply_markup });
        await answerCallbackQuery(query.id, "✅ Тендер успешно назначен сотруднику!", true);
        await sendTelegramMessage(fromId, `✅ <b>Тендер № ${tender.numberAnno} назначен сотруднику @${targetSub.username || targetSub.firstName}!</b>`);
      }
      return { ok: true };
    }

    // Set budget
    if (data.startsWith("set_budget:")) {
      const budgetNum = Number(data.slice(11)) || 0;
      await saveTelegramFilter({ chatId: fromId, maxBudget: budgetNum });
      await answerCallbackQuery(query.id, budgetNum > 0 ? `✅ Бюджет до ${moneyFormatter.format(budgetNum)}` : "✅ Бюджет: Любой");
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    if (data.startsWith("cmd_my_tenders") || data.startsWith("cmd_my_page:") || data === "cmd_my" || data === "cmd_tenders") {
      let offset = 0;
      if (data.startsWith("cmd_my_page:")) {
        offset = parseInt(data.slice(12), 10) || 0;
      }
      await answerCallbackQuery(query.id, offset > 0 ? `Загружаем лоты ${offset + 1}-${offset + 3}...` : "Подбираем тендеры...");
      const currentFilter = await getTelegramFilter(fromId);
      const tenders = await listTenders(500);
      const now = Date.now();

      const matched = tenders
        .filter((t) => !t.endDate || t.endDate > now)
        .filter((t) => matchesTenderLocation(currentFilter.locality, t))
        .filter((t) => matchesIndustryCategory(currentFilter.category, t))
        .filter((t) => !currentFilter.maxBudget || t.budget <= currentFilter.maxBudget);

      const locLabel = getLocalityLabel(currentFilter.locality);
      const catLabel = getCategoryLabel(currentFilter.category);

      if (matched.length === 0) {
        const budgetText = currentFilter.maxBudget > 0 ? `до ${moneyFormatter.format(currentFilter.maxBudget)}` : "любой бюджет";
        const emptyMsg = `🔍 <b>ПО ВАШЕМУ ФИЛЬТРУ ПОКА НЕТ АКТИВНЫХ ЛОТОВ</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `📍 <b>Регион:</b> ${locLabel}\n` +
          `📁 <b>Сфера:</b> ${catLabel}\n` +
          `💰 <b>Бюджет:</b> ${budgetText}\n\n` +
          `💡 <i>Вы можете увеличить сумму бюджета или сменить параметры в 1 клик:</i>`;

        const actionButtons = [
          [{ text: "💰 Увеличить бюджет до 50 млн ₸", callback_data: "set_budget:50000000" }],
          [{ text: "💰 Увеличить бюджет до 100 млн ₸", callback_data: "set_budget:100000000" }],
          [{ text: "🌐 Сбросить лимит бюджета (Любой)", callback_data: "set_budget:0" }],
          [{ text: "📍 Сменить город / район", callback_data: "menu_locality" }],
          [{ text: "📁 Все сферы деятельности", callback_data: "set_cat:all" }],
          [{ text: "🔥 Смотреть все горящие лоты", callback_data: "cmd_hot" }],
        ];

        await sendTelegramMessage(fromId, emptyMsg, {
          reply_markup: { inline_keyboard: actionButtons },
        });
        return { ok: true };
      }

      const totalMatched = matched.length;
      const pageTenders = matched.slice(offset, offset + 3);
      const nextOffset = offset + 3;
      const hasMore = nextOffset < totalMatched;

      const pageInfo = totalMatched > 3 ? ` [Лоты ${offset + 1}–${Math.min(offset + pageTenders.length, totalMatched)} из ${totalMatched}]` : "";
      await sendTelegramMessage(fromId, `🎯 <b>ВАШИ ПОДХОДЯЩИЕ ТЕНДЕРЫ${pageInfo}\n(${locLabel} • ${catLabel}):</b>\n━━━━━━━━━━━━━━━━━━━━`);

      for (const tender of pageTenders) {
        const card = formatTenderTelegramCard(tender);
        await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
      }

      const navButtons: Array<Array<{ text: string; callback_data: string }>> = [];
      if (hasMore) {
        navButtons.push([
          { text: "🔍 Смотреть другие по одному (Интересно / Пропустить)", callback_data: `swipe_page:${nextOffset}` }
        ]);
        navButtons.push([
          { text: `➡️ Показать ещё 3 тендера (${totalMatched - nextOffset} ост.)`, callback_data: `cmd_my_page:${nextOffset}` }
        ]);
      } else if (totalMatched > 3) {
        navButtons.push([
          { text: "🔄 В начало списка", callback_data: "cmd_my_page:0" }
        ]);
      }
      navButtons.push([
        { text: "⚙️ Изменить фильтр", callback_data: "open_filter_menu" },
        { text: "🔥 Горящие лоты", callback_data: "cmd_hot" },
      ]);

      await sendTelegramMessage(fromId, hasMore ? `👇 <i>Нажмите кнопку ниже, чтобы продолжить просмотр:</i>` : `✅ <i>Вы просмотрели все доступные лоты по этому фильтру.</i>`, {
        reply_markup: { inline_keyboard: navButtons },
      });
      return { ok: true };
    }

    // -------------------------------------------------------------
    // Single Tender Swipe Mode (Интересно / Пропустить / В работу)
    // -------------------------------------------------------------
    if (data.startsWith("swipe_page:") || data.startsWith("swipe_yes:") || data.startsWith("swipe_no:") || data.startsWith("swipe_work:")) {
      let offset = 0;
      let action = "page";
      let actionTenderId = "";

      if (data.startsWith("swipe_page:")) {
        offset = parseInt(data.slice(11), 10) || 0;
      } else if (data.startsWith("swipe_yes:")) {
        const parts = data.split(":");
        actionTenderId = parts[1];
        offset = parseInt(parts[2], 10) || 0;
        action = "yes";
      } else if (data.startsWith("swipe_no:")) {
        const parts = data.split(":");
        actionTenderId = parts[1];
        offset = parseInt(parts[2], 10) || 0;
        action = "no";
      } else if (data.startsWith("swipe_work:")) {
        const parts = data.split(":");
        actionTenderId = parts[1];
        offset = parseInt(parts[2], 10) || 0;
        action = "work";
      }

      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub?.userId ? `user:${sub.userId}` : `user:tg_${fromId}`;

      // Handle user's decision
      if (action === "yes" && actionTenderId) {
        await saveTenderWorkflow(ownerKey, actionTenderId, true, "studying");
        await answerCallbackQuery(query.id, "⭐ Добавлено в избранное!", false);
      } else if (action === "no" && actionTenderId) {
        await saveTenderWorkflow(ownerKey, actionTenderId, false, "skipped");
        await answerCallbackQuery(query.id, "⏭ Пропущено", false);
      } else if (action === "work" && actionTenderId) {
        await saveTenderWorkflow(ownerKey, actionTenderId, true, "participating");
        await seedTenderTaskTemplate(actionTenderId, ownerKey).catch(() => void 0);
        await answerCallbackQuery(query.id, "📁 Взято в работу! Дедлайны активированы.", false);
      } else {
        await answerCallbackQuery(query.id);
      }

      // Fetch fresh tenders list
      const currentFilter = await getTelegramFilter(fromId);
      const tenders = await listTenders(500);
      const now = Date.now();

      const matched = tenders
        .filter((t) => !t.endDate || t.endDate > now)
        .filter((t) => matchesTenderLocation(currentFilter.locality, t))
        .filter((t) => matchesIndustryCategory(currentFilter.category, t))
        .filter((t) => !currentFilter.maxBudget || t.budget <= currentFilter.maxBudget);

      const totalMatched = matched.length;

      if (totalMatched === 0) {
        const locLabel = getLocalityLabel(currentFilter.locality);
        const catLabel = getCategoryLabel(currentFilter.category);
        const budgetText = currentFilter.maxBudget > 0 ? `до ${moneyFormatter.format(currentFilter.maxBudget)}` : "Любой";
        const emptyMsg = `🔍 <b>ПО ВАШЕМУ ФИЛЬТРУ НЕТ ЛОТОВ ДЛЯ ПРОСМОТРА</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `📍 <b>Регион:</b> ${locLabel}\n` +
          `📁 <b>Сфера:</b> ${catLabel}\n` +
          `💰 <b>Бюджет:</b> ${budgetText}\n\n` +
          `<i>Нажмите кнопку ниже, чтобы изменить параметры:</i>`;
        const actionButtons = [
          [{ text: "💰 Увеличить бюджет до 50 млн ₸", callback_data: "set_budget:50000000" }],
          [{ text: "🌐 Любой бюджет", callback_data: "set_budget:0" }],
          [{ text: "⚙️ Изменить фильтр", callback_data: "open_filter_menu" }],
        ];
        if (query.message?.message_id) {
          await editTelegramMessageText(fromId, query.message.message_id, emptyMsg, { reply_markup: { inline_keyboard: actionButtons } });
        } else {
          await sendTelegramMessage(fromId, emptyMsg, { reply_markup: { inline_keyboard: actionButtons } });
        }
        return { ok: true };
      }

      // If finished all tenders
      if (offset >= totalMatched) {
        const finishMsg = `🎉 <b>ВЫ ПРОСМОТРЕЛИ ВСЕ ДОСТУПНЫЕ ТЕНДЕРЫ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `⭐ Все понравившиеся лоты сохранены в <b>«★ Избранное»</b>.\n` +
          `📁 Все взятые в работу доступны в <b>«📁 Мои в работе»</b>.\n\n` +
          `<i>Вы можете сменить регион/сферу поиска или начать просмотр сначала:</i>`;

        const finishButtons = [
          [{ text: "🔄 Начать просмотр сначала", callback_data: "swipe_page:0" }],
          [{ text: "📁 Мои в работе", callback_data: "cmd_inwork" }],
          [{ text: "⚙️ Изменить фильтр", callback_data: "open_filter_menu" }],
        ];

        if (query.message?.message_id) {
          await editTelegramMessageText(fromId, query.message.message_id, finishMsg, {
            reply_markup: { inline_keyboard: finishButtons },
          });
        } else {
          await sendTelegramMessage(fromId, finishMsg, {
            reply_markup: { inline_keyboard: finishButtons },
          });
        }
        return { ok: true };
      }

      const tender = matched[offset];
      const nextOffset = offset + 1;
      const card = formatSingleTenderReviewCard(tender, offset + 1, totalMatched, nextOffset);

      if (query.message?.message_id && action !== "page") {
        // In-place smooth transition
        await editTelegramMessageText(fromId, query.message.message_id, card.text, {
          reply_markup: card.reply_markup,
        });
      } else {
        await sendTelegramMessage(fromId, card.text, {
          reply_markup: card.reply_markup,
        });
      }
      return { ok: true };
    }

    if (data === "cmd_inwork") {
      await answerCallbackQuery(query.id);
      const sub = await getTelegramSubscriberByChatId(fromId);
      const ownerKey = sub?.userId ? `user:${sub.userId}` : `user:tg_${fromId}`;
      const workflows = await listTenderWorkflow(ownerKey);
      const inWork = workflows.filter((w) => w.stage !== "none" && w.stage !== "skipped");

      if (inWork.length === 0) {
        await sendTelegramMessage(fromId, `📁 <b>У вас пока нет тендеров в работе.</b>\n\nКогда вы нажимаете кнопку <b>«📁 В работу»</b> под карточкой любого тендера, он сохраняется здесь, и бот будет напоминать вам о дедлайне подачи заявки!`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🎯 Найти подходящие тендеры", callback_data: "cmd_my_tenders" }],
              [{ text: "🔥 Смотреть горящие", callback_data: "cmd_hot" }],
            ],
          },
        });
      } else {
        await sendTelegramMessage(fromId, `📁 <b>ВАШИ ТЕНДЕРЫ В РАБОТЕ (${inWork.length}):</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const wf of inWork.slice(0, 5)) {
          const t = await getTenderById(wf.tenderId);
          if (t) {
            const card = formatTenderTelegramCard(t);
            await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
          }
        }
      }
      return { ok: true };
    }

    if (data.startsWith("cmd_hot") || data.startsWith("cmd_hot_page:")) {
      let offset = 0;
      if (data.startsWith("cmd_hot_page:")) {
        offset = parseInt(data.slice(13), 10) || 0;
      }
      await answerCallbackQuery(query.id, "Загружаем горящие тендеры...");
      const tenders = await listTenders(200);
      const now = Date.now();
      const hot = tenders
        .filter((t) => t.endDate && t.endDate > now)
        .sort((a, b) => (a.endDate ?? 0) - (b.endDate ?? 0));

      const pageHot = hot.slice(offset, offset + 3);
      const nextOffset = offset + 3;
      const hasMore = nextOffset < hot.length;

      if (pageHot.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ На данный момент нет срочных активных объявлений.");
      } else {
        const pageInfo = hot.length > 3 ? ` [Лоты ${offset + 1}–${Math.min(offset + pageHot.length, hot.length)} из ${hot.length}]` : "";
        await sendTelegramMessage(fromId, `🔥 <b>ТОП ГОРЯЩИХ ТЕНДЕРОВ (СКОРО ДЕДЛАЙН)${pageInfo}:</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of pageHot) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }

        const navButtons: Array<Array<{ text: string; callback_data: string }>> = [];
        if (hasMore) {
          navButtons.push([
            { text: `➡️ Показать ещё горящие (${hot.length - nextOffset} ост.)`, callback_data: `cmd_hot_page:${nextOffset}` }
          ]);
        }
        navButtons.push([
          { text: "🎯 Мои тендеры", callback_data: "cmd_my_tenders" },
          { text: "💎 Топ по бюджету", callback_data: "cmd_top" },
        ]);

        await sendTelegramMessage(fromId, hasMore ? `👇 <i>Нажмите для просмотра следующих лотов:</i>` : `✅ <i>Конец списка горящих закупок.</i>`, {
          reply_markup: { inline_keyboard: navButtons },
        });
      }
      return { ok: true };
    }

    if (data.startsWith("cmd_top") || data.startsWith("cmd_top_page:")) {
      let offset = 0;
      if (data.startsWith("cmd_top_page:")) {
        offset = parseInt(data.slice(13), 10) || 0;
      }
      await answerCallbackQuery(query.id, "Загружаем топ тендеров...");
      const tenders = await listTenders(200);
      const top = [...tenders].sort((a, b) => b.budget - a.budget);

      const pageTop = top.slice(offset, offset + 3);
      const nextOffset = offset + 3;
      const hasMore = nextOffset < top.length;

      if (pageTop.length === 0) {
        await sendTelegramMessage(fromId, "ℹ️ Тендеры ещё не загружены.");
      } else {
        const pageInfo = top.length > 3 ? ` [Лоты ${offset + 1}–${Math.min(offset + pageTop.length, top.length)} из ${top.length}]` : "";
        await sendTelegramMessage(fromId, `💎 <b>ТОП КРУПНЕЙШИХ ТЕНДЕРОВ ПО БЮДЖЕТУ${pageInfo}:</b>\n━━━━━━━━━━━━━━━━━━━━`);
        for (const tender of pageTop) {
          const card = formatTenderTelegramCard(tender);
          await sendTelegramMessage(fromId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
        }

        const navButtons: Array<Array<{ text: string; callback_data: string }>> = [];
        if (hasMore) {
          navButtons.push([
            { text: `➡️ Показать ещё (${top.length - nextOffset} ост.)`, callback_data: `cmd_top_page:${nextOffset}` }
          ]);
        }
        navButtons.push([
          { text: "🎯 Мои тендеры", callback_data: "cmd_my_tenders" },
          { text: "🔥 Горящие", callback_data: "cmd_hot" },
        ]);

        await sendTelegramMessage(fromId, hasMore ? `👇 <i>Нажмите для просмотра следующих лотов:</i>` : `✅ <i>Конец списка топ-бюджетных закупок.</i>`, {
          reply_markup: { inline_keyboard: navButtons },
        });
      }
      return { ok: true };
    }

    if (data === "cmd_info") {
      await answerCallbackQuery(query.id);
      const guideText = `📖 <b>СПРАВКА И РУКОВОДСТВО ПО БОТУ:</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎯 <b>Как работает радар?</b>\n` +
        `• Бот мониторит официальный портал Госзакупок РК и моментально находит свежие лоты.\n` +
        `• В разделе <b>«⚙️ Настроить фильтр»</b> выберите ваш город/район и отрасль.\n` +
        `• Нажимайте <b>«🎯 Мои тендеры»</b> для персональной выборки.\n\n` +
        `📁 <b>Управление закупками:</b>\n` +
        `• <b>★ В избранное</b> — сохраняет лот в закладки.\n` +
        `• <b>📁 В работу</b> — берёт лот в работу и включает персональные напоминания о дедлайне за 48ч, 24ч и 3ч.\n` +
        `• <b>⛔ Скрыть</b> — убирает ненужный лот из ленты.\n\n` +
        `🌐 <b>Сайт платформы:</b>\n` +
        `• Нажмите <b>«🌐 Войти на сайт»</b> или команду /web для работы на компьютере без паролей!`;
      await sendTelegramMessage(fromId, guideText, { reply_markup: MAIN_INLINE_MENU });
      return { ok: true };
    }

    if (data === "cmd_filter") {
      await answerCallbackQuery(query.id);
      await sendFilterSettingsMessage(fromId);
      return { ok: true };
    }

    if (data === "cmd_web") {
      await answerCallbackQuery(query.id);
      return handleTelegramUpdate({
        message: {
          chat: { id: Number(fromId) },
          from: { id: Number(fromId), username: query.from.username, first_name: query.from.first_name },
          text: "/web",
        },
      });
    }

    if (data === "cmd_ref") {
      await answerCallbackQuery(query.id);
      return handleTelegramUpdate({
        message: {
          chat: { id: Number(fromId) },
          from: { id: Number(fromId), username: query.from.username, first_name: query.from.first_name },
          text: "/ref",
        },
      });
    }

    if (data === "cmd_pricing") {
      await answerCallbackQuery(query.id);
      return handleTelegramUpdate({
        message: {
          chat: { id: Number(fromId) },
          from: { id: Number(fromId), username: query.from.username, first_name: query.from.first_name },
          text: "/pricing",
        },
      });
    }

    if (data === "cmd_status") {
      await answerCallbackQuery(query.id);
      return handleTelegramUpdate({
        message: {
          chat: { id: Number(fromId) },
          from: { id: Number(fromId), username: query.from.username, first_name: query.from.first_name },
          text: "/status",
        },
      });
    }


    if (data === "cmd_stats" || data === "cmd_crm") {
      await answerCallbackQuery(query.id);
      const stats = await getTelegramSubscriberStats();
      let report = `📊 <b>СТАТИСТИКА АКТИВНОСТИ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 <b>Всего пользователей:</b> <b>${stats.totalUsers} чел.</b>\n` +
        `⚡ <b>Активных за 24 часа:</b> <b>${stats.activeToday} чел.</b>\n` +
        `🎁 <b>На бесплатном триале:</b> <b>${stats.activeTrial} чел.</b>\n` +
        `💎 <b>С активной подпиской:</b> <b>${stats.activePaid} чел.</b>\n` +
        `🔒 <b>С истекшим доступом:</b> <b>${stats.expired} чел.</b>\n` +
        `🔗 <b>Приглашено по рефералам:</b> <b>${stats.totalReferrals} чел.</b>\n\n` +
        `📋 <b>Пользователи в системе:</b>\n\n`;

      if (stats.subscribers.length === 0) {
        report += `<i>Пока нет зарегистрированных пользователей.</i>\n`;
      } else {
        for (const [idx, s] of stats.subscribers.slice(0, 10).entries()) {
          const check = isSubActive(s);
          const statusIcon = check.active ? (check.isTrial ? "⏳ Триал" : "✅ Оплачен") : "🔒 Истёк";
          const name = s.firstName || (s.username ? `@${s.username}` : "Пользователь");
          report += `<b>${idx + 1}. ${name}</b> (ID: <code>${s.chatId}</code>)\n` +
            `• Статус: <b>${statusIcon}</b> (до ${check.expiresStr}, ост. ${check.daysLeft} дн.)\n` +
            `• Рефералов: ${s.referralsCount || 0}\n\n`;
        }
      }
      report += `💡 <i>Выдать / продлить подписку:</i> <code>/grant CHAT_ID ДНИ</code>`;

      await sendTelegramMessage(fromId, report, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Обновить статистику", callback_data: "cmd_stats" }],
            [{ text: "🌐 Веб-панель администратора", url: "https://qaztender-radar-xf7n.onrender.com/admin/users" }],
          ],
        },
      });
      return { ok: true };
    }

    if (data === "cmd_info") {
      await answerCallbackQuery(query.id);
      return handleTelegramUpdate({
        message: {
          chat: { id: fromId },
          from: { id: fromId, username: query.from.username, first_name: query.from.first_name },
          text: "/info",
        },
      });
    }

    if (data === "done") {
      await answerCallbackQuery(query.id, "Действие уже выполнено.");
      return { ok: true };
    }
  }

  return { ok: true };
}

export async function sendAdminRecommendation(adminUsername: string, targetUserId: string, tender: TenderRecord, note: string) {
  const sub = await getTelegramSubscriberByUserId(targetUserId);
  if (!sub || sub.status !== "approved") {
    throw new Error("Сотрудник не подключил Telegram или его доступ не одобрен");
  }

  const profile = await getCompanyProfile(targetUserId);
  const card = formatTenderTelegramCard(tender, profile, `Рекомендация от @${adminUsername}: ${note}`);
  const res = await sendTelegramMessage(sub.chatId, card.text, { reply_markup: card.reply_markup });
  if (res.ok) {
    await recordTelegramDelivery(targetUserId, sub.chatId, tender.externalId, "manual_admin");
  }
  return res;
}

export async function checkAndSendInstantNewTenders(records: TenderRecord[]): Promise<{ delivered: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  const adminChatId = getAdminChatId();
  let delivered = 0;

  // Add admin if not in subscribers
  const targets = [...subscribers];
  if (adminChatId && !targets.some((s) => s.chatId === adminChatId)) {
    targets.push({
      id: "admin",
      userId: "admin",
      chatId: adminChatId,
      username: "admin",
      firstName: "Admin",
      status: "approved",
      requestedAt: Date.now(),
      approvedAt: Date.now(),
      approvedBy: "system",
      digestEnabled: true,
      instantEnabled: true,
      deadlinesEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  for (const sub of targets) {
    if (!sub.instantEnabled) continue;
    const filter = await getTelegramFilter(sub.chatId);
    const loc = localities.find((l) => l.value === filter.locality);
    const cat = INDUSTRY_CATEGORIES.find((c) => c.id === filter.category);

    for (const tender of records.slice(0, 50)) {
      // Check location match
      if (loc && loc.keywords && loc.keywords.length > 0) {
        const textToSearch = `${tender.title} ${tender.buyer} ${tender.regionName} ${tender.kato}`.toLowerCase();
        const matchesLoc = loc.keywords.some((k) => textToSearch.includes(k));
        if (!matchesLoc) continue;
      }

      // Check category match
      if (cat && cat.keywords && cat.keywords.length > 0) {
        if (!(cat.id === "construction" && tender.isConstructionWork)) {
          const textToSearch = `${tender.title} ${tender.buyer} ${tender.subjectType} ${tender.methodName}`.toLowerCase();
          const matchesCat = cat.keywords.some((k) => textToSearch.includes(k));
          if (!matchesCat) continue;
        }
      }

      // Check budget
      if (filter.maxBudget > 0 && tender.budget > filter.maxBudget) continue;

      // Check delivery record
      const alreadySent = await isTenderDeliveredToUser(sub.userId, tender.externalId, "instant_new");
      if (alreadySent) continue;

      const card = formatTenderTelegramCard(tender, null, undefined, sub.chatId === adminChatId);
      const alertText = `🚨 <b>НОВЫЙ ПОДХОДЯЩИЙ ТЕНДЕР В ВАШЕМ РЕГИОНЕ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` + card.text;

      const res = await sendTelegramMessage(sub.chatId, alertText, { reply_markup: { inline_keyboard: card.buttons } });
      if (res.ok) {
        await recordTelegramDelivery(sub.userId, sub.chatId, tender.externalId, "instant_new");
        delivered++;
      }
    }
  }

  return { delivered };
}

export async function checkAndSendDeadlineAlerts(): Promise<{ delivered: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  let delivered = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const tenders = await listTenders(500);

  for (const sub of subscribers) {
    const ownerKey = `user:${sub.userId}`;
    const workflow = await listTenderWorkflow(ownerKey);

    const relevantTenders = workflow.filter((w) => w.isFavorite || w.stage === "participating" || w.stage === "reviewing");

    for (const item of relevantTenders) {
      const tender = tenders.find((t) => t.externalId === item.tenderId);
      if (!tender || !tender.endDate) continue;

      const timeLeft = tender.endDate - now;
      if (timeLeft > 0 && timeLeft <= dayMs) {
        const alreadySent = await isTenderDeliveredToUser(sub.userId, tender.externalId, "deadline_24h");
        if (!alreadySent) {
          const hoursLeft = Math.max(1, Math.round(timeLeft / (60 * 60 * 1000)));
          const alertText = `⏰ <b>СРОЧНОЕ НАПОМИНАНИЕ О ДЕДЛАЙНЕ!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
            `Заканчивается приём заявок (осталось <b>~${hoursLeft} ч.</b>):\n\n` +
            `📋 <b>№ ${tender.numberAnno}</b> · ${tender.methodName}\n` +
            `📌 <b>${tender.title}</b>\n` +
            `💰 <b>Бюджет:</b> ${moneyFormatter.format(tender.budget)}\n` +
            `🏢 <b>Заказчик:</b> ${tender.buyer}\n` +
            `📍 <b>Регион:</b> ${tender.regionName}\n` +
            `⏳ <b>Срок:</b> ${dateFormatter.format(tender.endDate)}\n\n` +
            `⚠️ <i>Проверьте прикрепление файлов, платёжного поручения обеспечения и подпишите заявку ЭЦП вовремя!</i>`;

          const buttons = [
            [{ text: "🌐 Открыть на Goszakup", url: tender.sourceUrl }],
          ];

          const res = await sendTelegramMessage(sub.chatId, alertText, { reply_markup: { inline_keyboard: buttons } });
          if (res.ok) {
            await recordTelegramDelivery(sub.userId, sub.chatId, tender.externalId, "deadline_24h");
            delivered++;
          }
        }
      }
    }
  }

  return { delivered };
}

export async function broadcastReapplyRequestToAllUsers(): Promise<{ notified: number }> {
  const subscribers = await listTelegramSubscribers();
  const adminChatId = getAdminChatId();
  let notified = 0;

  for (const sub of subscribers) {
    if (sub.chatId === adminChatId) continue;
    await updateTelegramSubscriberStatus(sub.userId, "pending", "system");
    const msg = `📢 <b>ОБНОВЛЕНИЕ ПЛАТФОРМЫ QAZTENDER RADAR</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
      `Здравствуйте, ${sub.firstName || "партнёр"}!\n\n` +
      `Мы обновили систему модерации и запустили тарифные планы под разные масштабы компаний.\n\n` +
      `Для подтверждения доступа, пожалуйста, заполните короткую анкету о себе/компании либо свяжитесь с разработчиком для выбора тарифа.\n\n` +
      `Нажмите кнопку ниже 👇`;

    const res = await sendTelegramMessage(sub.chatId, msg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📝 Заполнить заявку на доступ", callback_data: "apply_access" }],
          [{ text: "💬 Написать разработчику (Тарифы)", url: "https://t.me/mielonur" }],
        ],
      },
    });
    if (res.ok) {
      notified++;
    }
  }
  return { notified };
}
export async function checkAndSendScheduledDigests(): Promise<{ delivered: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  const adminChatId = getAdminChatId();
  let delivered = 0;
  const now = Date.now();

  const almatyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
  const hour = almatyDate.getHours();

  // Determine current slot
  let slot: "morning" | "afternoon" | "evening" | null = null;
  if (hour >= 8 && hour <= 11) slot = "morning";
  else if (hour >= 13 && hour <= 16) slot = "afternoon";
  else if (hour >= 18 && hour <= 21) slot = "evening";

  if (!slot) return { delivered: 0 };

  const slotTitle = slot === "morning" ? "🌅 УТРЕННЯЯ ПОДБОРКА ТЕНДЕРОВ (09:00)" :
    slot === "afternoon" ? "☀️ ОБЕДЕННАЯ СВОДКА ЗАКУПОК (14:00)" :
    "🌆 ВЕЧЕРНИЙ ОТЧЁТ ПО ТЕНДЕРАМ (19:00)";

  const targets = [...subscribers];
  if (adminChatId && !targets.some((s) => s.chatId === adminChatId)) {
    targets.push({
      id: "admin",
      userId: "admin",
      chatId: adminChatId,
      username: "admin",
      firstName: "Admin",
      status: "approved",
      requestedAt: now,
      approvedAt: now,
      approvedBy: "system",
      digestEnabled: true,
      instantEnabled: true,
      deadlinesEnabled: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const allTenders = await listTenders(500);

  for (const sub of targets) {
    const filter = await getTelegramFilter(sub.chatId);
    if (filter.schedule === "off") continue;

    // Check if user's schedule matches current slot
    const shouldSend = filter.schedule === "3times" || filter.schedule === slot;
    if (!shouldSend) continue;

    // Check delivery cooldown for this slot today
    const slotKey = `slot_${slot}_${almatyDate.toISOString().slice(0, 10)}`;
    const alreadySent = await isTenderDeliveredToUser(sub.userId, slotKey, "scheduled_digest");
    if (alreadySent) continue;

    const matched = allTenders
      .filter((t) => !t.endDate || t.endDate > now)
      .filter((t) => matchesTenderLocation(filter.locality, t))
      .filter((t) => matchesIndustryCategory(filter.category, t))
      .filter((t) => !filter.maxBudget || t.budget <= filter.maxBudget)
      .slice(0, 3);

    if (matched.length === 0) {
      continue;
    }

    const locLabel = getLocalityLabel(filter.locality);
    const catLabel = getCategoryLabel(filter.category);

    await sendTelegramMessage(sub.chatId, `🔔 <b>${slotTitle}</b>\n📍 <i>${locLabel} • ${catLabel}</i>\n━━━━━━━━━━━━━━━━━━━━`);
    for (const tender of matched) {
      const card = formatTenderTelegramCard(tender, null, undefined, sub.chatId === adminChatId);
      await sendTelegramMessage(sub.chatId, card.text, { reply_markup: { inline_keyboard: card.buttons } });
    }

    await sendTelegramMessage(sub.chatId, `💡 <i>Посмотреть больше лотов или изменить расписание:</i>`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "➡️ Показать ещё тендеры", callback_data: "cmd_my_page:3" }],
          [{ text: "⚙️ Настроить фильтр и время", callback_data: "open_filter_menu" }],
        ],
      },
    });

    await recordTelegramDelivery(sub.userId, sub.chatId, slotKey, "scheduled_digest");
    delivered++;
  }

  return { delivered };
}

export async function checkAndSendSubscriptionWarnings(): Promise<{ warned: number; paywalled: number }> {
  const subscribers = await listApprovedTelegramSubscribers();
  const adminChatId = getAdminChatId();
  let warned = 0;
  let paywalled = 0;
  const almatyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Almaty" }));
  const todayKey = almatyDate.toISOString().slice(0, 10);

  for (const sub of subscribers) {
    if (sub.chatId === adminChatId) continue;
    const subCheck = isSubActive(sub);

    // 1. Expiring soon (1 day left / between 0 and 24 hours left)
    if (subCheck.active && subCheck.daysLeft <= 1) {
      const warnKey = `warn_expiring_24h_${todayKey}`;
      const alreadyWarned = await isTenderDeliveredToUser(sub.userId, warnKey, "subscription_warning");
      if (!alreadyWarned) {
        const warnMsg = `⏳ <b>ВАШ ДОСТУП В QAZTENDER RADAR ЗАКАНЧИВАЕТСЯ СКОРО!</b>\n━━━━━━━━━━━━━━━━━━━━\n` +
          `Здравствуйте, <b>${sub.firstName || "партнёр"}</b>!\n\n` +
          `Срок вашего доступа истекает <b>${subCheck.expiresStr}</b>.\n\n` +
          `Чтобы не потерять утренние и вечерние рассылки свежих тендеров по вашим городам:\n` +
          `• Продлите подписку со скидкой через Kaspi\n` +
          `• Либо пригласите коллегу по реферальной ссылке и получите <b>+3 дня бесплатно</b>!\n\n` +
          `<i>Выберите действие ниже:</i>`;

        const buttons = [
          [{ text: "💳 Продлить подписку (Kaspi)", callback_data: "pay_kaspi" }],
          [{ text: "🎁 Получить +3 дня за друга", callback_data: "cmd_ref" }],
          [{ text: "💬 Написать разработчику (@mielonur)", url: "https://t.me/mielonur" }],
        ];

        const res = await sendTelegramMessage(sub.chatId, warnMsg, { reply_markup: { inline_keyboard: buttons } });
        if (res.ok) {
          await recordTelegramDelivery(sub.userId, sub.chatId, warnKey, "subscription_warning");
          warned++;
        }
      }
    }

    // 2. Already Expired (Trial / Subscription ended)
    if (!subCheck.active) {
      const expiredKey = `paywall_notice_${todayKey}`;
      const alreadyNotified = await isTenderDeliveredToUser(sub.userId, expiredKey, "paywall_notice");
      if (!alreadyNotified) {
        const pw = formatPaywallMessage(sub.chatId, sub.username, sub.firstName);
        const res = await sendTelegramMessage(sub.chatId, pw.text, { reply_markup: pw.reply_markup });
        if (res.ok) {
          await recordTelegramDelivery(sub.userId, sub.chatId, expiredKey, "paywall_notice");
          paywalled++;
        }
      }
    }
  }

  return { warned, paywalled };
}

export const handleTelegramWebhook = handleTelegramUpdate;


