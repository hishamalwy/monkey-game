/**
 * SoundManager.js
 * مدير الأصوات للعبة كلكس - يوفر مزامنة وتحميل مسبق للأصوات.
 */

const SOUNDS_CONFIG = {
  kallaks: '/sounds/kallaks.mp3',
  duck: '/sounds/duck.mp3',
  monkey: '/sounds/monkey.mp3',
  horn: '/sounds/horn.mp3',
};

class SoundManager {
  constructor() {
    this.sounds = {};
    this.isUnlocked = false;
  }

  /**
   * تحميل الأصوات مسبقاً لضمان عدم وجود تأخير (Latency) عند الضغط.
   */
  preload() {
    Object.entries(SOUNDS_CONFIG).forEach(([name, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto'; // إخبار المتصفح بتحميل الملف فوراً
      this.sounds[name] = audio;
    });
  }

  /**
   * حل مشكلة Autoplay policy في المتصفحات.
   * يجب استدعاء هذه الدالة عند أول تفاعل للمستخدم (مثل زر Start).
   */
  unlock() {
    if (this.isUnlocked) return;
    
    // تشغيل وإيقاف صوت صامت لكل كائن لفك قفل المتصفح
    Object.values(this.sounds).forEach(audio => {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {
        // المتصفح سيحظر هذا إذا لم يكن هناك تفاعل، لا بأس سنحاول لاحقاً
      });
    });
    
    this.isUnlocked = true;
    console.log('🔊 Audio Unlocked');
  }

  /**
   * تشغيل الصوت بالاسم.
   */
  play(name) {
    const audio = this.sounds[name];
    if (audio) {
      // إعادة الصوت للبداية في حال كان يعمل (تجنباً للتدافع)
      audio.pause();
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error(`Error playing sound ${name}:`, error);
        });
      }
    } else {
      console.warn(`Sound ${name} not found!`);
    }
  }
}

const instance = new SoundManager();
// البدء في التحميل فور الاستيراد
instance.preload();

export default instance;
