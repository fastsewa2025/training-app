import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "fastsewa_lang";

const resources = {
  en: {
    translation: {
      // Nav
      learn: "Learn",
      tasks: "My Tasks",
      profile: "Profile",

      // Home
      hello: "Hello, {{name}} 👋",
      yourProgress: "Your Progress",
      coursesEnrolled: "Courses Enrolled",
      modulesCompleted: "Modules Done",
      certificates: "Certificates",
      allCategories: "All Categories",
      continueLearning: "Continue Learning",
      startLearning: "Start a Course",
      noCoursesYet: "No courses yet",
      browseCourses: "Browse Courses",

      // Categories
      safety: "Safety",
      basics: "Basics",
      tools: "Tools",
      discipline: "Discipline",
      electrical: "Electrical",
      plumbing: "Plumbing",
      masonry: "Masonry",
      equipment: "Equipment",

      // Course / Module
      enroll: "Enroll Now",
      enrolled: "Enrolled",
      startModule: "Start Module",
      continueModule: "Continue",
      moduleCompleted: "✅ Completed",
      lessons: "{{count}} lessons",
      duration: "{{min}} min",
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",

      // Lesson
      markComplete: "Mark as Complete",
      next: "Next",
      previous: "Previous",
      lessonComplete: "Lesson Complete!",

      // Quiz
      quizTitle: "Module Quiz",
      question: "Question {{current}} of {{total}}",
      submitQuiz: "Submit Answers",
      quizPassed: "🎉 Passed! Score: {{score}}%",
      quizFailed: "Score: {{score}}%. You need {{passing}}% to pass. Try again!",
      tryAgain: "Try Again",
      viewResults: "View Results",
      correct: "Correct",
      incorrect: "Incorrect",
      explanation: "Explanation",

      // Certificate
      certificateEarned: "🏆 Certificate Earned!",
      downloadPdf: "Download PDF",
      certificateFor: "Certificate for {{course}}",
      earnedOn: "Earned on {{date}}",
      certNo: "Cert #{{number}}",

      // Tasks
      noTasks: "No Tasks Yet",
      noTasksDesc: "Start a training module to add tasks.",
      tasksDone: "{{done}} / {{total}} done",

      // Profile
      editProfile: "Edit Profile",
      language: "Language",
      english: "English",
      hindi: "हिन्दी",
      logout: "Log Out",
      memberSince: "Member since {{date}}",
      noCertificates: "No certificates yet",
      completeCourses: "Complete courses to earn certificates.",

      // Auth
      login: "Log In",
      register: "Register",
      username: "Username",
      password: "Password",
      displayName: "Your Name",
      phone: "Phone Number (optional)",
      loginBtn: "Log In",
      registerBtn: "Create Account",
      alreadyAccount: "Already have an account? Log In",
      noAccount: "No account? Register",
      loginError: "Invalid username or password",
      registerError: "Could not create account",

      // Errors
      somethingWrong: "Something went wrong",
      tryAgainLater: "Please try again later",
      networkError: "Network error. Check your connection.",
    },
  },
  hi: {
    translation: {
      // Nav
      learn: "सीखें",
      tasks: "मेरे काम",
      profile: "प्रोफाइल",

      // Home
      hello: "नमस्ते, {{name}} 👋",
      yourProgress: "आपकी प्रगति",
      coursesEnrolled: "कोर्स में दाखिला",
      modulesCompleted: "मॉड्यूल पूरे",
      certificates: "सर्टिफिकेट",
      allCategories: "सभी श्रेणियाँ",
      continueLearning: "सीखना जारी रखें",
      startLearning: "कोर्स शुरू करें",
      noCoursesYet: "अभी कोई कोर्स नहीं",
      browseCourses: "कोर्स देखें",

      // Categories
      safety: "सुरक्षा",
      basics: "बुनियादी",
      tools: "औजार",
      discipline: "अनुशासन",
      electrical: "बिजली",
      plumbing: "पाइप",
      masonry: "राज मिस्त्री",
      equipment: "उपकरण",

      // Course / Module
      enroll: "दाखिला लें",
      enrolled: "दाखिल",
      startModule: "मॉड्यूल शुरू करें",
      continueModule: "जारी रखें",
      moduleCompleted: "✅ पूरा हुआ",
      lessons: "{{count}} पाठ",
      duration: "{{min}} मिनट",
      beginner: "शुरुआती",
      intermediate: "मध्यम",
      advanced: "उन्नत",

      // Lesson
      markComplete: "पूरा हुआ",
      next: "अगला",
      previous: "पिछला",
      lessonComplete: "पाठ पूरा हुआ!",

      // Quiz
      quizTitle: "मॉड्यूल परीक्षा",
      question: "सवाल {{current}} / {{total}}",
      submitQuiz: "जवाब जमा करें",
      quizPassed: "🎉 पास! अंक: {{score}}%",
      quizFailed: "अंक: {{score}}%। पास के लिए {{passing}}% चाहिए। फिर कोशिश करें!",
      tryAgain: "फिर कोशिश करें",
      viewResults: "नतीजे देखें",
      correct: "सही",
      incorrect: "गलत",
      explanation: "समझाइए",

      // Certificate
      certificateEarned: "🏆 सर्टिफिकेट मिला!",
      downloadPdf: "PDF डाउनलोड करें",
      certificateFor: "{{course}} का सर्टिफिकेट",
      earnedOn: "{{date}} को मिला",
      certNo: "नंबर: {{number}}",

      // Tasks
      noTasks: "अभी कोई काम नहीं",
      noTasksDesc: "ट्रेनिंग मॉड्यूल शुरू करें।",
      tasksDone: "{{done}} / {{total}} पूरे",

      // Profile
      editProfile: "प्रोफाइल बदलें",
      language: "भाषा",
      english: "English",
      hindi: "हिन्दी",
      logout: "लॉग आउट",
      memberSince: "{{date}} से सदस्य",
      noCertificates: "अभी कोई सर्टिफिकेट नहीं",
      completeCourses: "सर्टिफिकेट पाने के लिए कोर्स पूरा करें।",

      // Auth
      login: "लॉग इन",
      register: "रजिस्टर",
      username: "यूज़रनेम",
      password: "पासवर्ड",
      displayName: "आपका नाम",
      phone: "फोन नंबर (वैकल्पिक)",
      loginBtn: "लॉग इन करें",
      registerBtn: "खाता बनाएं",
      alreadyAccount: "पहले से खाता है? लॉग इन करें",
      noAccount: "खाता नहीं है? रजिस्टर करें",
      loginError: "गलत यूज़रनेम या पासवर्ड",
      registerError: "खाता नहीं बन सका",

      // Errors
      somethingWrong: "कुछ गड़बड़ हुई",
      tryAgainLater: "बाद में फिर कोशिश करें",
      networkError: "नेटवर्क त्रुटि। कनेक्शन जांचें।",
    },
  },
};

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const lang = await AsyncStorage.getItem(LANG_KEY);
      callback(lang || "en");
    } catch {
      callback("en");
    }
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    try {
      await AsyncStorage.setItem(LANG_KEY, lang);
    } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });

export default i18n;
