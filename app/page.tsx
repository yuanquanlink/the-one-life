"use client";

/* eslint-disable @next/next/no-img-element -- local data URLs are intentionally device-only */

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ThemeId = "forest" | "ocean" | "cafe" | "starlight";
type SectionId =
  | "home" | "command" | "focus" | "insights" | "energy" | "todos" | "calendar" | "finance" | "news" | "habits"
  | "ideas" | "learning" | "english" | "weight" | "review" | "sleep"
  | "water" | "exercise" | "diet" | "medicine" | "reading" | "projects"
  | "family" | "gallery" | "garden" | "profile" | "settings";

type RecordItem = {
  id: string;
  title: string;
  note?: string;
  value?: number;
  type?: "income" | "expense";
  date: string;
  done?: boolean;
  checkins?: string[];
  createdAt: string;
};

type AppState = {
  records: Partial<Record<SectionId, RecordItem[]>>;
  xp: number;
  coins: number;
  waterPoints: number;
  settings: { theme: ThemeId; reducedMotion: boolean; agentTone: "warm" | "pro" | "fun"; monthlyBudget?: number };
};

type NewsItem = { title: string; source: string; time: string; url: string };

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onerror: () => void;
      start: () => void;
    };
    webkitSpeechRecognition?: Window["SpeechRecognition"];
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const dayKey = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const storageKey = "the-one-life:v1";
const plantStageNames = ["种子", "发芽", "成长", "开花"];

const initialState: AppState = {
  records: {
    todos: [
      { id: "demo-todo-1", title: "整理本周计划", note: "先完成最重要的三件事", date: today(), done: false, createdAt: new Date().toISOString() },
      { id: "demo-todo-2", title: "散步 20 分钟", note: "让身体和思路都松一松", date: today(), done: true, createdAt: new Date().toISOString() },
    ],
    habits: [
      { id: "demo-habit-1", title: "阅读 20 分钟", note: "每天积累一点", date: today(), checkins: [today()], createdAt: new Date().toISOString() },
      { id: "demo-habit-2", title: "早点休息", note: "23:30 前上床", date: today(), checkins: [], createdAt: new Date().toISOString() },
    ],
    finance: [
      { id: "demo-money-1", title: "示例：生活预算", value: 3000, type: "income", date: today(), createdAt: new Date().toISOString() },
      { id: "demo-money-2", title: "示例：早餐", value: 18, type: "expense", date: today(), createdAt: new Date().toISOString() },
    ],
    weight: [], ideas: [], learning: [], english: [], review: [], calendar: [], sleep: [],
    water: [], exercise: [], diet: [], medicine: [], reading: [], projects: [], family: [], gallery: [],
  },
  xp: 46,
  coins: 28,
  waterPoints: 3,
  settings: { theme: "forest", reducedMotion: false, agentTone: "warm", monthlyBudget: 4000 },
};

const sections: Array<{ id: SectionId; label: string; mark: string; group: string; hint: string; valueLabel?: string }> = [
  { id: "home", label: "生活总览", mark: "⌂", group: "今天", hint: "今天的重要信息" },
  { id: "command", label: "今日航线", mark: "◉", group: "今天", hint: "一件要事、快速收集与能量状态" },
  { id: "focus", label: "专注舱", mark: "▰", group: "今天", hint: "时间盒、休息提醒与专注记录" },
  { id: "insights", label: "周趋势", mark: "▥", group: "成长", hint: "从七天记录里发现自己的节奏" },
  { id: "todos", label: "今日待办", mark: "✓", group: "今天", hint: "任务、优先级与完成状态" },
  { id: "calendar", label: "日历事件", mark: "▦", group: "今天", hint: "安排重要日期" },
  { id: "finance", label: "收支记账", mark: "¥", group: "生活", hint: "收入、支出与余额", valueLabel: "金额" },
  { id: "news", label: "AI 新闻", mark: "N", group: "成长", hint: "来自公开数据源的最新内容" },
  { id: "habits", label: "习惯打卡", mark: "◆", group: "生活", hint: "连续行动，缓慢生长" },
  { id: "ideas", label: "灵感记录", mark: "✦", group: "成长", hint: "留住忽然出现的想法" },
  { id: "learning", label: "学习计划", mark: "▤", group: "成长", hint: "课程、目标与进度", valueLabel: "进度 %" },
  { id: "english", label: "英语练习", mark: "A", group: "成长", hint: "单词、例句和每日一句" },
  { id: "weight", label: "体重趋势", mark: "≈", group: "健康", hint: "仅供日常记录，不作医疗判断", valueLabel: "公斤" },
  { id: "review", label: "每日复盘", mark: "↺", group: "今天", hint: "收获、改进与明日重点" },
  { id: "sleep", label: "睡眠记录", mark: "☾", group: "健康", hint: "睡眠时长与感受", valueLabel: "小时" },
  { id: "water", label: "喝水记录", mark: "◇", group: "健康", hint: "记录每日饮水", valueLabel: "毫升" },
  { id: "exercise", label: "运动记录", mark: "↗", group: "健康", hint: "运动类型和时长", valueLabel: "分钟" },
  { id: "diet", label: "饮食记录", mark: "◎", group: "健康", hint: "简单记录，不计算焦虑" },
  { id: "medicine", label: "用药提醒", mark: "+", group: "健康", hint: "按医嘱设置个人提醒" },
  { id: "reading", label: "阅读书架", mark: "▥", group: "成长", hint: "书目、摘记与进度", valueLabel: "进度 %" },
  { id: "projects", label: "项目管理", mark: "▣", group: "计划", hint: "推进正在发生的项目", valueLabel: "进度 %" },
  { id: "family", label: "家庭计划", mark: "⌂", group: "计划", hint: "共同事件与备忘" },
  { id: "gallery", label: "个人相册", mark: "▧", group: "收藏", hint: "图片仅保存在当前设备" },
  { id: "garden", label: "奖励花园", mark: "♣", group: "收藏", hint: "任务让植物和小镇一起成长" },
  { id: "profile", label: "成长画像", mark: "◈", group: "我的", hint: "五维成长与像素角色" },
  { id: "settings", label: "设置与安装", mark: "⚙", group: "我的", hint: "主题、数据与三平台安装" },
];

const themeOptions: Array<{ id: ThemeId; name: string; desc: string }> = [
  { id: "forest", name: "森林小镇", desc: "苔绿 · 麦芽黄" },
  { id: "ocean", name: "海边假日", desc: "海蓝 · 珊瑚橙" },
  { id: "cafe", name: "复古咖啡馆", desc: "咖啡棕 · 砖红" },
  { id: "starlight", name: "星空书房", desc: "靛蓝 · 月光紫" },
];

const fallbackNews: NewsItem[] = [
  { title: "AI 新闻暂时离线：稍后可再次刷新", source: "备用内容", time: "未连接实时数据源", url: "https://news.ycombinator.com/" },
  { title: "提示：实时内容会显示来源、时间和原文链接", source: "备用内容", time: "本地说明", url: "https://news.ycombinator.com/" },
];

function formatDate(input: string) {
  if (!input) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(`${input}T08:00:00`));
}

function safeRecords(state: AppState, section: SectionId) {
  return state.records[section] || [];
}

function normalizeState(input: AppState): AppState {
  return {
    ...initialState,
    ...input,
    records: { ...initialState.records, ...(input.records || {}) },
    settings: { ...initialState.settings, ...(input.settings || {}) },
  };
}

export default function Home() {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState<SectionId>("home");
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", value: "", date: today(), type: "expense" as "income" | "expense" });
  const [editing, setEditing] = useState<{ section: SectionId; item: RecordItem } | null>(null);
  const [summary, setSummary] = useState("点击生成按钮，小一会根据当前记录给出今天的总结和下一步建议。");
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);
  const [newsStatus, setNewsStatus] = useState("备用内容");
  const [newsUpdated, setNewsUpdated] = useState("尚未刷新");
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentInput, setAgentInput] = useState("");
  const [agentMessages, setAgentMessages] = useState(["你好，我是小一。你可以让我打开栏目、查询任务，或总结今天。"]);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installTip, setInstallTip] = useState("");
  const [installGuide, setInstallGuide] = useState("");
  const [capture, setCapture] = useState("");
  const [captureType, setCaptureType] = useState<"todos" | "ideas" | "calendar">("todos");
  const [plannerNote, setPlannerNote] = useState("先收拢，再聚焦。小一会根据今天的记录生成一条轻量行动路线。");

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try { setState(normalizeState(JSON.parse(stored) as AppState)); } catch { /* keep safe defaults */ }
      }
      setHydrated(true);
    }, 0);

    const installListener = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", installListener);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => { window.clearTimeout(hydrateTimer); window.removeEventListener("beforeinstallprompt", installListener); };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(state));
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.motion = state.settings.reducedMotion ? "reduced" : "full";
  }, [state, hydrated]);

  const todoItems = safeRecords(state, "todos");
  const habitItems = safeRecords(state, "habits");
  const moneyItems = safeRecords(state, "finance");
  const focusItems = safeRecords(state, "focus");
  const energyItems = safeRecords(state, "energy");
  const balance = moneyItems.reduce((sum, item) => sum + (item.type === "income" ? item.value || 0 : -(item.value || 0)), 0);
  const todoDone = todoItems.filter((item) => item.done).length;
  const habitsDone = habitItems.filter((item) => item.checkins?.includes(today())).length;
  const weekKeys = Array.from({ length: 7 }, (_, index) => dayKey(index - 6));
  const focusWeek = focusItems.filter((item) => weekKeys.includes(item.date)).reduce((sum, item) => sum + (item.value || 0), 0);
  const monthPrefix = today().slice(0, 7);
  const monthExpense = moneyItems.filter((item) => item.type === "expense" && item.date.startsWith(monthPrefix)).reduce((sum, item) => sum + (item.value || 0), 0);
  const monthlyBudget = state.settings.monthlyBudget || 4000;
  const todayEnergy = energyItems.find((item) => item.date === today())?.value || 3;
  const level = Math.floor(state.xp / 100) + 1;
  const levelProgress = state.xp % 100;
  const plantStage = state.waterPoints < 3 ? 0 : state.waterPoints < 8 ? 1 : state.waterPoints < 16 ? 2 : 3;
  const activeMeta = sections.find((section) => section.id === active) || sections[0];

  const profileMetrics = useMemo(() => {
    const health = Math.min(96, 36 + safeRecords(state, "exercise").length * 6 + habitsDone * 10);
    const learning = Math.min(96, 40 + safeRecords(state, "learning").length * 7 + safeRecords(state, "reading").length * 5);
    const efficiency = Math.min(96, 35 + todoDone * 12);
    const finance = Math.min(96, 50 + Math.max(-10, Math.min(30, Math.round(balance / 200))));
    const balanceScore = Math.min(96, 42 + safeRecords(state, "review").length * 6 + safeRecords(state, "sleep").length * 4);
    return [health, learning, efficiency, finance, balanceScore];
  }, [state, habitsDone, todoDone, balance]);

  function updateRecords(section: SectionId, updater: (items: RecordItem[]) => RecordItem[]) {
    setState((current) => ({ ...current, records: { ...current.records, [section]: updater(safeRecords(current, section)) } }));
  }

  function addRecord(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    const newItem: RecordItem = {
      id: uid(), title: form.title.trim(), note: form.note.trim(), date: form.date || today(),
      value: form.value ? Number(form.value) : undefined,
      type: active === "finance" ? form.type : undefined,
      done: false, checkins: active === "habits" ? [] : undefined, createdAt: new Date().toISOString(),
    };
    updateRecords(active, (items) => [newItem, ...items]);
    setForm({ title: "", note: "", value: "", date: today(), type: "expense" });
  }

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    updateRecords(editing.section, (items) => items.map((item) => item.id === editing.item.id ? editing.item : item));
    setEditing(null);
  }

  function removeRecord(section: SectionId, item: RecordItem) {
    if (!window.confirm(`删除“${item.title}”？`)) return;
    updateRecords(section, (items) => items.filter((candidate) => candidate.id !== item.id));
  }

  function toggleRecord(section: SectionId, item: RecordItem) {
    const isHabit = section === "habits";
    const wasDone = isHabit ? item.checkins?.includes(today()) : item.done;
    updateRecords(section, (items) => items.map((candidate) => {
      if (candidate.id !== item.id) return candidate;
      if (isHabit) {
        const checkins = candidate.checkins || [];
        return { ...candidate, checkins: wasDone ? checkins.filter((day) => day !== today()) : [...checkins, today()] };
      }
      return { ...candidate, done: !candidate.done };
    }));
    const xpDelta = section === "todos" ? 12 : isHabit ? 8 : 6;
    const coinDelta = section === "todos" ? 5 : isHabit ? 3 : 2;
    setState((current) => ({
      ...current,
      xp: Math.max(0, current.xp + (wasDone ? -xpDelta : xpDelta)),
      coins: Math.max(0, current.coins + (wasDone ? -coinDelta : coinDelta)),
      waterPoints: Math.max(0, current.waterPoints + (wasDone ? -1 : 1)),
    }));
  }

  async function refreshNews() {
    setNewsStatus("正在连接…");
    try {
      const response = await fetch("https://hn.algolia.com/api/v1/search_by_date?query=AI&tags=story&hitsPerPage=8");
      if (!response.ok) throw new Error("news unavailable");
      const data = await response.json() as { hits: Array<{ title?: string; story_title?: string; url?: string; story_url?: string; created_at: string; author: string }> };
      const items = data.hits.filter((hit) => hit.title || hit.story_title).slice(0, 6).map((hit) => ({
        title: hit.title || hit.story_title || "AI 动态",
        source: `Hacker News · ${hit.author}`,
        time: new Date(hit.created_at).toLocaleString("zh-CN"),
        url: hit.url || hit.story_url || "https://news.ycombinator.com/",
      }));
      if (!items.length) throw new Error("empty news");
      setNews(items);
      setNewsStatus("实时内容");
      setNewsUpdated(new Date().toLocaleString("zh-CN"));
    } catch {
      setNews(fallbackNews);
      setNewsStatus("备用内容");
      setNewsUpdated(new Date().toLocaleString("zh-CN"));
    }
  }

  function generateSummary() {
    const remaining = todoItems.length - todoDone;
    const latestWeight = safeRecords(state, "weight")[0]?.value;
    const parts = [
      `今天完成 ${todoDone}/${todoItems.length} 项任务，${habitsDone}/${habitItems.length} 个习惯已打卡。`,
      remaining > 0 ? `建议先选出剩余 ${remaining} 项中最重要的一件，用 25 分钟专注完成。` : "今日待办已经清空，可以留一点时间休息或复盘。",
      balance < 0 ? "当前记录的支出高于收入，建议检查非必要开销。" : `当前记录余额为 ¥${balance.toFixed(2)}，财务状态保持平稳。`,
      `近 7 天累计专注 ${focusWeek} 分钟；本月预算已使用 ${Math.round(monthExpense / monthlyBudget * 100)}%。`,
      todayEnergy <= 2 ? "今天能量偏低，把目标缩小到能启动的程度，比硬撑更有效。" : todayEnergy >= 4 ? "今天能量充足，优先把它用在最重要且最费脑的任务上。" : "今天能量适中，用稳定节奏推进即可。",
      latestWeight ? `最近一次体重记录为 ${latestWeight} kg；关注长期趋势，不必被单日波动影响。` : "健康记录还不多，可以从睡眠或饮水开始轻量记录。",
      `植物处于“${plantStageNames[plantStage]}”阶段，再完成 ${Math.max(1, [3, 8, 16, 24][plantStage] - state.waterPoints)} 次行动会更接近下一次成长。`,
    ];
    setSummary(parts.join(" "));
  }

  function runAgent(raw: string) {
    const command = raw.trim();
    if (!command) return;
    setAgentMessages((messages) => [...messages, `你：${command}`]);
    let reply = "我可以帮你打开栏目、查询任务、查看习惯进度、开始复盘或总结今天。";
    if (command.includes("待办")) {
      if (command.includes("打开")) { setActive("todos"); setDrawer(false); reply = "已经打开今日待办。"; }
      else reply = `今天还有 ${todoItems.length - todoDone} 项待办未完成。`;
    } else if (command.includes("新闻")) {
      setActive("news"); setDrawer(false); reply = "已经打开 AI 新闻，可以点击刷新获取最新内容。";
    } else if (command.includes("习惯")) {
      reply = `今天完成了 ${habitsDone}/${habitItems.length} 个习惯打卡。`;
    } else if (command.includes("复盘")) {
      setActive("review"); setDrawer(false); reply = "已经打开每日复盘，先写下今天最值得记住的一件事吧。";
    } else if (command.includes("总结") || command.includes("建议")) {
      generateSummary(); setActive("home"); reply = "今日总结已经更新在首页。";
    } else if (command.includes("记账")) {
      setActive("finance"); setDrawer(false); reply = "已经打开收支记账。";
    } else if (command.includes("专注") || command.includes("番茄")) {
      setActive("focus"); setDrawer(false); reply = `已经打开专注舱。近 7 天累计专注 ${focusWeek} 分钟。`;
    } else if (command.includes("趋势") || command.includes("周报")) {
      setActive("insights"); setDrawer(false); reply = "已经打开周趋势，可以查看任务、习惯、专注和能量节奏。";
    } else if (command.includes("航线") || command.includes("计划")) {
      buildDailyRoute(); setActive("command"); setDrawer(false); reply = "今日航线已经更新。";
    }
    setAgentMessages((messages) => [...messages, `小一：${reply}`]);
    setAgentInput("");
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setAgentMessages((messages) => [...messages, "小一：当前浏览器不支持语音输入，文字输入仍可正常使用。"]);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event) => runAgent(event.results[0][0].transcript);
    recognition.onerror = () => setAgentMessages((messages) => [...messages, "小一：没有听清，已自动切换为文字输入。"]);
    recognition.start();
  }

  async function installApp(platform: "android" | "ios" | "harmony") {
    if ((platform === "android" || platform === "harmony") && installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      const message = choice.outcome === "accepted" ? "安装请求已发送，请查看桌面图标。" : "已取消安装，随时可以再次尝试。";
      setInstallTip(message);
      setInstallGuide(message);
      setInstallEvent(null);
      return;
    }
    const message = platform === "ios"
      ? "请使用 Safari 打开，点击底部“分享”，再选择“添加到主屏幕”。"
      : platform === "android"
        ? "当前浏览器没有开放一键安装。请点击浏览器菜单，选择“安装应用”或“添加到主屏幕”。"
        : "华为浏览器没有开放一键安装。请点击浏览器底部“四点/更多”，再选择“添加至桌面”；若系统询问权限，请允许创建桌面快捷方式。";
    setInstallTip(message);
    setInstallGuide(message);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `the-one-life-${today()}.json`; anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { setState(JSON.parse(String(reader.result)) as AppState); setInstallTip("数据已成功导入。"); }
      catch { setInstallTip("无法读取这个备份文件，请确认文件格式正确。"); }
    };
    reader.readAsText(file);
  }

  function addGalleryImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/webp", 0.78);
        updateRecords("gallery", (items) => [{ id: uid(), title: file.name, note: dataUrl, date: today(), createdAt: new Date().toISOString() }, ...items]);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function quickCapture(event: FormEvent) {
    event.preventDefault();
    const title = capture.trim();
    if (!title) return;
    updateRecords(captureType, (items) => [{
      id: uid(), title, note: captureType === "todos" ? "来自今日航线" : "快速收集",
      date: today(), done: false, createdAt: new Date().toISOString(),
    }, ...items]);
    setCapture("");
    setPlannerNote(captureType === "todos" ? "新任务已经进入今日航线。先判断它是否比当前第一件事更重要。" : "内容已收好，不需要现在处理，继续做眼前的一件事。");
  }

  function setEnergy(value: number) {
    updateRecords("energy", (items) => {
      const current = items.find((item) => item.date === today());
      if (current) return items.map((item) => item.id === current.id ? { ...item, value } : item);
      return [{ id: uid(), title: "今日能量", value, date: today(), createdAt: new Date().toISOString() }, ...items];
    });
  }

  function moveTodo(item: RecordItem, direction: -1 | 1) {
    updateRecords("todos", (items) => {
      const from = items.findIndex((candidate) => candidate.id === item.id);
      const to = Math.max(0, Math.min(items.length - 1, from + direction));
      if (from < 0 || from === to) return items;
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function buildDailyRoute() {
    const remaining = todoItems.filter((item) => !item.done);
    const energyAdvice = todayEnergy <= 2 ? "能量偏低，先做 15 分钟的小版本" : todayEnergy >= 4 ? "能量不错，适合攻克最难的一段" : "状态平稳，用 25 分钟推进";
    const habitAdvice = habitsDone < habitItems.length ? `，之后补上 ${habitItems.length - habitsDone} 个习惯打卡` : "，今天的习惯已全部完成";
    setPlannerNote(remaining.length ? `第一站：${remaining[0].title}。${energyAdvice}${habitAdvice}。` : `待办已经清空。${energyAdvice}，可以整理灵感或做一次复盘。`);
  }

  function logFocus(minutes: number, taskTitle: string) {
    updateRecords("focus", (items) => [{ id: uid(), title: taskTitle || "自由专注", note: "专注舱完成", value: minutes, date: today(), done: true, createdAt: new Date().toISOString() }, ...items]);
    setState((current) => ({ ...current, xp: current.xp + Math.max(5, Math.round(minutes / 2)), coins: current.coins + Math.max(2, Math.round(minutes / 10)), waterPoints: current.waterPoints + 1 }));
  }

  function switchSection(id: SectionId) {
    setActive(id); setDrawer(false); setForm({ title: "", note: "", value: "", date: today(), type: "expense" }); window.scrollTo({ top: 0, behavior: state.settings.reducedMotion ? "auto" : "smooth" });
  }

  const grouped = Array.from(new Set(sections.map((section) => section.group)));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">跳到主要内容</a>
      <header className="mobile-header">
        <button className="pixel-button icon-button" onClick={() => setDrawer(true)} aria-label="打开导航">☰</button>
        <div><strong>The One Life</strong><span>你的像素生活小镇</span></div>
        <button className="coin-pill" onClick={() => switchSection("garden")} aria-label="查看奖励">◆ {state.coins}</button>
      </header>

      {drawer && <button className="drawer-backdrop" aria-label="关闭导航" onClick={() => setDrawer(false)} />}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${drawer ? "open" : ""}`} aria-label="主导航">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></div>
          {!collapsed && <div><strong>The One Life</strong><span>PIXEL LIFE OS</span></div>}
          <button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "展开侧栏" : "收起侧栏"}>{collapsed ? "›" : "‹"}</button>
        </div>
        <nav>
          {grouped.map((group) => (
            <div className="nav-group" key={group}>
              {!collapsed && <p>{group}</p>}
              {sections.filter((section) => section.group === group).map((section) => (
                <button key={section.id} className={active === section.id ? "active" : ""} onClick={() => switchSection(section.id)} title={section.label} data-testid={`nav-${section.id}`}>
                  <span className="nav-mark">{section.mark}</span>{!collapsed && <span>{section.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        {!collapsed && <div className="sidebar-footer"><span className="status-dot" /> 数据保存在当前设备</div>}
      </aside>

      <main id="main" className={collapsed ? "wide" : ""}>
        <div className="topbar">
          <div>
            <p className="eyebrow">THE ONE LIFE · LEVEL {level}</p>
            <h1>{activeMeta.label}</h1>
            <p>{activeMeta.hint}</p>
          </div>
          <div className="top-actions">
            <label className="theme-select">主题
              <select value={state.settings.theme} onChange={(event) => setState((current) => ({ ...current, settings: { ...current.settings, theme: event.target.value as ThemeId } }))}>
                {themeOptions.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
              </select>
            </label>
            <button className="pixel-button" onClick={() => switchSection("settings")}>安装应用</button>
          </div>
        </div>

        {active === "home" && (
          <div className="page-stack fade-in">
            <section className="hero-card pixel-frame">
              <div className="hero-copy">
                <span className="mini-label">DAY {Math.max(1, Math.floor(state.xp / 18))} · {new Date().toLocaleDateString("zh-CN", { weekday: "long", month: "long", day: "numeric" })}</span>
                <h2>欢迎回来，The One。</h2>
                <p>把生活拆成轻松的小步，让每一次完成都在你的小镇里留下痕迹。</p>
                <div className="hero-actions">
                  <button className="pixel-button primary" onClick={() => switchSection("todos")}>开始今日任务</button>
                  <button className="pixel-button ghost" onClick={generateSummary}>生成 AI 总结</button>
                </div>
              </div>
              <div className={`pixel-scene stage-${plantStage}`} aria-label={`植物阶段：${plantStageNames[plantStage]}`}>
                <div className="sun-pixel" /><div className="cloud-pixel cloud-one" /><div className="cloud-pixel cloud-two" />
                <div className="hill hill-back" /><div className="hill hill-front" />
                <div className="plant-pot"><span className="stem" /><span className="leaf leaf-left" /><span className="leaf leaf-right" /><span className="flower" /></div>
                <div className="fox"><span className="ear left" /><span className="ear right" /><span className="face">•ᴗ•</span><span className="tail" /></div>
                <span className="scene-caption">{plantStageNames[plantStage]} · 浇水 {state.waterPoints}</span>
              </div>
            </section>

            <section className="stat-grid" aria-label="今日概览">
              <StatCard mark="✓" label="待办完成" value={`${todoDone}/${todoItems.length}`} note={todoItems.length === todoDone ? "全部完成" : "继续推进"} progress={todoItems.length ? todoDone / todoItems.length * 100 : 0} onClick={() => switchSection("todos")} />
              <StatCard mark="◆" label="习惯打卡" value={`${habitsDone}/${habitItems.length}`} note="今日进度" progress={habitItems.length ? habitsDone / habitItems.length * 100 : 0} onClick={() => switchSection("habits")} />
              <StatCard mark="¥" label="当前余额" value={`¥${balance.toFixed(0)}`} note={`${moneyItems.length} 条记录`} progress={Math.min(100, Math.max(8, 50 + balance / 100))} onClick={() => switchSection("finance")} />
              <StatCard mark="↑" label="成长等级" value={`Lv.${level}`} note={`${levelProgress}/100 XP`} progress={levelProgress} onClick={() => switchSection("profile")} />
            </section>

            <section className="feature-dock pixel-frame" aria-label="新增效率工具">
              <div><span className="mini-label">LIFE COMMAND DECK</span><strong>把今天排成一条能走完的航线</strong><small>优先级 · 专注钟 · 周趋势 · 本地数据</small></div>
              <button onClick={() => switchSection("command")}><span>◉</span><strong>今日航线</strong><small>收集并排出第一件事</small></button>
              <button onClick={() => switchSection("focus")}><span>▰</span><strong>专注舱</strong><small>{focusWeek} 分钟 / 近 7 天</small></button>
              <button onClick={() => switchSection("insights")}><span>▥</span><strong>周趋势</strong><small>发现你的有效节奏</small></button>
            </section>

            <section className="home-grid">
              <div className="panel pixel-frame">
                <div className="panel-heading"><div><span className="mini-label">TODAY&apos;S QUESTS</span><h3>今天的任务</h3></div><button className="text-button" onClick={() => switchSection("todos")}>查看全部 →</button></div>
                <div className="compact-list">
                  {todoItems.slice(0, 4).map((item) => <button key={item.id} className={`quest-row ${item.done ? "done" : ""}`} onClick={() => toggleRecord("todos", item)}><span className="check-pixel">{item.done ? "✓" : ""}</span><span><strong>{item.title}</strong><small>{item.note || formatDate(item.date)}</small></span><em>+12 XP</em></button>)}
                  {!todoItems.length && <EmptyState text="今天还没有任务" action="添加第一项" onClick={() => switchSection("todos")} />}
                </div>
              </div>
              <div className="panel pixel-frame summary-panel">
                <div className="panel-heading"><div><span className="mini-label">ONE&apos;S NOTE</span><h3>小一的总结建议</h3></div><span className="agent-avatar tiny">一</span></div>
                <p>{summary}</p>
                <button className="pixel-button ghost full" onClick={generateSummary}>根据当前数据重新生成</button>
              </div>
            </section>
          </div>
        )}

        {active === "command" && <CommandPanel todos={todoItems} energy={todayEnergy} note={plannerNote} capture={capture} captureType={captureType} setCapture={setCapture} setCaptureType={setCaptureType} onCapture={quickCapture} onEnergy={setEnergy} onMove={moveTodo} onToggle={(item) => toggleRecord("todos", item)} onBuild={buildDailyRoute} onFocus={() => switchSection("focus")} />}
        {active === "focus" && <FocusPanel todos={todoItems} sessions={focusItems} onComplete={logFocus} />}
        {active === "insights" && <InsightsPanel state={state} weekKeys={weekKeys} monthlyBudget={monthlyBudget} monthExpense={monthExpense} onBudget={(value) => setState((current) => ({ ...current, settings: { ...current.settings, monthlyBudget: value } }))} />}
        {active === "news" && <NewsPanel news={news} status={newsStatus} updated={newsUpdated} onRefresh={refreshNews} />}
        {active === "garden" && <GardenPanel xp={state.xp} coins={state.coins} water={state.waterPoints} stage={plantStage} />}
        {active === "profile" && <ProfilePanel level={level} xp={state.xp} metrics={profileMetrics} tone={state.settings.agentTone} />}
        {active === "settings" && (
          <SettingsPanel state={state} setState={setState} installTip={installTip} onInstall={installApp} onExport={exportData} onImport={importData} onClear={() => {
            if (window.confirm("清空当前设备上的全部记录？此操作无法撤销。")) { localStorage.removeItem(storageKey); setState(initialState); setInstallTip("数据已恢复为初始状态。"); }
          }} />
        )}
        {active === "gallery" && <GalleryPanel items={safeRecords(state, "gallery")} onUpload={addGalleryImage} onDelete={(item) => removeRecord("gallery", item)} />}
        {!(["home", "command", "focus", "insights", "news", "garden", "profile", "settings", "gallery"] as SectionId[]).includes(active) && (
          <ModulePanel section={activeMeta} items={safeRecords(state, active)} form={form} setForm={setForm} onAdd={addRecord} onToggle={(item) => toggleRecord(active, item)} onEdit={(item) => setEditing({ section: active, item: { ...item } })} onDelete={(item) => removeRecord(active, item)} />
        )}
      </main>

      <nav className="mobile-tabbar" aria-label="手机快捷导航">
        {[
          { id: "home" as SectionId, mark: "⌂", label: "首页" },
          { id: "todos" as SectionId, mark: "✓", label: "待办" },
          { id: "command" as SectionId, mark: "◉", label: "航线" },
          { id: "focus" as SectionId, mark: "▰", label: "专注" },
          { id: "profile" as SectionId, mark: "◈", label: "我的" },
        ].map((item) => (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => switchSection(item.id)}>
            <span>{item.mark}</span><small>{item.label}</small>
          </button>
        ))}
      </nav>

      <button className="agent-launch" onClick={() => setAgentOpen(!agentOpen)} aria-label="打开小一 Agent"><span className="agent-avatar">一</span><span>小一</span><i /></button>
      {agentOpen && (
        <section className="agent-panel pixel-frame" aria-label="小一 Agent">
          <header><span className="agent-avatar">一</span><div><strong>小一 Agent</strong><small>在线 · 本地命令模式</small></div><button onClick={() => setAgentOpen(false)} aria-label="关闭 Agent">×</button></header>
          <div className="agent-chat">{agentMessages.slice(-7).map((message, index) => <p key={`${message}-${index}`} className={message.startsWith("你：") ? "user-message" : "agent-message"}>{message}</p>)}</div>
          <div className="quick-commands"><button onClick={() => runAgent("生成今日航线")}>今日航线</button><button onClick={() => runAgent("开始专注")}>开始专注</button><button onClick={() => runAgent("查看周趋势")}>周趋势</button><button onClick={() => runAgent("总结今天")}>总结今天</button></div>
          <form onSubmit={(event) => { event.preventDefault(); runAgent(agentInput); }}><input value={agentInput} onChange={(event) => setAgentInput(event.target.value)} placeholder="输入：打开今日待办…" aria-label="给小一发送消息" /><button type="button" onClick={startVoice} aria-label="语音输入">◉</button><button type="submit">发送</button></form>
        </section>
      )}

      {editing && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditing(null)}>
          <form className="edit-modal pixel-frame" onSubmit={saveEdit} onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-heading"><h3>编辑记录</h3><button type="button" className="text-button" onClick={() => setEditing(null)}>关闭</button></div>
            <label>标题<input value={editing.item.title} onChange={(event) => setEditing({ ...editing, item: { ...editing.item, title: event.target.value } })} required /></label>
            <label>备注<textarea value={editing.item.note || ""} onChange={(event) => setEditing({ ...editing, item: { ...editing.item, note: event.target.value } })} /></label>
            <label>日期<input type="date" value={editing.item.date} onChange={(event) => setEditing({ ...editing, item: { ...editing.item, date: event.target.value } })} /></label>
            {editing.item.value !== undefined && <label>数值<input type="number" step="0.1" value={editing.item.value} onChange={(event) => setEditing({ ...editing, item: { ...editing.item, value: Number(event.target.value) } })} /></label>}
            <button className="pixel-button primary full" type="submit">保存修改</button>
          </form>
        </div>
      )}

      {installGuide && (
        <div className="install-guide-backdrop" role="presentation" onMouseDown={() => setInstallGuide("")}>
          <section className="install-guide pixel-frame" role="dialog" aria-modal="true" aria-labelledby="install-guide-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="install-guide-mark">＋</span>
            <div>
              <span className="mini-label">INSTALL GUIDE</span>
              <h3 id="install-guide-title">安装到手机桌面</h3>
              <p>{installGuide}</p>
            </div>
            <button className="pixel-button primary full" onClick={() => setInstallGuide("")}>我知道了</button>
          </section>
        </div>
      )}
    </div>
  );
}

function CommandPanel({ todos, energy, note, capture, captureType, setCapture, setCaptureType, onCapture, onEnergy, onMove, onToggle, onBuild, onFocus }: {
  todos: RecordItem[]; energy: number; note: string; capture: string; captureType: "todos" | "ideas" | "calendar";
  setCapture: (value: string) => void; setCaptureType: (value: "todos" | "ideas" | "calendar") => void;
  onCapture: (event: FormEvent) => void; onEnergy: (value: number) => void; onMove: (item: RecordItem, direction: -1 | 1) => void;
  onToggle: (item: RecordItem) => void; onBuild: () => void; onFocus: () => void;
}) {
  const openTodos = todos.filter((item) => !item.done);
  const energyLabels = ["很低", "偏低", "平稳", "不错", "充足"];
  return <div className="command-grid fade-in">
    <section className="route-card pixel-frame">
      <div className="panel-heading"><div><span className="mini-label">ONE THING FIRST</span><h3>今日任务航线</h3></div><button className="pixel-button ghost" onClick={onBuild}>智能排路</button></div>
      <div className="route-note"><span className="agent-avatar tiny">一</span><p>{note}</p></div>
      <div className="route-rail">
        {openTodos.slice(0, 5).map((item, index) => <article className={index === 0 ? "current" : ""} key={item.id}>
          <span className="route-node">{index + 1}</span>
          <button className="route-copy" onClick={() => onToggle(item)}><strong>{item.title}</strong><small>{index === 0 ? "当前第一件事 · 点击完成" : item.note || formatDate(item.date)}</small></button>
          <div className="route-order"><button onClick={() => onMove(item, -1)} disabled={index === 0} aria-label={"上移 " + item.title}>↑</button><button onClick={() => onMove(item, 1)} disabled={index === openTodos.length - 1} aria-label={"下移 " + item.title}>↓</button></div>
        </article>)}
        {!openTodos.length && <EmptyState text="今天的航线已经走完" action="保持空白也很好" onClick={onBuild} />}
      </div>
      <button className="pixel-button primary full" onClick={onFocus} disabled={!openTodos.length}>带着第一件事进入专注舱 →</button>
    </section>

    <div className="command-side">
      <form className="capture-card pixel-frame" onSubmit={onCapture}>
        <span className="mini-label">UNIVERSAL INBOX</span><h3>快速收集箱</h3><p>先把念头放下，不在脑内排队。</p>
        <div className="capture-types">{[
          ["todos", "待办"], ["ideas", "灵感"], ["calendar", "日程"],
        ].map(([value, label]) => <button type="button" className={captureType === value ? "active" : ""} onClick={() => setCaptureType(value as "todos" | "ideas" | "calendar")} key={value}>{label}</button>)}</div>
        <div className="capture-input"><input value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="现在想到什么？" aria-label="快速收集内容" /><button className="pixel-button primary" type="submit">收好</button></div>
      </form>
      <section className="energy-card pixel-frame">
        <span className="mini-label">ENERGY CHECK-IN</span><h3>今天有多少电？</h3><p>路线会尊重你的状态，不把低能量误判成不努力。</p>
        <div className="energy-scale">{[1, 2, 3, 4, 5].map((value) => <button className={energy === value ? "active" : ""} onClick={() => onEnergy(value)} key={value}><span>{value}</span><small>{energyLabels[value - 1]}</small></button>)}</div>
      </section>
    </div>
  </div>;
}

function FocusPanel({ todos, sessions, onComplete }: { todos: RecordItem[]; sessions: RecordItem[]; onComplete: (minutes: number, taskTitle: string) => void }) {
  const available = todos.filter((item) => !item.done);
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState(available[0]?.id || "");
  const [message, setMessage] = useState("选一件事，只做这一件。完成后休息 5 分钟。");
  const completionLock = useRef(false);
  const taskTitle = todos.find((item) => item.id === selectedId)?.title || "自由专注";

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running || remaining !== 0 || completionLock.current) return;
    completionLock.current = true;
    setRunning(false);
    onComplete(minutes, taskTitle);
    setMessage("本轮完成，已记录专注时间并发放 XP。现在起身、喝水、看远处 5 分钟。");
  }, [remaining, running, minutes, taskTitle, onComplete]);

  function choosePreset(value: number) {
    setMinutes(value); setRemaining(value * 60); setRunning(false); completionLock.current = false;
    setMessage(value === 15 ? "低阻力启动：只承诺 15 分钟。" : value === 45 ? "深潜模式：中途不切换任务。" : "标准时间盒：专注 25 分钟，休息 5 分钟。");
  }

  function finishNow() {
    if (remaining === minutes * 60) return;
    const spent = Math.max(1, Math.round((minutes * 60 - remaining) / 60));
    setRunning(false); completionLock.current = true; onComplete(spent, taskTitle);
    setMessage("已按实际时长记录本轮专注。短时间也算有效推进。");
  }

  const clock = String(Math.floor(remaining / 60)).padStart(2, "0") + ":" + String(remaining % 60).padStart(2, "0");
  const progress = 100 - remaining / (minutes * 60) * 100;
  const weekTotal = sessions.filter((item) => Array.from({ length: 7 }, (_, index) => dayKey(index - 6)).includes(item.date)).reduce((sum, item) => sum + (item.value || 0), 0);
  return <div className="focus-grid fade-in">
    <section className="focus-console pixel-frame">
      <div className="focus-top"><span className="mini-label">DEEP WORK CABIN</span><span className={running ? "focus-live active" : "focus-live"}>{running ? "专注中" : "待机"}</span></div>
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} aria-label="选择专注任务"><option value="">自由专注</option>{available.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select>
      <div className="timer-ring" style={{ "--focus-progress": progress + "%" } as React.CSSProperties}><strong>{clock}</strong><small>{taskTitle}</small></div>
      <div className="preset-row">{[15, 25, 45].map((value) => <button className={minutes === value ? "active" : ""} onClick={() => choosePreset(value)} key={value}>{value}<small>分钟</small></button>)}</div>
      <div className="focus-actions"><button className="pixel-button primary" onClick={() => { completionLock.current = false; setRunning(!running); }}>{running ? "暂停" : remaining < minutes * 60 ? "继续" : "开始专注"}</button><button className="pixel-button ghost" onClick={() => { setRunning(false); setRemaining(minutes * 60); completionLock.current = false; }}>重置</button><button className="text-button" onClick={finishNow}>提前完成并记录</button></div>
      <p className="focus-message">{message}</p>
    </section>
    <aside className="focus-history pixel-frame">
      <div className="panel-heading"><div><span className="mini-label">TIME LEDGER</span><h3>专注账本</h3></div><span className="count-badge">{weekTotal} 分钟 / 周</span></div>
      <div className="focus-bars">{Array.from({ length: 7 }, (_, index) => {
        const key = dayKey(index - 6); const value = sessions.filter((item) => item.date === key).reduce((sum, item) => sum + (item.value || 0), 0);
        return <div key={key}><i><b style={{ height: Math.min(100, value / 60 * 100) + "%" }} /></i><small>{new Intl.DateTimeFormat("zh-CN", { weekday: "narrow" }).format(new Date(key + "T08:00:00"))}</small><em>{value}</em></div>;
      })}</div>
      <div className="session-list">{sessions.slice(0, 5).map((item) => <div key={item.id}><span>▰</span><p><strong>{item.title}</strong><small>{formatDate(item.date)}</small></p><b>{item.value}m</b></div>)}{!sessions.length && <p className="empty-copy">完成第一轮后，这里会出现你的专注记录。</p>}</div>
    </aside>
  </div>;
}

function InsightsPanel({ state, weekKeys, monthlyBudget, monthExpense, onBudget }: { state: AppState; weekKeys: string[]; monthlyBudget: number; monthExpense: number; onBudget: (value: number) => void }) {
  const todos = safeRecords(state, "todos");
  const habits = safeRecords(state, "habits");
  const sessions = safeRecords(state, "focus");
  const energy = safeRecords(state, "energy");
  const taskRate = todos.length ? Math.round(todos.filter((item) => item.done).length / todos.length * 100) : 0;
  const habitChecks = habits.reduce((sum, item) => sum + (item.checkins || []).filter((key) => weekKeys.includes(key)).length, 0);
  const habitPossible = Math.max(1, habits.length * 7);
  const habitRate = Math.round(habitChecks / habitPossible * 100);
  const focusTotal = sessions.filter((item) => weekKeys.includes(item.date)).reduce((sum, item) => sum + (item.value || 0), 0);
  const energyValues = energy.filter((item) => weekKeys.includes(item.date) && item.value).map((item) => item.value || 0);
  const energyAverage = energyValues.length ? energyValues.reduce((sum, value) => sum + value, 0) / energyValues.length : 0;
  const budgetRate = Math.round(monthExpense / Math.max(1, monthlyBudget) * 100);
  const bestDay = weekKeys.map((key) => ({
    key,
    score: todos.filter((item) => item.date === key && item.done).length * 12 + habits.reduce((sum, item) => sum + ((item.checkins || []).includes(key) ? 8 : 0), 0) + sessions.filter((item) => item.date === key).reduce((sum, item) => sum + (item.value || 0), 0),
  })).sort((a, b) => b.score - a.score)[0];
  const insight = focusTotal === 0 ? "本周还没有专注记录。先完成一轮 15 分钟，趋势就会开始形成。" : energyAverage > 0 && energyAverage < 2.5 ? "你的能量偏低，但仍有行动记录。下周减少同时进行的任务，保留恢复时间。" : habitRate >= 60 ? "习惯是目前最稳定的增长引擎。把最重要的目标绑在已经稳定的习惯之后。" : "本周节奏还在形成。先固定一个每天都容易做到的锚点，比增加更多目标有效。";
  return <div className="insights-stack fade-in">
    <section className="insight-hero pixel-frame"><div><span className="mini-label">WEEKLY SIGNAL</span><h2>不是给生活打分，<br />而是找到有效节奏。</h2><p>{insight}</p></div><div className="pulse-orbit"><span>{Math.round((taskRate + habitRate + Math.min(100, focusTotal / 2)) / 3)}</span><small>本周脉冲</small></div></section>
    <section className="signal-grid">
      <div className="signal-card pixel-frame"><span>✓</span><small>任务完成</small><strong>{taskRate}%</strong><i><b style={{ width: taskRate + "%" }} /></i></div>
      <div className="signal-card pixel-frame"><span>◆</span><small>习惯稳定</small><strong>{habitRate}%</strong><i><b style={{ width: habitRate + "%" }} /></i></div>
      <div className="signal-card pixel-frame"><span>▰</span><small>专注时间</small><strong>{focusTotal}m</strong><i><b style={{ width: Math.min(100, focusTotal / 2) + "%" }} /></i></div>
      <div className="signal-card pixel-frame"><span>◉</span><small>平均能量</small><strong>{energyAverage ? energyAverage.toFixed(1) : "—"}</strong><i><b style={{ width: energyAverage / 5 * 100 + "%" }} /></i></div>
    </section>
    <section className="insight-grid">
      <div className="habit-lab pixel-frame"><div className="panel-heading"><div><span className="mini-label">RESILIENT STREAKS</span><h3>习惯强度</h3></div><span className="count-badge">断一天不归零</span></div>
        {habits.map((habit) => {
          const checks = habit.checkins || []; const age = Math.max(1, Math.min(28, Math.floor((new Date(weekKeys[6] + "T08:00:00").getTime() - new Date(habit.createdAt).getTime()) / 86400000) + 1));
          const strength = Math.min(100, Math.round(28 + Math.min(age, checks.length) / age * 72));
          return <div className="habit-strength" key={habit.id}><div><strong>{habit.title}</strong><small>强度 {strength}</small></div><div className="heat-row">{weekKeys.map((key) => <i className={checks.includes(key) ? "checked" : ""} title={key} key={key} />)}</div><span><b style={{ width: strength + "%" }} /></span></div>;
        })}
        {!habits.length && <p className="empty-copy">添加习惯后，这里会显示不会因偶尔漏签而归零的强度。</p>}
      </div>
      <div className="budget-envelope pixel-frame"><div className="panel-heading"><div><span className="mini-label">BUDGET ENVELOPE</span><h3>本月预算信封</h3></div><span className={budgetRate > 100 ? "count-badge warning" : "count-badge"}>{budgetRate}%</span></div>
        <div className="envelope-visual"><span style={{ height: Math.min(100, budgetRate) + "%" }} /><strong>¥{monthExpense.toFixed(0)}</strong><small>已使用 / ¥{monthlyBudget.toFixed(0)}</small></div>
        <label>调整月预算<input type="number" min="1" step="100" value={monthlyBudget} onChange={(event) => onBudget(Math.max(1, Number(event.target.value)))} /></label>
        <p>{budgetRate > 100 ? "预算已超出，先检查较大的支出，不需要责备自己。" : "信封还剩 ¥" + Math.max(0, monthlyBudget - monthExpense).toFixed(0) + "。每一笔钱先有去处，再决定是否花出。"}</p>
      </div>
    </section>
    <section className="weekly-timeline pixel-frame"><div className="panel-heading"><div><span className="mini-label">SEVEN DAY RHYTHM</span><h3>七天节奏</h3></div><span className="count-badge">高点：{bestDay?.score ? formatDate(bestDay.key) : "等待数据"}</span></div>
      <div className="timeline-days">{weekKeys.map((key) => {
        const done = todos.filter((item) => item.date === key && item.done).length; const checked = habits.filter((item) => (item.checkins || []).includes(key)).length; const mins = sessions.filter((item) => item.date === key).reduce((sum, item) => sum + (item.value || 0), 0);
        return <div key={key}><strong>{new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(new Date(key + "T08:00:00"))}</strong><span style={{ height: Math.max(8, Math.min(100, done * 18 + checked * 14 + mins / 2)) + "%" }} /><small>{done}事 · {checked}习 · {mins}m</small></div>;
      })}</div>
    </section>
  </div>;
}

function StatCard({ mark, label, value, note, progress, onClick }: { mark: string; label: string; value: string; note: string; progress: number; onClick: () => void }) {
  return <button className="stat-card pixel-frame" onClick={onClick}><span className="stat-mark">{mark}</span><span className="stat-copy"><small>{label}</small><strong>{value}</strong><em>{note}</em><i><b style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></i></span></button>;
}

function EmptyState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span>＋</span><p>{text}</p><button className="text-button" onClick={onClick}>{action}</button></div>;
}

function ModulePanel({ section, items, form, setForm, onAdd, onToggle, onEdit, onDelete }: {
  section: (typeof sections)[number]; items: RecordItem[]; form: { title: string; note: string; value: string; date: string; type: "income" | "expense" };
  setForm: (value: typeof form) => void; onAdd: (event: FormEvent) => void; onToggle: (item: RecordItem) => void; onEdit: (item: RecordItem) => void; onDelete: (item: RecordItem) => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const isFinance = section.id === "finance";
  const isHabit = section.id === "habits";
  const completed = items.filter((item) => isHabit ? item.checkins?.includes(today()) : item.done).length;
  const total = isFinance ? items.reduce((sum, item) => sum + (item.type === "income" ? item.value || 0 : -(item.value || 0)), 0) : completed;
  return <div className="module-layout fade-in">
    <section className="module-summary pixel-frame">
      <div><span className="module-glyph">{section.mark}</span><span><small>{section.label}</small><strong>{isFinance ? `¥${total.toFixed(2)}` : `${completed}/${items.length}`}</strong><em>{isFinance ? "当前记录余额" : "完成进度"}</em></span></div>
      <div className="mini-progress"><i style={{ width: `${items.length ? completed / items.length * 100 : 0}%` }} /></div>
    </section>
    <button className="mobile-add-toggle pixel-button primary" onClick={() => setComposerOpen(!composerOpen)} aria-expanded={composerOpen}>
      {composerOpen ? "收起新增表单" : `＋ 新增${section.label.replace("记录", "")}`}
    </button>
    <form className={`quick-add pixel-frame ${composerOpen ? "mobile-open" : ""}`} onSubmit={(event) => { onAdd(event); setComposerOpen(false); }}>
      <div className="form-title"><span>＋</span><div><strong>新增{section.label.replace("记录", "")}</strong><small>保存后会立即写入当前设备</small></div></div>
      <label>标题<input data-testid="add-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={`输入${section.label}内容`} required /></label>
      <label>备注<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="可选：补充说明" /></label>
      {section.valueLabel && <label>{section.valueLabel}<input type="number" step="0.1" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0" required /></label>}
      {isFinance && <label>类型<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as "income" | "expense" })}><option value="expense">支出</option><option value="income">收入</option></select></label>}
      <label>日期<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
      <button className="pixel-button primary" data-testid="add-submit" type="submit">保存记录</button>
    </form>
    <section className="record-panel pixel-frame">
      <div className="panel-heading"><div><span className="mini-label">YOUR RECORDS</span><h3>全部记录</h3></div><span className="count-badge">{items.length} 条</span></div>
      <div className="record-list">
        {items.map((item) => {
          const done = isHabit ? item.checkins?.includes(today()) : item.done;
          return <article className={`record-row ${done ? "done" : ""}`} key={item.id} data-testid={`record-${item.id}`}>
            <button className="record-check" onClick={() => onToggle(item)} aria-label={done ? `取消完成 ${item.title}` : `完成 ${item.title}`}>{done ? "✓" : ""}</button>
            <div className="record-copy"><strong>{item.title}</strong><p>{item.note || "暂无备注"}</p><small>{formatDate(item.date)}{isHabit ? ` · 累计 ${item.checkins?.length || 0} 天` : ""}</small></div>
            {item.value !== undefined && <span className={`record-value ${item.type || ""}`}>{isFinance ? (item.type === "income" ? "+" : "−") + `¥${item.value}` : `${item.value} ${section.valueLabel?.replace(/[^a-zA-Z%\u4e00-\u9fa5]/g, "") || ""}`}</span>}
            <div className="row-actions"><button onClick={() => onEdit(item)}>编辑</button><button className="danger" onClick={() => onDelete(item)}>删除</button></div>
          </article>;
        })}
        {!items.length && <div className="empty-state tall"><span>{section.mark}</span><p>这里还没有记录</p><small>从上方添加第一条内容吧</small></div>}
      </div>
    </section>
  </div>;
}

function NewsPanel({ news, status, updated, onRefresh }: { news: NewsItem[]; status: string; updated: string; onRefresh: () => void }) {
  return <div className="page-stack fade-in"><section className="news-lead pixel-frame"><div><span className={`live-dot ${status === "实时内容" ? "live" : ""}`} />{status}</div><h2>每天花 5 分钟，看看 AI 世界发生了什么。</h2><p>实时数据读取失败时会明确标记备用内容，不会把示例伪装成新闻。</p><button className="pixel-button primary" onClick={onRefresh}>刷新最新新闻</button><small>最后更新：{updated}</small></section><section className="news-grid">{news.map((item, index) => <a className="news-card pixel-frame" href={item.url} target="_blank" rel="noreferrer" key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><h3>{item.title}</h3><p>{item.source}</p><small>{item.time}</small><em>阅读原文 →</em></a>)}</section></div>;
}

function GardenPanel({ xp, coins, water, stage }: { xp: number; coins: number; water: number; stage: number }) {
  const rewards = [{ at: 100, name: "木质书桌" }, { at: 200, name: "星狐围巾" }, { at: 350, name: "海边主题" }, { at: 500, name: "小镇阁楼" }];
  return <div className="page-stack fade-in"><section className="garden-hero pixel-frame"><div className={`big-plant stage-${stage}`}><span className="pot" /><span className="trunk" /><span className="crown one" /><span className="crown two" /><span className="bloom" /></div><div><span className="mini-label">GROW WITH EVERY STEP</span><h2>{plantStageNames[stage]}阶段</h2><p>你完成的每项任务都会为植物浇水，并让小镇慢慢解锁新区域。</p><div className="reward-numbers"><span><strong>{xp}</strong> XP</span><span><strong>{coins}</strong> 小镇币</span><span><strong>{water}</strong> 次浇水</span></div></div></section><section className="panel pixel-frame"><div className="panel-heading"><div><span className="mini-label">FIXED REWARDS</span><h3>成长奖励路线</h3></div></div><div className="reward-road">{rewards.map((reward) => <div className={xp >= reward.at ? "unlocked" : ""} key={reward.at}><span>{xp >= reward.at ? "✓" : "◇"}</span><strong>{reward.name}</strong><small>{reward.at} XP</small></div>)}</div></section></div>;
}

function ProfilePanel({ level, xp, metrics, tone }: { level: number; xp: number; metrics: number[]; tone: string }) {
  const labels = ["健康", "学习", "效率", "财务", "平衡"];
  const polygon = metrics.map((value, index) => {
    const angle = (-90 + index * 72) * Math.PI / 180; const radius = value / 2;
    return `${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`;
  }).join(",");
  return <div className="profile-grid fade-in"><section className="identity-card pixel-frame"><div className="character-stage"><div className="orbit"><i /><i /><i /></div><div className="pixel-person"><span className="hair" /><span className="head">•‿•</span><span className="body" /><span className="arm left" /><span className="arm right" /><span className="leg left" /><span className="leg right" /></div><div className="platform" /></div><span className="mini-label">THE ONE · PLAYER PROFILE</span><h2>The One</h2><p>温和的长期主义者，正在把生活经营成一座会生长的小镇。</p><div className="level-line"><strong>Lv.{level}</strong><i><b style={{ width: `${xp % 100}%` }} /></i><span>{xp % 100}/100 XP</span></div></section><section className="radar-card pixel-frame"><div className="panel-heading"><div><span className="mini-label">FIVE DIMENSIONS</span><h3>五维成长画像</h3></div><span className="count-badge">动态生成</span></div><div className="radar-wrap"><div className="radar-grid"><i /><i /><i /><i /><i /><b style={{ clipPath: `polygon(${polygon})` }} /></div><div className="metric-list">{metrics.map((value, index) => <div key={labels[index]}><span>{labels[index]}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}</strong></div>)}</div></div><p className="profile-note">画像只根据你在本设备保存的记录计算。数据越完整，趋势越有参考价值；它不是医疗或财务诊断。</p></section><section className="panel pixel-frame growth-log"><div className="panel-heading"><h3>当前角色特质</h3></div><div className="trait-grid"><span>持续行动<small>任务完成驱动</small></span><span>温柔自律<small>习惯而非压力</small></span><span>好奇学习<small>记录与复盘</small></span><span>小一陪伴<small>{tone === "warm" ? "温柔模式" : tone === "pro" ? "专业模式" : "活泼模式"}</small></span></div></section></div>;
}

function GalleryPanel({ items, onUpload, onDelete }: { items: RecordItem[]; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onDelete: (item: RecordItem) => void }) {
  return <div className="page-stack fade-in"><section className="upload-card pixel-frame"><div><span className="module-glyph">▧</span><h2>私人图片留在当前设备</h2><p>图片会在浏览器中压缩后保存，不会主动上传到公开图床或第三方生成服务。</p></div><label className="pixel-button primary upload-button">选择图片<input type="file" accept="image/*" onChange={onUpload} /></label></section><section className="gallery-grid">{items.map((item) => <figure className="gallery-item pixel-frame" key={item.id}><img src={item.note} alt={item.title} /><figcaption><span>{item.title}</span><button onClick={() => onDelete(item)}>删除</button></figcaption></figure>)}{!items.length && <div className="empty-state tall pixel-frame"><span>▧</span><p>还没有添加图片</p><small>你可以以后再放入头像、宠物、植物或旅行照片</small></div>}</section></div>;
}

function SettingsPanel({ state, setState, installTip, onInstall, onExport, onImport, onClear }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; installTip: string; onInstall: (platform: "android" | "ios" | "harmony") => void; onExport: () => void; onImport: (event: ChangeEvent<HTMLInputElement>) => void; onClear: () => void;
}) {
  return <div className="settings-grid fade-in"><section className="panel pixel-frame settings-card"><div className="panel-heading"><div><span className="mini-label">APPEARANCE</span><h3>主题与体验</h3></div></div><div className="theme-grid">{themeOptions.map((theme) => <button className={state.settings.theme === theme.id ? "selected" : ""} onClick={() => setState((current) => ({ ...current, settings: { ...current.settings, theme: theme.id } }))} key={theme.id}><i className={`theme-swatch ${theme.id}`} /><strong>{theme.name}</strong><small>{theme.desc}</small></button>)}</div><label className="switch-row"><span><strong>减少动态效果</strong><small>降低弹跳、上浮和装饰动画</small></span><input type="checkbox" checked={state.settings.reducedMotion} onChange={(event) => setState((current) => ({ ...current, settings: { ...current.settings, reducedMotion: event.target.checked } }))} /></label><label className="select-row"><span><strong>小一说话方式</strong><small>随时切换，不影响记录</small></span><select value={state.settings.agentTone} onChange={(event) => setState((current) => ({ ...current, settings: { ...current.settings, agentTone: event.target.value as AppState["settings"]["agentTone"] } }))}><option value="warm">温柔陪伴</option><option value="pro">专业简洁</option><option value="fun">幽默活泼</option></select></label></section><section className="panel pixel-frame install-card"><div className="panel-heading"><div><span className="mini-label">INSTALL CENTER</span><h3>安装到手机</h3></div><span className="count-badge">PWA</span></div><p>同一个网址支持三种手机系统。安装后可从桌面图标打开，并支持基础离线界面。</p><div className="platform-grid"><button onClick={() => onInstall("android")}><span>AND</span><strong>Android</strong><small>安装应用 / 添加到主屏幕</small></button><button onClick={() => onInstall("ios")}><span>iOS</span><strong>iPhone</strong><small>Safari 分享 → 添加到主屏幕</small></button><button onClick={() => onInstall("harmony")}><span>HM</span><strong>HarmonyOS</strong><small>华为浏览器 → 添加至桌面</small></button></div>{installTip && <div className="install-tip">{installTip}</div>}<p className="fine-print">说明：这里交付的是可安装网页应用。若要提交华为应用市场成为原生 HAP，还需要开发者证书、签名与应用市场审核。</p></section><section className="panel pixel-frame data-card"><div className="panel-heading"><div><span className="mini-label">YOUR DATA</span><h3>数据管理</h3></div></div><p>记录默认仅保存在当前浏览器。换手机、清理浏览器数据或卸载后可能丢失，建议定期导出备份。</p><div className="data-actions"><button className="pixel-button" onClick={onExport}>导出备份</button><label className="pixel-button ghost upload-button">导入备份<input type="file" accept="application/json" onChange={onImport} /></label><button className="text-button danger" onClick={onClear}>清空全部数据</button></div></section></div>;
}
