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
      forgotPassword: "Forgot password?",
      resetPasswordTitle: "Reset Password",
      forgotPasswordPrompt: "Enter the email on your account and we'll send you a reset code.",
      email: "Email",
      sendCodeBtn: "Send Reset Code",
      codeSentTitle: "Check your email",
      codeSentMessage: "If that email is registered, a reset code is on its way.",
      resetCode: "Reset Code",
      newPassword: "New Password",
      resetPasswordBtn: "Reset Password",
      resetSuccessTitle: "Password reset",
      resetSuccessMessage: "Your password has been changed. Please log in.",
      invalidCode: "Invalid or expired code",
      backToLogin: "Back to Log In",
      changePassword: "Change Password",
      currentPassword: "Current Password",
      changePasswordBtn: "Change Password",
      changePasswordSuccess: "Password changed. Please log in again.",
      currentPasswordWrong: "Current password is incorrect",

      // Errors
      somethingWrong: "Something went wrong",
      tryAgainLater: "Please try again later",
      networkError: "Network error. Check your connection.",
      offlineShowingSaved: "You're offline — showing saved courses",
      noCachedCourses: "No internet, and nothing saved yet. Connect once to load courses.",
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
      forgotPassword: "पासवर्ड भूल गए?",
      resetPasswordTitle: "पासवर्ड रीसेट करें",
      forgotPasswordPrompt: "अपने खाते की ईमेल डालें, हम आपको रीसेट कोड भेजेंगे।",
      email: "ईमेल",
      sendCodeBtn: "रीसेट कोड भेजें",
      codeSentTitle: "अपनी ईमेल जांचें",
      codeSentMessage: "अगर यह ईमेल रजिस्टर्ड है, तो रीसेट कोड भेजा जा रहा है।",
      resetCode: "रीसेट कोड",
      newPassword: "नया पासवर्ड",
      resetPasswordBtn: "पासवर्ड रीसेट करें",
      resetSuccessTitle: "पासवर्ड रीसेट हो गया",
      resetSuccessMessage: "आपका पासवर्ड बदल दिया गया है। कृपया लॉग इन करें।",
      invalidCode: "गलत या समय-सीमा समाप्त कोड",
      backToLogin: "लॉग इन पर वापस जाएं",
      changePassword: "पासवर्ड बदलें",
      currentPassword: "मौजूदा पासवर्ड",
      changePasswordBtn: "पासवर्ड बदलें",
      changePasswordSuccess: "पासवर्ड बदल दिया गया। कृपया दोबारा लॉग इन करें।",
      currentPasswordWrong: "मौजूदा पासवर्ड गलत है",

      // Errors
      somethingWrong: "कुछ गड़बड़ हुई",
      tryAgainLater: "बाद में फिर कोशिश करें",
      networkError: "नेटवर्क त्रुटि। कनेक्शन जांचें।",
      offlineShowingSaved: "आप ऑफ़लाइन हैं — सेव किए गए कोर्स दिखा रहे हैं",
      noCachedCourses: "इंटरनेट नहीं है, और अभी कुछ सेव नहीं है। कोर्स लोड करने के लिए एक बार कनेक्ट करें।",
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

// i18next's default export is the instance itself; .use() here is its
// documented chainable API, not the package's same-named named export.
/* eslint-disable import/no-named-as-default-member */
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  });
/* eslint-enable import/no-named-as-default-member */

export default i18n;
