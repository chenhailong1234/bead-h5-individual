export type PaletteColor = {
  name: string;
  hex: string;
};

export type Brand = {
  name: string;
  label: string;
  colors: PaletteColor[];
};

export type SettingOption = {
  label: string;
  value: number;
};

export type SliderSetting = {
  name: string;
  value: number;
  tips: string;
  list: SettingOption[];
};

export type SwitchSetting = {
  name: string;
  value: boolean;
  tips: string;
};

export type AppConfig = {
  uploadData: {
    title: string;
    maxLength: number;
    typeList: string[];
    remark: string;
  };
  brandList: Brand[];
  styleList: Array<{ name: string; icon: string }>;
  isReversal: SwitchSetting;
  isAI: SwitchSetting;
  tolerance: SliderSetting;
  gridSize: SliderSetting;
  colorLimit: SliderSetting;
};

export type CustomerInfo = {
  regularCount: number;
  memberCount: number;
};

export type VipPackage = {
  id: string;
  type: "normal" | "ai";
  title: string;
  remark: string;
  originalPrice: number;
  currentPrice: number;
  count: number;
};

export type BeadTask = {
  id: string;
  status: "running" | "succeeded" | "failed" | "violation";
  original: string;
  result: string;
  preview: string;
  width?: number;
  height?: number;
  totalBeads?: number;
};

export type HistoryItem = {
  id: string;
  status: BeadTask["status"];
  generateTime: string;
  results: string;
  width?: number;
  height?: number;
  totalBeads?: number;
};
