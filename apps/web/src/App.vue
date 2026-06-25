<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { History, ImagePlus, Palette, Settings2, SlidersHorizontal, Sparkles, X } from "lucide-vue-next";
import {
  createPayment,
  devLogin,
  getBeadTask,
  getConfig,
  getCustomerInfo,
  getHistory,
  getAppVersion,
  getVipPackages,
  mockNotify,
  uploadBeadTask
} from "./api";
import type { AppConfig, BeadTask, CustomerInfo, HistoryItem, VipPackage } from "./types";

const config = ref<AppConfig | null>(null);
const customer = ref<CustomerInfo>({ regularCount: 0, memberCount: 0 });
const packages = ref<VipPackage[]>([]);
const history = ref<HistoryItem[]>([]);
const file = ref<File | null>(null);
const previewUrl = ref("");
const selectedBrand = ref("MARD");
const isAI = ref(false);
const isReversal = ref(false);
const imageStyle = ref("卡通");
const aiStyle = ref<"remove-background" | "cartoonize" | "remove-background-cartoonize">("remove-background-cartoonize");
const boardSize = ref("78x78");
const colorLimit = ref<number | "auto">(16);
const boardOptions = [
  { label: "52 x 52", value: "52x52" },
  { label: "52 x 104", value: "52x104" },
  { label: "104 x 52", value: "104x52" },
  { label: "78 x 78", value: "78x78" },
  { label: "78 x 156", value: "78x156" },
  { label: "156 x 78", value: "156x78" },
  { label: "104 x 104", value: "104x104" },
  { label: "104 x 208", value: "104x208" },
  { label: "208 x 104", value: "208x104" }
];
const currentTask = ref<BeadTask | null>(null);
const activeTab = ref<"original" | "result" | "preview">("preview");
const loading = ref(false);
const loadingText = ref("一键生成图纸");
const showRecharge = ref(false);
const showHistory = ref(false);
const toast = ref("");
const maxUploadBytes = 10 * 1024 * 1024;
const aiStyles = [
  { label: "去背景", value: "remove-background" },
  { label: "卡通化", value: "cartoonize" },
  { label: "去背景+卡通", value: "remove-background-cartoonize" }
] as const;

const currentImage = computed(() => currentTask.value?.[activeTab.value] ?? "");
const normalPackages = computed(() => packages.value.filter((item) => item.type === "normal"));
const colorOptions = computed(() => (config.value?.colorLimit.list ?? []) as Array<{ label: string; value: number | "auto" }>);
const aiPackages = computed(() => packages.value.filter((item) => item.type === "ai"));
const taskSummary = computed(() => {
  if (!currentTask.value?.width || !currentTask.value?.height) return "";
  const colorText = currentTask.value.selectedColorCount ? ` | ${currentTask.value.selectedColorCount} 色` : "";
  return `${currentTask.value.width} x ${currentTask.value.height}${colorText} | 共 ${currentTask.value.totalBeads ?? 0} 颗豆子`;
});
const generateButtonText = computed(() => loading.value ? loadingText.value : isAI.value ? "AI 优化并生成" : "一键生成图纸");

function countText(value: number) {
  return value === -1 ? "无限" : String(value);
}

function showToast(message: string) {
  toast.value = message;
  window.setTimeout(() => {
    toast.value = "";
  }, 1800);
}

async function refresh() {
  const [info, logs] = await Promise.all([getCustomerInfo(), getHistory()]);
  customer.value = info;
  history.value = logs;
}

async function checkAppVersion() {
  try {
    const { version } = await getAppVersion();
    const key = "bead_app_version";
    const previous = localStorage.getItem(key);
    if (previous && previous !== version) {
      localStorage.setItem(key, version);
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((cacheKey) => caches.delete(cacheKey)));
      }
      window.location.reload();
      return false;
    }
    localStorage.setItem(key, version);
  } catch {
    return true;
  }
  return true;
}
async function init() {
  if (!(await checkAppVersion())) return;
  await devLogin();
  const [cfg, info, vip, logs] = await Promise.all([getConfig(), getCustomerInfo(), getVipPackages(), getHistory()]);
  config.value = cfg;
  customer.value = info;
  packages.value = vip;
  history.value = logs;
  selectedBrand.value = cfg.brandList[0]?.name ?? "MARD";
  imageStyle.value = cfg.styleList[0]?.name ?? "Cartoon";
  boardSize.value = String(cfg.gridSize.value ?? "78x78");
  colorLimit.value = cfg.colorLimit.value;
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = input.files?.[0];
  if (!selected) return;
  file.value = selected;
  previewUrl.value = URL.createObjectURL(selected);
}

async function compressImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 2400 / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片压缩失败");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.95, 0.92, 0.9, 0.88, 0.86]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) {
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    }
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob) throw new Error("图片压缩失败");
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

async function generate() {
  if (!file.value || !config.value) {
    showToast("请先上传图片");
    return;
  }

  loading.value = true;
  loadingText.value = file.value.size > maxUploadBytes ? "正在压缩图片..." : "正在生成图纸...";
  const form = new FormData();

  try {
    const uploadFile = await compressImage(file.value, config.value.uploadData.maxLength);
    if (uploadFile.size > config.value.uploadData.maxLength) {
      throw new Error("图片压缩后仍超过 10MB，请换一张更小的图片");
    }
    loadingText.value = "正在生成图纸...";
    form.append("file", uploadFile);
    form.append("boardSize", boardSize.value);
    form.append("gridSize", boardSize.value.split("x").reduce((max, item) => Math.max(max, Number(item)), 0).toString());
    form.append("colorLimit", String(colorLimit.value));
    form.append("brand", selectedBrand.value);
    form.append("isAI", String(isAI.value));
    form.append("aiStyle", aiStyle.value);
    form.append("isReversal", String(isReversal.value));
    form.append("tolerance", "0");
    form.append("imageStyle", imageStyle.value);
    form.append("logId", currentTask.value?.id ?? "");
    const created = await uploadBeadTask(form);
    currentTask.value = await getBeadTask(created.msg);
    activeTab.value = "preview";
    await refresh();
    showToast("图纸已生成");
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    showToast(message);
    if (message.includes("次数") || message.includes("余额")) showRecharge.value = true;
  } finally {
    loading.value = false;
    loadingText.value = "一键生成图纸";
  }
}

function openHighRes() {
  if (!currentImage.value) return;
  window.location.href = currentImage.value;
}
async function pay(pkg: VipPackage) {
  const created = await createPayment(pkg.id);
  await mockNotify(created.outTradeNo);
  await refresh();
  showRecharge.value = false;
  showToast("充值成功");
}

async function openHistoryTask(item: HistoryItem) {
  currentTask.value = await getBeadTask(item.id);
  activeTab.value = "preview";
  showHistory.value = false;
}


onMounted(init);
</script>

<template>
  <main class="page">
    <section class="banner">
      <div>
        <strong>拼豆生成器</strong>
        <span>商业版 H5</span>
      </div>
      <button @click="showRecharge = true">充值</button>
    </section>

    <label class="upload-card">
      <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileChange" />
      <div class="upload-art">
        <img v-if="previewUrl" :src="previewUrl" alt="" />
        <ImagePlus v-else :size="58" />
      </div>
      <div>
        <h1>{{ file ? file.name : config?.uploadData.title ?? "点击上传图片" }}</h1>
        <div class="types">
          <span v-for="type in config?.uploadData.typeList ?? ['jpg', 'png', 'jpeg', 'webp']" :key="type">{{ type }}</span>
        </div>
        <p>{{ config?.uploadData.remark ?? "单张图片最大 10MB" }}</p>
      </div>
    </label>

    <section class="card">
      <header><Palette :size="24" /><strong>品牌选择</strong></header>
      <div class="brand-row">
        <button v-for="brand in config?.brandList ?? []" :key="brand.name" :class="{ active: selectedBrand === brand.name }" @click="selectedBrand = brand.name">
          {{ brand.label }}
        </button>
      </div>
    </section>

    <section class="card settings-card">
      <header><Settings2 :size="24" /><strong>基础设置</strong></header>
      <div class="setting-row">
        <span>反色</span>
        <input v-model="isReversal" type="checkbox" />
      </div>
      <div class="setting-row">
        <span>AI 优化</span>
        <input v-model="isAI" type="checkbox" />
      </div>
      <div v-if="isAI" class="ai-style-panel">
        <button
          v-for="style in aiStyles"
          :key="style.value"
          :class="{ active: aiStyle === style.value }"
          @click="aiStyle = style.value"
        >
          {{ style.label }}
        </button>
      </div>

      <hr />
      <header><SlidersHorizontal :size="24" /><strong>细节调整</strong></header>

      <div class="setting-block">
        <span>豆板规格：{{ boardSize.replace("x", " x ") }}</span>
        <div class="option-row board-options">
          <button
            v-for="option in boardOptions"
            :key="option.value"
            :class="{ active: boardSize === option.value }"
            @click="boardSize = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="setting-block">
        <span>颜色数量：{{ colorLimit === "auto" ? "自动" : colorLimit }}</span>
        <div class="option-row">
          <button
            v-for="option in colorOptions"
            :key="String(option.value)"
            :class="{ active: colorLimit === option.value }"
            @click="colorLimit = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <p class="counts">（普通次数：{{ countText(customer.regularCount) }}，<span>AI 次数：{{ countText(customer.memberCount) }}</span>）</p>

    <section class="actions">
      <button class="generate" @click="generate"><Sparkles :size="26" />{{ generateButtonText }}</button>
      <button class="history" @click="showHistory = true"><History :size="24" />历史</button>
    </section>

    <section v-if="currentTask" class="result">
      <div class="tabs">
        <button :class="{ active: activeTab === 'original' }" @click="activeTab = 'original'">原图</button>
        <button :class="{ active: activeTab === 'result' }" @click="activeTab = 'result'">效果</button>
        <button :class="{ active: activeTab === 'preview' }" @click="activeTab = 'preview'">图纸</button>
        <button @click="openHighRes">高清图</button>
      </div>
      <p v-if="taskSummary" class="counts">{{ taskSummary }}</p>
      <img :src="currentImage" alt="生成的拼豆图纸" />
    </section>


    <div v-if="showRecharge" class="modal">
      <section class="sheet">
        <button class="close" @click="showRecharge = false"><X :size="20" /></button>
        <h2>充值</h2>
        <h3>普通次数</h3>
        <button v-for="pkg in normalPackages" :key="pkg.id" class="package" @click="pay(pkg)">
          <span>{{ pkg.count }} 次生成</span><strong>¥{{ (pkg.currentPrice / 100).toFixed(2) }}</strong>
        </button>
        <h3>AI 次数</h3>
        <button v-for="pkg in aiPackages" :key="pkg.id" class="package" @click="pay(pkg)">
          <span>{{ pkg.count }} 次 AI</span><strong>¥{{ (pkg.currentPrice / 100).toFixed(2) }}</strong>
        </button>
      </section>
    </div>

    <aside v-if="showHistory" class="drawer">
      <header><strong>历史记录</strong><button @click="showHistory = false"><X :size="20" /></button></header>
      <button v-for="item in history" :key="item.id" class="history-item" @click="openHistoryTask(item)">
        <img v-if="item.results" :src="item.results" alt="" />
        <span>#{{ item.id.slice(-4) }}<small>{{ item.generateTime }}</small></span>
        <em>{{ item.status }}</em>
      </button>
      <p v-if="history.length === 0" class="empty">暂无记录</p>
    </aside>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>{{ isAI ? "AI 优化需要更久，请稍等" : "普通模式通常很快完成" }}</p>
      <p>生成后图纸会显示在下方</p>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>
  </main>
</template>
















