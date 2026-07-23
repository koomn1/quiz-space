/**
 * CosmoQuiz Name Generator
 * Generates beautiful, inspiring, and professional Arabic & English temporary student names.
 */

export function generateCoolStudentName(lang: 'ar' | 'en' = 'ar'): string {
  const arNouns = [
    "نابغة", "عبقري", "مفكر", "باحث", "مستكشف", 
    "طموح", "نجم", "مبدع", "ذكي", "متفوق", 
    "قارئ", "كوزموناوت", "رائد", "مهندس", "مبتكر"
  ];
  
  const arAdjectives = [
    "كوزمو", "المستقبل", "الذكي", "المتألق", "النشيط", 
    "الواعد", "المتميز", "المبدع", "الذهبي", "الماسي",
    "المثابر", "العلمي", "العبقري"
  ];
  
  const enNouns = [
    "Scholar", "Genius", "Thinker", "Explorer", "Star", 
    "Pioneer", "Mind", "Creator", "Cosmonaut", "Seeker",
    "Leader", "Innovator"
  ];
  
  const enAdjectives = [
    "Cosmo", "Bright", "Smart", "Shining", "Golden", 
    "Active", "Creative", "Elite", "Future", "Brilliant",
    "Inspired", "Dynamic"
  ];

  const noun = lang === 'ar' 
    ? arNouns[Math.floor(Math.random() * arNouns.length)] 
    : enNouns[Math.floor(Math.random() * enNouns.length)];
    
  const adj = lang === 'ar'
    ? arAdjectives[Math.floor(Math.random() * arAdjectives.length)]
    : enAdjectives[Math.floor(Math.random() * arAdjectives.length)];
    
  const num = Math.floor(100 + Math.random() * 900); // 3-digit random number
  
  return lang === 'ar' ? `${noun} ${adj} #${num}` : `${adj} ${noun} #${num}`;
}
