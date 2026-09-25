/**
 * FastSewa Training — Database Seed
 * Creates sample admin, trainer, worker, and 4 complete courses with
 * modules, lessons (video + text), and quizzes.
 *
 * Usage: npx tsx scripts/seed.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import {
  users, courses, modules, lessons, quizzes, quizQuestions,
} from "../shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱  Seeding FastSewa database...\n");

  // ── 1. Users ───────────────────────────────────────────────────────────────
  const [admin] = await db.insert(users).values({
    username: "admin",
    passwordHash: await bcrypt.hash("Admin@1234", 12),
    displayName: "Site Admin",
    role: "admin",
    preferredLang: "en",
  }).onConflictDoNothing().returning({ id: users.id });

  await db.insert(users).values({
    username: "trainer1",
    passwordHash: await bcrypt.hash("Trainer@123", 12),
    displayName: "Suresh Trainer",
    role: "trainer",
    preferredLang: "en",
    phoneNumber: "+919876500001",
  }).onConflictDoNothing();

  await db.insert(users).values({
    username: "ramesh",
    passwordHash: await bcrypt.hash("Worker@123", 12),
    displayName: "Ramesh Kumar",
    role: "worker",
    preferredLang: "hi",
    phoneNumber: "+919876543210",
  }).onConflictDoNothing();

  await db.insert(users).values({
    username: "priya",
    passwordHash: await bcrypt.hash("Worker@123", 12),
    displayName: "Priya Sharma",
    role: "worker",
    preferredLang: "en",
    phoneNumber: "+919876543211",
  }).onConflictDoNothing();

  const adminId = admin?.id;
  console.log("✅  Users created");
  console.log("    admin      / Admin@1234  (role: admin)");
  console.log("    trainer1   / Trainer@123 (role: trainer)");
  console.log("    ramesh     / Worker@123  (role: worker, Hindi)");
  console.log("    priya      / Worker@123  (role: worker, English)\n");

  // ── 2. Safety Course ───────────────────────────────────────────────────────
  const [safety] = await db.insert(courses).values({
    slug: "construction-site-safety",
    title: "Construction Site Safety",
    titleHi: "निर्माण स्थल सुरक्षा",
    description: "Essential safety practices to protect yourself and your team on construction sites. Covers PPE, fire safety, and emergency procedures.",
    descriptionHi: "निर्माण स्थलों पर खुद को और अपनी टीम की सुरक्षा के लिए आवश्यक सुरक्षा अभ्यास।",
    category: "safety",
    difficulty: "beginner",
    durationMinutes: 45,
    isPublished: true,
    sortOrder: 1,
    createdBy: adminId,
  }).onConflictDoNothing().returning({ id: courses.id });

  if (safety) {
    // Module 1: PPE
    const [ppeMod] = await db.insert(modules).values({
      courseId: safety.id,
      title: "Personal Protective Equipment (PPE)",
      titleHi: "व्यक्तिगत सुरक्षा उपकरण (PPE)",
      description: "What PPE to wear, when to wear it, and how to inspect it.",
      descriptionHi: "कौन सा PPE कब पहनें और कैसे जांचें।",
      sortOrder: 1,
    }).returning({ id: modules.id });

    if (ppeMod) {
      await db.insert(lessons).values([
        {
          moduleId: ppeMod.id,
          title: "Introduction to PPE",
          titleHi: "PPE का परिचय",
          contentType: "video",
          videoUrl: "https://www.youtube.com/watch?v=2Z3r1f9QDPU",
          videoProvider: "youtube",
          videoDurationSeconds: 420,
          sortOrder: 1,
          isRequired: true,
        },
        {
          moduleId: ppeMod.id,
          title: "Types of Safety Helmets",
          titleHi: "सुरक्षा हेलमेट के प्रकार",
          contentType: "text",
          content: `## Safety Helmets (Hard Hats)\n\nA safety helmet protects your head from falling objects, bumps, and electrical hazards.\n\n### Three Classes\n\n| Class | Protection | Colour (typical) |\n|-------|-----------|------------------|\n| **A (General)** | Impact + up to 2,200V | White / Yellow |\n| **B (Electrical)** | Impact + up to 20,000V | Blue |\n| **C (Conductive)** | Impact only — NO electrical protection | Orange |\n\n### Daily inspection checklist\n- ✅ No cracks or dents in the shell\n- ✅ Suspension intact and not frayed\n- ✅ No paint or stickers covering defects\n- ✅ Replace if dropped from > 1.5 m\n\n> ⚠️ **Rule: No helmet = No entry on the active site.**`,
          contentHi: `## सुरक्षा हेलमेट\n\nसुरक्षा हेलमेट आपके सिर को गिरती वस्तुओं और बिजली के खतरों से बचाता है।\n\n### तीन वर्ग\n- **Class A**: सामान्य उपयोग, 2,200V तक\n- **Class B**: बिजली का काम, 20,000V तक  \n- **Class C**: केवल प्रभाव सुरक्षा, बिजली नहीं\n\n### दैनिक जांच\n- ✅ कोई दरार या खरोंच नहीं\n- ✅ अंदर की पट्टी ठीक हो\n\n> ⚠️ **नियम: हेलमेट नहीं = साइट में प्रवेश नहीं।**`,
          sortOrder: 2,
          isRequired: true,
        },
        {
          moduleId: ppeMod.id,
          title: "Safety Footwear and High-Vis Vests",
          titleHi: "सुरक्षा जूते और हाई-विज़ वेस्ट",
          contentType: "text",
          content: `## Safety Footwear\n\nSteel-toed boots (S3 standard) protect against:\n- Falling heavy objects\n- Punctures from nails and sharp debris\n- Slipping on wet or oily surfaces\n\n**Always check:** No holes in the sole, laces tied firmly, no exposed steel.\n\n## High-Visibility (Hi-Vis) Vest\n\nMandatory on all active sites. Must be:\n- Bright yellow or orange\n- Reflective strips intact\n- Worn over your outer layer\n- Replaced if torn or faded`,
          contentHi: `## सुरक्षा जूते\n\nस्टील-टो बूट इनसे बचाते हैं:\n- भारी वस्तुओं का गिरना\n- कील और धारदार मलबे से छेद\n- गीली सतह पर फिसलना\n\n## हाई-विज़ वेस्ट\n\nसभी सक्रिय साइटों पर अनिवार्य। चमकीला पीला या नारंगी होना चाहिए।`,
          sortOrder: 3,
          isRequired: true,
        },
      ]);

      // Quiz for PPE module
      const [ppeQuiz] = await db.insert(quizzes).values({
        moduleId: ppeMod.id,
        title: "PPE Knowledge Check",
        passingScore: 70,
      }).returning({ id: quizzes.id });

      if (ppeQuiz) {
        await db.insert(quizQuestions).values([
          {
            quizId: ppeQuiz.id,
            question: "Which helmet class protects against electrical voltage up to 20,000V?",
            questionHi: "कौन सा हेलमेट वर्ग 20,000V तक बिजली से बचाता है?",
            options: ["Class A", "Class B", "Class C", "Class D"],
            optionsHi: ["Class A", "Class B", "Class C", "Class D"],
            correctIndex: 1,
            explanation: "Class B helmets are designed for electrical work and protect against high-voltage hazards up to 20,000V.",
            explanationHi: "Class B हेलमेट बिजली के काम के लिए बनाए गए हैं और 20,000V तक बचाते हैं।",
            sortOrder: 1,
          },
          {
            quizId: ppeQuiz.id,
            question: "You drop your safety helmet from 2 metres. What should you do?",
            questionHi: "आपका हेलमेट 2 मीटर से गिर जाए। आप क्या करेंगे?",
            options: [
              "Keep using it — it looks fine",
              "Replace it immediately, even if there are no visible cracks",
              "Keep it for office use only",
              "Glue any cracks and continue",
            ],
            optionsHi: [
              "उपयोग जारी रखें — ठीक लगता है",
              "तुरंत बदलें, भले ही दरारें दिखाई न दें",
              "केवल ऑफिस उपयोग के लिए रखें",
              "दरारें चिपकाएं और जारी रखें",
            ],
            correctIndex: 1,
            explanation: "Any helmet dropped from over 1.5 metres must be replaced immediately. Internal damage may not be visible.",
            explanationHi: "1.5 मीटर से अधिक से गिरा कोई भी हेलमेट तुरंत बदला जाना चाहिए। अंदरूनी क्षति दिखाई नहीं दे सकती।",
            sortOrder: 2,
          },
          {
            quizId: ppeQuiz.id,
            question: "High-visibility vests must be replaced when:",
            questionHi: "हाई-विज़ वेस्ट कब बदली जानी चाहिए?",
            options: [
              "Every Monday morning",
              "Only when the company provides a new one",
              "When torn, faded, or reflective strips are damaged",
              "After every single use",
            ],
            optionsHi: [
              "हर सोमवार सुबह",
              "केवल जब कंपनी नई दे",
              "जब फटी, फीकी हो, या परावर्तक पट्टियां क्षतिग्रस्त हों",
              "हर उपयोग के बाद",
            ],
            correctIndex: 2,
            explanation: "Hi-vis vests must be replaced when torn, faded to the point where brightness is compromised, or when reflective strips are damaged or missing.",
            explanationHi: "जब फटी हो, चमक कम हो, या परावर्तक पट्टियां क्षतिग्रस्त हों तब बदलनी चाहिए।",
            sortOrder: 3,
          },
        ]);
      }
    }

    // Module 2: Fire Safety
    const [fireMod] = await db.insert(modules).values({
      courseId: safety.id,
      title: "Fire Safety & Emergency Procedures",
      titleHi: "अग्नि सुरक्षा और आपातकालीन प्रक्रियाएं",
      description: "How to prevent fires, use extinguishers, and evacuate safely.",
      descriptionHi: "आग रोकना, बुझाना और सुरक्षित निकलना।",
      sortOrder: 2,
    }).returning({ id: modules.id });

    if (fireMod) {
      await db.insert(lessons).values([
        {
          moduleId: fireMod.id,
          title: "Fire Triangle & Prevention",
          titleHi: "अग्नि त्रिकोण और रोकथाम",
          contentType: "text",
          content: `## The Fire Triangle\n\nFire needs **three elements** to start and keep burning:\n1. **Fuel** — wood, paper, fuel, chemicals\n2. **Oxygen** — air around us\n3. **Heat** — a spark, flame, or hot surface\n\nRemove ANY one element and the fire goes out.\n\n## Prevention on Site\n- Store flammable materials in designated, ventilated areas\n- Keep work areas clear of debris and rubbish\n- No smoking except in marked zones\n- Report faulty electrical equipment immediately\n- Never block fire exits`,
          contentHi: `## अग्नि त्रिकोण\n\nआग के लिए **तीन तत्व** आवश्यक हैं:\n1. **ईंधन** — लकड़ी, कागज, ईंधन\n2. **ऑक्सीजन** — हवा\n3. **गर्मी** — चिंगारी या लौ\n\nकोई भी एक तत्व हटाएं और आग बुझ जाएगी।\n\n## साइट पर रोकथाम\n- ज्वलनशील सामग्री निर्धारित क्षेत्रों में रखें\n- कार्यक्षेत्र साफ रखें\n- अग्नि निकास कभी न बंद करें`,
          sortOrder: 1,
          isRequired: true,
        },
        {
          moduleId: fireMod.id,
          title: "Using a Fire Extinguisher — PASS Technique",
          titleHi: "अग्निशामक का उपयोग — PASS तकनीक",
          contentType: "video",
          videoUrl: "https://www.youtube.com/watch?v=IOqMFMDnLJs",
          videoProvider: "youtube",
          videoDurationSeconds: 180,
          sortOrder: 2,
          isRequired: true,
        },
      ]);

      const [fireQuiz] = await db.insert(quizzes).values({
        moduleId: fireMod.id,
        title: "Fire Safety Quiz",
        passingScore: 70,
      }).returning({ id: quizzes.id });

      if (fireQuiz) {
        await db.insert(quizQuestions).values([
          {
            quizId: fireQuiz.id,
            question: "What does the 'A' stand for in the PASS fire extinguisher technique?",
            questionHi: "PASS तकनीक में 'A' का मतलब क्या है?",
            options: ["Aim at the flames", "Aim at the base of the fire", "Apply slowly", "Alert others first"],
            optionsHi: ["लपटों पर निशाना लगाएं", "आग की जड़ पर निशाना लगाएं", "धीरे लगाएं", "पहले दूसरों को सचेत करें"],
            correctIndex: 1,
            explanation: "A = Aim the nozzle at the BASE of the fire, not the flames. Hitting the flames only pushes them — you must cut off the fuel source.",
            explanationHi: "A = नोजल को आग की जड़ पर निशाना लगाएं, लपटों पर नहीं।",
            sortOrder: 1,
          },
          {
            quizId: fireQuiz.id,
            question: "Which extinguisher type is safe to use on an ELECTRICAL fire?",
            questionHi: "बिजली की आग पर कौन सा अग्निशामक सुरक्षित है?",
            options: ["Water (red)", "Foam (cream)", "CO₂ (black)", "Sand bucket"],
            optionsHi: ["पानी (लाल)", "फोम (क्रीम)", "CO₂ (काला)", "रेत की बाल्टी"],
            correctIndex: 2,
            explanation: "CO₂ extinguishers (black label) are safe for electrical fires. NEVER use water on electrical fires — it conducts electricity and can electrocute you.",
            explanationHi: "CO₂ अग्निशामक (काला लेबल) बिजली की आग के लिए सुरक्षित है। बिजली की आग पर कभी पानी न डालें।",
            sortOrder: 2,
          },
        ]);
      }
    }
  }
  console.log("✅  Safety course seeded (2 modules, 5 lessons, 2 quizzes)");

  // ── 3. Hand Tools Course ───────────────────────────────────────────────────
  const [tools] = await db.insert(courses).values({
    slug: "hand-tools-basics",
    title: "Hand Tools Basics",
    titleHi: "हाथ के औजार — बुनियादी",
    description: "Learn to safely select, use, and maintain common hand tools on construction sites.",
    descriptionHi: "सामान्य हाथ के औजारों को सुरक्षित रूप से चुनना, उपयोग करना और रखरखाव करना।",
    category: "tools",
    difficulty: "beginner",
    durationMinutes: 30,
    isPublished: true,
    sortOrder: 2,
    createdBy: adminId,
  }).onConflictDoNothing().returning({ id: courses.id });

  if (tools) {
    const [toolsMod] = await db.insert(modules).values({
      courseId: tools.id,
      title: "Basic Hand Tools",
      titleHi: "बुनियादी हाथ के औजार",
      sortOrder: 1,
    }).returning({ id: modules.id });

    if (toolsMod) {
      await db.insert(lessons).values([
        {
          moduleId: toolsMod.id,
          title: "Hammers — Types and Safe Use",
          titleHi: "हथौड़े — प्रकार और सुरक्षित उपयोग",
          contentType: "text",
          content: `## Hammers\n\n### Common types on construction sites\n- **Claw hammer** — general nailing and nail removal\n- **Sledgehammer** — breaking concrete or masonry\n- **Rubber mallet** — fitting without marking surfaces\n\n### Safe use rules\n- Inspect handle for cracks before each use\n- Never use a hammer with a loose head\n- Wear safety glasses — chips can fly\n- Strike squarely on the nail head\n- Keep the strike zone clear of others (1.5 m radius)`,
          contentHi: `## हथौड़े\n\n### आम प्रकार\n- **क्लॉ हैमर** — सामान्य कील ठोकना\n- **स्लेजहैमर** — कंक्रीट तोड़ना\n- **रबर मैलेट** — सतह को नुकसान पहुंचाए बिना फिटिंग\n\n### सुरक्षित उपयोग\n- हर उपयोग से पहले हैंडल की दरारें जांचें\n- ढीले सिर वाला हथौड़ा कभी न चलाएं\n- सुरक्षा चश्मा पहनें`,
          sortOrder: 1,
          isRequired: true,
        },
        {
          moduleId: toolsMod.id,
          title: "Tool Storage and Maintenance",
          titleHi: "औजारों का भंडारण और रखरखाव",
          contentType: "text",
          content: `## Tool Storage\n- Clean tools after each use\n- Store in a dry, locked toolbox\n- Never leave tools on scaffolding or elevated surfaces\n- Label tools with your name/number\n\n## Maintenance\n- Oil moving parts regularly\n- Sharpen blades only with proper equipment\n- Replace worn handles immediately\n- Discard any tool that cannot be safely repaired`,
          contentHi: `## औजारों का भंडारण\n- हर उपयोग के बाद साफ करें\n- सूखे, बंद टूलबॉक्स में रखें\n- मचान पर औजार कभी न छोड़ें`,
          sortOrder: 2,
          isRequired: true,
        },
      ]);

      const [toolsQuiz] = await db.insert(quizzes).values({
        moduleId: toolsMod.id,
        title: "Hand Tools Safety Quiz",
        passingScore: 70,
      }).returning({ id: quizzes.id });

      if (toolsQuiz) {
        await db.insert(quizQuestions).values([
          {
            quizId: toolsQuiz.id,
            question: "Before using a hammer, you should always:",
            questionHi: "हथौड़ा उपयोग करने से पहले हमेशा:",
            options: [
              "Paint it for easy identification",
              "Inspect the handle for cracks and ensure the head is tight",
              "Soak it in water to swell the wood",
              "Weigh it to ensure it is correct",
            ],
            optionsHi: [
              "पहचान के लिए पेंट करें",
              "हैंडल की दरारें जांचें और सिर कसा हुआ सुनिश्चित करें",
              "लकड़ी को फुलाने के लिए पानी में भिगोएं",
              "वजन करें",
            ],
            correctIndex: 1,
            explanation: "A cracked handle or loose head can cause the hammer to fail mid-swing, sending the head flying and causing serious injury.",
            explanationHi: "टूटा हुआ हैंडल या ढीला सिर गंभीर चोट का कारण बन सकता है।",
            sortOrder: 1,
          },
        ]);
      }
    }
  }
  console.log("✅  Tools course seeded");

  // ── 4. Electrical Safety Course ───────────────────────────────────────────
  const [electrical] = await db.insert(courses).values({
    slug: "electrical-safety-basics",
    title: "Electrical Safety Basics",
    titleHi: "बिजली सुरक्षा — बुनियादी",
    description: "Essential electrical safety knowledge: hazard recognition, lockout/tagout, and safe work practices.",
    descriptionHi: "बिजली के खतरों की पहचान, लॉकआउट/टैगआउट और सुरक्षित कार्य अभ्यास।",
    category: "electrical",
    difficulty: "intermediate",
    durationMinutes: 60,
    isPublished: true,
    sortOrder: 3,
    createdBy: adminId,
  }).onConflictDoNothing().returning({ id: courses.id });

  if (electrical) {
    const [elecMod] = await db.insert(modules).values({
      courseId: electrical.id,
      title: "Electrical Hazard Recognition",
      titleHi: "बिजली के खतरों की पहचान",
      sortOrder: 1,
    }).returning({ id: modules.id });

    if (elecMod) {
      await db.insert(lessons).values([
        {
          moduleId: elecMod.id,
          title: "Common Electrical Hazards on Site",
          titleHi: "साइट पर आम बिजली के खतरे",
          contentType: "text",
          content: `## The 4 Main Electrical Hazards\n\n### 1. Electrocution\nDirect contact with live electrical parts. Can be fatal at voltages as low as 50V.\n\n### 2. Electrical Burns\nCan be external (entry/exit wounds) or internal (damage to muscles and nerves).\n\n### 3. Arc Flash\nExplosive release of energy from an electrical fault. Temperature can reach 20,000°C.\n\n### 4. Fire from Electrical Faults\nOverloaded circuits, damaged cables, or loose connections can ignite nearby materials.\n\n## Warning Signs to Report Immediately\n- Flickering lights\n- Burning smell\n- Sparks from outlets or equipment\n- Tripped breakers that keep tripping\n- Warm or discoloured wall plates\n- Damaged, frayed, or exposed cable insulation`,
          contentHi: `## 4 मुख्य बिजली के खतरे\n\n1. **बिजली का झटका** — 50V जितनी कम वोल्टेज पर भी घातक\n2. **बिजली से जलना** — बाहरी और आंतरिक दोनों\n3. **आर्क फ्लैश** — 20,000°C तक का विस्फोटक ऊर्जा विमोचन\n4. **बिजली की आग** — अतिभारित सर्किट से\n\n## तुरंत रिपोर्ट करें\n- टिमटिमाती लाइटें\n- जलने की गंध\n- उपकरण से चिंगारी\n- क्षतिग्रस्त केबल`,
          sortOrder: 1,
          isRequired: true,
        },
        {
          moduleId: elecMod.id,
          title: "Lockout / Tagout (LOTO) Procedure",
          titleHi: "लॉकआउट / टैगआउट (LOTO) प्रक्रिया",
          contentType: "text",
          content: `## What is LOTO?\n\nLockout/Tagout (LOTO) is a procedure to **isolate energy sources** before performing maintenance or repairs on electrical equipment.\n\n## The 6 Steps\n\n1. **Notify** — Tell all affected workers the equipment will be shut down\n2. **Identify** — Locate all energy sources (electrical, hydraulic, pneumatic)\n3. **Isolate** — Turn off the equipment using the proper shutdown procedure\n4. **Lock** — Apply your personal padlock to the energy-isolating device\n5. **Tag** — Attach a danger tag with your name, date, and reason\n6. **Verify** — Try to start the equipment to confirm it is de-energised\n\n> 🔒 **Only the person who placed the lock can remove it.**`,
          contentHi: `## LOTO क्या है?\n\nLOTO मरम्मत से पहले बिजली के उपकरणों से **ऊर्जा स्रोतों को अलग करने** की प्रक्रिया है।\n\n## 6 चरण\n1. **सूचित करें** — प्रभावित श्रमिकों को बताएं\n2. **पहचानें** — सभी ऊर्जा स्रोत खोजें\n3. **अलग करें** — उपकरण बंद करें\n4. **लॉक करें** — अपना व्यक्तिगत ताला लगाएं\n5. **टैग करें** — नाम और कारण वाला टैग लगाएं\n6. **सत्यापित करें** — उपकरण शुरू करने की कोशिश करके पुष्टि करें\n\n> 🔒 **केवल वही व्यक्ति ताला हटा सकता है जिसने लगाया था।**`,
          sortOrder: 2,
          isRequired: true,
        },
      ]);

      const [elecQuiz] = await db.insert(quizzes).values({
        moduleId: elecMod.id,
        title: "Electrical Safety Quiz",
        passingScore: 75,
      }).returning({ id: quizzes.id });

      if (elecQuiz) {
        await db.insert(quizQuestions).values([
          {
            quizId: elecQuiz.id,
            question: "At what voltage can electrocution be fatal?",
            questionHi: "किस वोल्टेज पर बिजली का झटका घातक हो सकता है?",
            options: ["Only above 240V", "Only above 110V", "As low as 50V", "Only above 1,000V"],
            optionsHi: ["केवल 240V से ऊपर", "केवल 110V से ऊपर", "50V जितना कम", "केवल 1,000V से ऊपर"],
            correctIndex: 2,
            explanation: "Electrocution can be fatal at voltages as low as 50V, depending on the current path through the body and the person's health.",
            explanationHi: "50V जितनी कम वोल्टेज पर भी बिजली का झटका घातक हो सकता है।",
            sortOrder: 1,
          },
          {
            quizId: elecQuiz.id,
            question: "In a LOTO procedure, who is allowed to remove the lock?",
            questionHi: "LOTO प्रक्रिया में ताला हटाने की अनुमति किसे है?",
            options: [
              "The site supervisor",
              "Any trained worker",
              "Only the person who placed the lock",
              "The safety officer",
            ],
            optionsHi: [
              "साइट सुपरवाइजर",
              "कोई भी प्रशिक्षित कर्मचारी",
              "केवल वह व्यक्ति जिसने ताला लगाया",
              "सुरक्षा अधिकारी",
            ],
            correctIndex: 2,
            explanation: "This is the fundamental rule of LOTO: only the person who placed the lock may remove it. This prevents accidental re-energisation while someone is still working.",
            explanationHi: "LOTO का मूल नियम: केवल वही व्यक्ति ताला हटा सकता है जिसने लगाया था।",
            sortOrder: 2,
          },
          {
            quizId: elecQuiz.id,
            question: "Which of these is NOT a warning sign of an electrical fault?",
            questionHi: "इनमें से कौन सा बिजली की खराबी का चेतावनी संकेत नहीं है?",
            options: [
              "Burning smell near outlets",
              "Flickering lights",
              "A wall painted white",
              "Warm wall plates",
            ],
            optionsHi: [
              "आउटलेट के पास जलने की गंध",
              "टिमटिमाती लाइटें",
              "सफेद रंग की दीवार",
              "गर्म दीवार की प्लेटें",
            ],
            correctIndex: 2,
            explanation: "A white wall has nothing to do with electrical faults. Burning smells, flickering lights, and warm outlets are all serious warning signs.",
            explanationHi: "सफेद दीवार का बिजली की खराबी से कोई संबंध नहीं है।",
            sortOrder: 3,
          },
        ]);
      }
    }
  }
  console.log("✅  Electrical course seeded");

  // ── 5. Basics Course (draft — not published, shows admin-only) ────────────
  await db.insert(courses).values({
    slug: "construction-basics",
    title: "Construction Basics (Coming Soon)",
    titleHi: "निर्माण बुनियादी (जल्द आ रहा है)",
    description: "Foundation concepts every construction worker needs to know.",
    descriptionHi: "हर निर्माण कर्मचारी को जानने वाली बुनियादी बातें।",
    category: "basics",
    difficulty: "beginner",
    durationMinutes: 0,
    isPublished: false, // draft — visible only to admin
    sortOrder: 4,
    createdBy: adminId,
  }).onConflictDoNothing();
  console.log("✅  Basics course seeded (draft)");

  console.log("\n🎉  Seed complete!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Admin Panel  → open admin/index.html in browser");
  console.log("  API Health   → http://localhost:5000/api/health");
  console.log("  Start dev    → npm run dev");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  process.exit(0);
}

seed().catch((e) => {
  console.error("\n❌  Seed failed:", e.message);
  console.error(e);
  process.exit(1);
});
