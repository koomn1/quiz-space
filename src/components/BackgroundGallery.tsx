import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Heart, Search, Sliders, Play, Pause, RefreshCw, X } from 'lucide-react';
import { PremiumBackground, BackgroundSettings } from './PremiumBackground';

interface BackgroundItem {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string; // 'neon' | 'gradient' | 'particles' | 'waves' | 'aurora' | 'space'
  descriptionEn: string;
  descriptionAr: string;
  emoji: string;
}

const BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'cosmic',
    nameEn: 'Cosmic Wave',
    nameAr: 'موجة كوزمية',
    category: 'waves',
    descriptionEn: 'Flowing neon purple wave mesh with glowing particles and smooth depth.',
    descriptionAr: 'شبكة أمواج نيون بنفسجية متدفقة مع جزيئات مضيئة وعمق سلس.',
    emoji: '🌌',
  },
  {
    id: 'aurora',
    nameEn: 'Aurora Glow',
    nameAr: 'توهج الشفق',
    category: 'aurora',
    descriptionEn: 'Animated northern lights with soft colorful ribbons and slow elegant movement.',
    descriptionAr: 'شفق قطبي متحرك بأشرطة ملونة ناعمة وحركة أنيقة هادئة.',
    emoji: '🟢',
  },
  {
    id: 'neon-orbit',
    nameEn: 'Neon Orbit',
    nameAr: 'مدار النيون',
    category: 'neon',
    descriptionEn: 'Minimal futuristic circles with rotating glowing rings and soft pulsing.',
    descriptionAr: 'حلقات نيون مستقبلية دوارة تمنح شعوراً بالجاذبية والعمق الهادئ.',
    emoji: '🪐',
  },
  {
    id: 'ocean-flow',
    nameEn: 'Ocean Flow',
    nameAr: 'تدفق المحيط',
    category: 'waves',
    descriptionEn: 'Modern liquid blue motion with gradient waves and glowing reflections.',
    descriptionAr: 'حركة سائلة زرقاء حديثة للأمواج المتدرجة مع انعكاسات متوهجة.',
    emoji: '🌊',
  },
  {
    id: 'solar-flare',
    nameEn: 'Solar Flare',
    nameAr: 'التوهج الشمسي',
    category: 'gradient',
    descriptionEn: 'Orange premium energy ribbons with fire-like gradients and slow-flowing particles.',
    descriptionAr: 'أشرطة طاقة برتقالية فاخرة بتموجات نارية وجزيئات دافئة بطيئة.',
    emoji: '🔥',
  },
  {
    id: 'galaxy',
    nameEn: 'Deep Galaxy',
    nameAr: 'المجرة العميقة',
    category: 'space',
    descriptionEn: 'Infinite dark space with colorful nebulas, twinkling stars, and shooting stars.',
    descriptionAr: 'فضاء عميق لانهائي مع سديم ملون، نجوم متلألئة، وشهب عابرة.',
    emoji: '⭐',
  },
  {
    id: 'liquid-glass',
    nameEn: 'Liquid Glass',
    nameAr: 'الزجاج السائل',
    category: 'gradient',
    descriptionEn: 'Dynamic glass refraction and reflections with pastel floating highlights.',
    descriptionAr: 'تأثير زجاجي سائل متطور مستوحى من نظام آبل مع انكسارات الضوء.',
    emoji: '💎',
  },
  {
    id: 'mesh-gradient',
    nameEn: 'Mesh Gradient',
    nameAr: 'تدرج شبكي',
    category: 'gradient',
    descriptionEn: 'Dynamic premium morphing gradient blobs with ultra-smooth organic transitions.',
    descriptionAr: 'تدرجات لونية هلامية متغيرة ومتحركة بأسلوب فني ذكي وعصري.',
    emoji: '🎨',
  },
  {
    id: 'abstract-lines',
    nameEn: 'Abstract Lines',
    nameAr: 'خطوط تجريدية',
    category: 'neon',
    descriptionEn: 'Minimalist curved neon paths undulating gracefully in 3D dark space.',
    descriptionAr: 'مسارات نيون منحنية بلمسة تجريدية راقية تتحرك بأناقة في الفراغ.',
    emoji: '〽️',
  },
  {
    id: 'particles',
    nameEn: 'Floating Nodes',
    nameAr: 'الجسيمات المترابطة',
    category: 'particles',
    descriptionEn: 'Interactive particle network connecting nodes dynamically near your cursor.',
    descriptionAr: 'شبكة جسيمات تفاعلية تترابط بخطوط رفيعة وتستجيب لحركة مؤشر الماوس.',
    emoji: '🕸️',
  }
];

interface BackgroundGalleryProps {
  lang: 'ar' | 'en';
  isPremium: boolean;
  currentBg: string;
  onSelectBg: (id: string, customSettings?: BackgroundSettings) => void;
  savedSettings?: BackgroundSettings;
}

export function BackgroundGallery({
  lang = 'en',
  isPremium = true,
  currentBg = 'cosmic',
  onSelectBg,
  savedSettings
}: BackgroundGalleryProps) {
  const isAr = lang === 'ar';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);

  // Background customization state
  const [speed, setSpeed] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(100);
  const [glow, setGlow] = useState<number>(1.0);
  const [density, setDensity] = useState<number>(1.0);
  const [waveHeight, setWaveHeight] = useState<number>(1.0);
  const [theme, setTheme] = useState<'default' | 'warm' | 'cool' | 'neon'>('default');
  const [blur, setBlur] = useState<number>(5);

  // Load saved customizer settings if provided
  useEffect(() => {
    if (savedSettings) {
      setSpeed(savedSettings.speed ?? 1.0);
      setBrightness(savedSettings.brightness ?? 100);
      setGlow(savedSettings.glow ?? 1.0);
      setDensity(savedSettings.density ?? 1.0);
      setWaveHeight(savedSettings.waveHeight ?? 1.0);
      setTheme(savedSettings.theme ?? 'default');
      setBlur(savedSettings.blur ?? 5);
    }
  }, [savedSettings, currentBg]);

  // Load favorites
  useEffect(() => {
    const savedFavs = localStorage.getItem('premium_bg_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
  }, []);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(f => f !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('premium_bg_favorites', JSON.stringify(updated));
  };

  // Categories list
  const categories = [
    { id: 'all', labelEn: 'All Themes', labelAr: 'كل السمات' },
    { id: 'neon', labelEn: 'Neon', labelAr: 'نيون' },
    { id: 'gradient', labelEn: 'Gradient', labelAr: 'تدرج لوني' },
    { id: 'particles', labelEn: 'Particles', labelAr: 'جسيمات' },
    { id: 'waves', labelEn: 'Waves', labelAr: 'أمواج' },
    { id: 'aurora', labelEn: 'Aurora', labelAr: 'شفق قطبي' }
  ];

  // Filter items
  const filteredBgs = BACKGROUNDS.filter(bg => {
    const matchesCategory = selectedCategory === 'all' || bg.category === selectedCategory;
    const matchesSearch = 
      bg.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bg.nameAr.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const handleApply = (id: string) => {
    const currentSettingsObj: BackgroundSettings = {
      speed,
      brightness,
      glow,
      density,
      waveHeight,
      theme,
      blur
    };
    onSelectBg(id, currentSettingsObj);
  };

  const handleResetSettings = () => {
    setSpeed(1.0);
    setBrightness(100);
    setGlow(1.0);
    setDensity(1.0);
    setWaveHeight(1.0);
    setTheme('default');
    setBlur(5);
    
    // Immediately apply reset settings to active background
    onSelectBg(currentBg, {
      speed: 1.0,
      brightness: 100,
      glow: 1.0,
      density: 1.0,
      waveHeight: 1.0,
      theme: 'default',
      blur: 5
    });
  };

  const currentSettingsObj: BackgroundSettings = {
    speed,
    brightness,
    glow,
    density,
    waveHeight,
    theme,
    blur
  };

  return (
    <div className="w-full space-y-8 bg-slate-950/40 p-6 rounded-3xl border border-slate-900 shadow-2xl relative overflow-hidden">
      
      {/* Decorative Blur Header */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-primary/10 blur-3xl pointer-events-none rounded-full" />

      {/* Title block */}
      <div className="text-center relative z-10 space-y-2">
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          {isAr ? 'الخلفيات المتحركة الفاخرة' : 'Animated Backgrounds'}
          <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
        </h2>
        <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto font-medium">
          {isAr 
            ? 'اختر خلفيتك المفضلة وحوّل حسابك الشخصي والمنصة إلى لوحة رقمية تفاعلية مذهلة.' 
            : 'Choose your favorite animated background. It will be applied instantly.'}
        </p>
      </div>

      {/* Controls Segment: Search & Categories */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center relative z-10 border-b border-slate-900 pb-6">
        {/* Category selector */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <button
              
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/40 border border-violet-500/30'
                  : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 border border-slate-850'
              }`}
            >
              {isAr ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Search Input bar */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder={isAr ? 'ابحث عن خلفية...' : 'Search backgrounds...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-850 rounded-full py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Grid of Backgrounds */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredBgs.map((bg) => {
          const isActive = currentBg === bg.id;
          const isFav = favorites.includes(bg.id);
          return (
            <div
              
              onClick={() => handleApply(bg.id)}
              className={`group relative h-64 rounded-3xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.02] flex flex-col justify-end p-5 ${
                isActive
                  ? 'border-violet-500 shadow-2xl shadow-violet-900/30 ring-2 ring-violet-500/20'
                  : 'border-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Premium Background Component Live Preview Card */}
              <PremiumBackground 
                mode={bg.id} 
                settings={isActive ? currentSettingsObj : { speed: 0.6, brightness: 90 }} 
                className="absolute inset-0 z-0 scale-105 group-hover:scale-110 transition-transform duration-700"
              />

              {/* Glass overlay covering the top to maintain text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 z-1" />

              {/* Top card actions (Favorite button + Check indicator) */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
                <button
                  onClick={(e) => toggleFavorite(bg.id, e)}
                  className={`p-2 rounded-full backdrop-blur-md transition-all ${
                    isFav 
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 scale-110' 
                      : 'bg-black/40 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>

                {isActive && (
                  <span className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 flex items-center justify-center text-white border border-violet-400/30 shadow-lg shadow-violet-500/20">
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </div>

              {/* Text Information of the background */}
              <div className="relative z-10 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">{bg.emoji}</span>
                  <h3 className="text-sm font-black text-white">
                    {isAr ? bg.nameAr : bg.nameEn}
                  </h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 animate-pulse font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed line-clamp-2">
                  {isAr ? bg.descriptionAr : bg.descriptionEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced Customizer Segment Button */}
      <div className="flex justify-center pt-2 relative z-10">
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}
          className={`px-6 py-3 rounded-full text-xs font-black tracking-wide flex items-center gap-2 transition-all ${
            showCustomizer
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/35 hover:shadow-indigo-600/50 hover:scale-102 border border-violet-500/20'
          }`}
        >
          <Sliders className="w-4 h-4" />
          {isAr ? 'تخصيص أبعاد الخلفية' : 'Customize Background'}
        </button>
      </div>

      {/* Advanced Customizer Panel Drawer */}
      {showCustomizer && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl relative z-20 animate-fade-in space-y-6">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-violet-400" />
              {isAr ? 'محرك تخصيص الرسوم المتحركة واللمعان' : 'Animation & Glow Physics Customizer'}
            </h3>
            <button 
              onClick={() => setShowCustomizer(false)}
              className="p-1 rounded-full hover:bg-slate-900 text-slate-500 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Speed Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'سرعة الرسوم المتحركة' : 'Animation Speed'}</span>
                <span className="text-violet-400 font-mono">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeed(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, speed: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Brightness Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'مستوى السطوع' : 'Brightness Level'}</span>
                <span className="text-violet-400 font-mono">{brightness}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={brightness}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setBrightness(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, brightness: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Glow Intensity Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'كثافة التوهج النيوني' : 'Glow Intensity'}</span>
                <span className="text-violet-400 font-mono">{glow.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={glow}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setGlow(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, glow: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Particle Density Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'كثافة الجسيمات الطائرة' : 'Particle Density'}</span>
                <span className="text-violet-400 font-mono">{density.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={density}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setDensity(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, density: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Wave Height Range Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'ارتفاع الأمواج والتموج' : 'Wave Amplitude'}</span>
                <span className="text-violet-400 font-mono">{waveHeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={waveHeight}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setWaveHeight(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, waveHeight: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Blur Level Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>{isAr ? 'مستوى التغبيش والضبابية' : 'Backdrop Blur'}</span>
                <span className="text-violet-400 font-mono">{blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={blur}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setBlur(val);
                  onSelectBg(currentBg, { ...currentSettingsObj, blur: val });
                }}
                className="w-full accent-violet-500 h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Custom Theme selection palette */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <span className="text-xs font-bold text-slate-400 block mb-1">{isAr ? 'تدرج الألوان المخصص' : 'Interactive Theme Palette'}</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'default', label: isAr ? 'الافتراضي' : 'Default', colors: ['#7c3aed', '#8b5cf6', '#3b82f6'] },
                  { id: 'warm', label: isAr ? 'دافئ' : 'Solar Fire', colors: ['#f97316', '#ef4444', '#f59e0b'] },
                  { id: 'cool', label: isAr ? 'هادئ بارد' : 'Deep Oceans', colors: ['#06b6d4', '#3b82f6', '#10b981'] },
                  { id: 'neon', label: isAr ? 'نيون مشع' : 'Cyber Neon', colors: ['#ec4899', '#a855f7', '#06b6d4'] }
                ].map((th) => (
                  <button
                    
                    onClick={() => {
                      setTheme(th.id as any);
                      onSelectBg(currentBg, { ...currentSettingsObj, theme: th.id as any });
                    }}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition-all select-none ${
                      theme === th.id
                        ? 'border-violet-500 bg-violet-500/10 text-violet-400 font-black'
                        : 'border-slate-850 hover:bg-slate-900 bg-slate-900/40 text-slate-400'
                    }`}
                  >
                    <span>{th.label}</span>
                    <div className="flex gap-1">
                      {th.colors.map((c, i) => (
                        <span  className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-2 border-t border-slate-900 pt-4">
            <button
              onClick={handleResetSettings}
              className="px-4 py-2 rounded-full text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-850 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isAr ? 'إعادة ضبط المصنع للفيزياء' : 'Reset Physics'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
