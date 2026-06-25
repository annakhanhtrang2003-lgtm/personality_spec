# Personal Definition Agent — Design Spec

**Date:** 2026-06-26
**Status:** Draft
**Scope:** Buddy Agent Step 1 — Personal Definition + Referral System

---

## 1. Overview

The Personal Definition Agent is Step 1 of the Buddy Agent system. It helps Vietnamese students (year 3-4 and fresh graduates) discover who they are through three personality frameworks, then uses that profile to drive career matching in Step 2.

The agent combines a serious personality framework (MBTI) with fun, shareable layers (Zodiac, Numerology) to create a viral referral loop. The fun layers are the acquisition hook; MBTI is the career value.

### Goals

- Help users build a meaningful self-understanding profile
- Create shareable moments that drive referral invites
- Retain users post-profile through streaks and social features
- Produce a weighted personality profile that feeds Step 2 (Career Path Matching)

### Target Users

- Vietnamese university students (year 3-4) and fresh graduates
- Primary language: Vietnamese
- Comfortable with social sharing, astrology culture, personality tests

---

## 2. Architecture

### Single Agent + Modular Tools

One conversational agent drives the entire Step 1 flow. It handles tone, pacing, and user engagement. The calculation logic lives in four independent modules the agent calls as tools.

```
User <-> Personal Definition Agent
              |
              |-- ZodiacCalculator (tool)
              |-- NumerologyCalculator (tool)
              |-- MBTIAnalyzer (tool)
              |-- ProfileSynthesizer (tool)
```

**Why this architecture:**
- One continuous conversation = smooth UX, no jarring handoffs
- Agent can cross-reference layers naturally ("Nhân Mã mà ENFJ thì thú vị nha!")
- Modules are independently testable and reusable
- Easy to add new fun layers later (e.g., Chinese zodiac) without rewriting the agent

---

## 3. Conversation Flow

### Phase 0 — Onboarding (~30 seconds)

- Greet user, ask their name
- Ask their university (for card branding)
- Ask birthday (day/month/year)
- This single input unlocks: Sun sign + Life Path Number immediately
- Tone: curious friend

### Phase 1 — Zodiac Deep Dive (~2-3 minutes)

- Immediately reveal Sun sign with mystic/magical tone
- Ask birth time for Moon + Rising signs
- If user doesn't know birth time: guide them to find it
  - Suggest: check birth certificate, ask parents, check hospital records
  - Bookmark for later — deliver Sun sign results now
  - Mark Moon/Rising as "unlockable later" (re-engagement hook)
- Ask birth location (city level)
- If time + location provided: calculate and present full zodiac triad (Sun/Moon/Rising)
- Present element (Fire/Earth/Air/Water) and modality (Cardinal/Fixed/Mutable)
- **Shareable moment #1:** generate partial profile card with zodiac triad
- Tone: **mystic guide** — poetic, mysterious, special

### Phase 2 — Numerology (~1-2 minutes)

- Life Path Number already calculated from birthday
- Ask full name (as on birth certificate) for Expression Number
- Present both numbers with mystical interpretation
- Cross-reference with zodiac results:
  - "Số chủ đạo 7 kết hợp với Nhân Mã — bạn vừa thích phiêu lưu vừa hay đào sâu suy nghĩ"
- Tone: **mystic guide**

### Phase 3 — MBTI Exploration (~5-8 minutes)

- Tone transition: "Giờ mình tìm hiểu sâu hơn về tính cách bạn nha!"
- Adaptive conversational questioning — NOT a fixed quiz
- Agent asks open-ended questions, adapts follow-ups based on answers
- Covers all 4 MBTI dimensions:
  - E (Extraversion) / I (Introversion)
  - S (Sensing) / N (Intuition)
  - T (Thinking) / F (Feeling)
  - J (Judging) / P (Perceiving)
- Agent calls MBTIAnalyzer after each answer to update running assessment
- Chooses next question based on which dimensions still need clarity
- Cross-references with previous layers naturally during conversation
- ~15-20 conversational exchanges total
- Tone: **curious buddy** — friendly, casual, like talking to a friend

### Phase 4 — Profile Synthesis

- Agent calls ProfileSynthesizer with all collected data
- Presents the "story of you" — a narrative weaving all three layers
- Weighted profile: MBTI 80% + Zodiac/Numerology 20%
- Highlights: key strengths, growth areas, personality keywords
- **Shareable moment #2:** full profile card generated
- University badge applied to card
- Triggers referral prompt: "Test mức độ hiểu biết của bạn và bestie?"
- Stores structured profile for Step 2 handoff

---

## 4. Calculation Modules

### 4.1 ZodiacCalculator

**Input:**
- birth_date (required): date
- birth_time (optional): time
- birth_location (optional): city string

**Output:**
- sun_sign: always computed from date ranges
- moon_sign: computed if birth_time + birth_location provided (requires ephemeris data)
- rising_sign: computed if birth_time + birth_location provided (requires house calculation)
- element: Fire / Earth / Air / Water
- modality: Cardinal / Fixed / Mutable
- traits: array of personality descriptors
- compatibility_notes: used for friend comparison feature

**Data:**
- Pre-computed ephemeris tables (1990-2030) stored in `data/ephemeris/`
- City-to-coordinates mapping for Vietnamese cities in `data/locations/`

### 4.2 NumerologyCalculator

**Input:**
- birth_date (required): date
- full_name (required): string (Vietnamese with diacritics)

**Output:**
- life_path_number: single digit 1-9 or master number 11/22/33
- expression_number: single digit 1-9 or master number 11/22/33
- interpretations: object with meaning for each number

**Logic:**
- Life Path: sum all digits of birth date, reduce to single digit (preserve master numbers)
- Expression: map each letter to number using Pythagorean system
- Vietnamese diacritics mapping table: strip diacritics first (A=A=A=1), handle D/D separately
- Mapping stored in `data/numerology/vietnamese-char-map.json`

### 4.3 MBTIAnalyzer

**Input:**
- qa_pairs: array of { question: string, answer: string } from the conversation

**Output:**
- type: 4-letter string (e.g., "ENFJ")
- dimensions: object with percentage scores per dimension
  - e.g., { EI: { E: 72, I: 28 }, SN: { S: 35, N: 65 }, TF: { T: 40, F: 60 }, JP: { J: 55, P: 45 } }
- traits: descriptions per dimension
- confidence: "low" | "medium" | "high" (based on answer consistency and sample size)
- suggested_next_question: the dimension that needs most clarity + a suggested question topic

**Logic:**
- NLP analysis of open-ended answers to score each dimension
- Running assessment updated after each answer
- Confidence increases as more questions are answered
- Agent stops when all dimensions reach "medium" confidence or higher (~15-20 questions)

### 4.4 ProfileSynthesizer

**Input:**
- zodiac_result: output from ZodiacCalculator
- numerology_result: output from NumerologyCalculator
- mbti_result: output from MBTIAnalyzer
- user_name: string
- university: string

**Output:**
- narrative_profile: Vietnamese text — the "story of you" weaving all layers
- weighted_trait_map: MBTI-weighted (80%) trait scores with zodiac/numerology flavor (20%)
- strengths: top 5 strengths
- growth_areas: top 3 areas for development
- personality_keywords: 5-8 keywords summarizing the profile
- career_hints: preliminary career direction signals (passed to Step 2)
- shareable_card_data: structured data for card generation

---

## 5. Referral & Sharing System

### 5.1 Shareable Profile Card

**Generated at two moments:**
1. After Phase 1 (Zodiac) — partial card, early hook
2. After Phase 4 (Synthesis) — full card with all results

**Card content:**
- User name
- University badge/branding (UEH, RMIT, FPT, HCMUT, etc.)
- Zodiac triad (Sun/Moon/Rising) with element icon
- Life Path + Expression numbers
- MBTI type
- Short personality tagline
- Streak badges (added over time)
- Friend connection count

**Format:**
- OG-image style visual card
- Unique shareable link with referral code
- University-themed color scheme/design

**Card evolution — the card is NOT static:**
- Base card: after profile completion
- University badge: added during onboarding
- Streak flames/badges: appear as streaks grow
- Friend connections: shown on card as they're added
- The card becomes a living identity artifact

### 5.2 Comparison Game — "Test mức độ hiểu biết của bạn và bestie?"

**Flow:**
1. User A completes their profile
2. Prompt: "Test mức độ hiểu biết của bạn và bestie?"
3. User A answers quick questions guessing about their friend:
   - Guess friend's MBTI type
   - Guess friend's zodiac traits
   - Guess friend's personality keywords
4. User A sends invite link to Friend B
5. Friend B clicks link → completes their own profile
6. System reveals:
   - How accurate A's guesses were (score)
   - Compatibility report (MBTI matrix + zodiac elements + numerology harmony)
7. Friend B then guesses about User A → mutual reveal
8. Both see a shared compatibility card

**Second-order virality:**
- Both users are prompted to challenge more friends
- Compatibility card is shareable itself

### 5.3 Referral Loop

**Flow:**
User A completes profile → selects university → card generated → comparison game invite → Friend B joins → B completes profile → mutual reveal → both invited to challenge more friends → cycle repeats

**Tracking:**
- Each user gets a unique referral code
- Track: link clicks → profile starts → profile completions → friend connections made
- University-level leaderboards (optional): "UEH đã có 342 bạn tham gia!"

**Incentive:**
- The comparison game IS the primary incentive (curiosity-driven)
- Streak rewards add long-term retention (see Section 6)

### 5.4 Privacy

- Users choose what to display on their profile card
- Can hide MBTI, zodiac details, or specific results
- Comparison only happens when both users have completed profiles
- No raw personal data (birth time, location, full name) shown on cards — only derived results
- University affiliation is user-selected, not verified

---

## 6. Retention: Streaks & Rewards

### 6.1 Calendar Streaks

**Daily check-in system after profile completion:**
- Daily reflection prompts tied to personality type
- Zodiac-flavored daily nudges: "Hôm nay Nhân Mã của bạn nên thử..."
- MBTI-based growth challenges: "Thử thách cho ENFJ hôm nay: lắng nghe nhiều hơn nói"
- Numerology daily number energy

**Calendar visualization:**
- Visual calendar grid (GitHub contribution graph / Duolingo style)
- Each day color-coded by zodiac element:
  - Fire = red
  - Water = blue
  - Earth = green
  - Air = purple
- States:
  - Completed check-in → lit up in element color
  - Missed day → grey
  - Friend interaction day → special glow/star marker
- Monthly view shows consistency patterns
- Milestone markers at 7-day, 30-day, 100-day with reward icons
- Shareable: "Tháng này mình check-in 28/30 ngày!" → viral moment

### 6.2 Friend Streaks

- Tracks ongoing engagement between connected friends
- Weekly mini-challenges: "Tuần này ai đoán đúng mood của người kia nhiều hơn?"
- Friend streak counter visible on both users' cards
- Maintains social bond post-referral

### 6.3 Rewards Tiers

| Milestone | Reward |
|---|---|
| 7-day streak | MoMo xu (small amount) |
| 14-day streak | Student package discount (Grab, Shopee, Canva Pro) |
| 30-day streak | MoMo xu (larger amount) + exclusive card badge |
| 60-day streak | Merchandise entry (stickers, phone cases with personality art) |
| 100-day streak | Premium merchandise (tote bag, custom zodiac/MBTI art) |
| Friend streak milestones | Bonus MoMo xu for both friends |

**Partner integrations needed:**
- MoMo (payment/rewards)
- Student discount partners (Grab, Shopee, Canva, etc.)
- Merchandise production/fulfillment partner

---

## 7. Agent System Prompt Structure

The agent uses a single system prompt with phase-aware instructions:

```
ROLE: Personal Definition Buddy — help Vietnamese students discover themselves

PERSONALITY MODES:
- Phase 0 (Onboarding): Curious friend — warm, casual
- Phase 1 (Zodiac): Mystic guide — poetic, mysterious, magical
- Phase 2 (Numerology): Mystic guide — mystical, insightful
- Phase 3 (MBTI): Curious buddy — friendly, casual, like a real friend
- Phase 4 (Synthesis): Warm storyteller — weaving everything together

LANGUAGE: Vietnamese. Casual, gen-Z friendly. No formal/HR-speak.

TOOLS AVAILABLE:
- ZodiacCalculator
- NumerologyCalculator
- MBTIAnalyzer
- ProfileSynthesizer

FLOW: Follow phases 0-4 sequentially. Cross-reference layers naturally.
Never reveal you are using tools — present results as your own insight.

REFERRAL: After Phase 4, always prompt the comparison game.
```

---

## 8. Data Requirements

| Data | Source | Storage |
|---|---|---|
| Ephemeris tables (1990-2030) | Swiss Ephemeris / pre-computed | `data/ephemeris/` |
| Vietnamese city coordinates | Manual curation (~50 major cities) | `data/locations/` |
| Vietnamese character → number mapping | Pythagorean system adapted | `data/numerology/vietnamese-char-map.json` |
| Numerology interpretations (1-9, 11, 22, 33) | Content creation | `data/numerology/interpretations.json` |
| Zodiac sign traits & descriptions | Content creation | `data/zodiac/signs.json` |
| MBTI type descriptions (16 types) | Content creation | `data/mbti/types.json` |
| MBTI question bank | Content creation | `data/mbti/questions.json` |
| MBTI compatibility matrix | Research-based | `data/mbti/compatibility.json` |
| Zodiac compatibility matrix | Astrology-based | `data/zodiac/compatibility.json` |
| University list + branding | Manual curation | `data/universities.json` |

---

## 9. Tech Stack Alignment

Aligns with existing Buddy Agent setup:

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS 4
- **State management:** Zustand (conversation state, user profile, streak data)
- **AI:** Anthropic Claude API via @anthropic-ai/sdk (agent conversation + tool use)
- **Card generation:** Server-side OG image generation (Next.js API routes)
- **Streak calendar:** React component, data persisted (database TBD)
- **Sharing:** Web Share API + fallback copy-to-clipboard

---

## 10. Profile Data Schema (Step 2 Handoff)

The structured output passed to the Career Path Matching agent:

```typescript
interface PersonalProfile {
  user: {
    name: string;
    university: string;
    birth_date: string;
  };

  zodiac: {
    sun_sign: string;
    moon_sign: string | null;
    rising_sign: string | null;
    element: "Fire" | "Earth" | "Air" | "Water";
    modality: "Cardinal" | "Fixed" | "Mutable";
    traits: string[];
  };

  numerology: {
    life_path_number: number;
    expression_number: number;
    interpretations: {
      life_path: string;
      expression: string;
    };
  };

  mbti: {
    type: string; // e.g., "ENFJ"
    dimensions: {
      EI: { E: number; I: number };
      SN: { S: number; N: number };
      TF: { T: number; F: number };
      JP: { J: number; P: number };
    };
    confidence: "low" | "medium" | "high";
    traits: string[];
  };

  synthesis: {
    narrative: string;
    strengths: string[];
    growth_areas: string[];
    personality_keywords: string[];
    career_hints: string[];
    weighted_trait_map: Record<string, number>;
  };
}
```

---

## 11. Out of Scope (for this spec)

- Step 2-4 agents (Career Matching, CV Prep, Job Search)
- User authentication / account system
- Database selection and schema
- Payment integration with MoMo (needs separate spec)
- Merchandise fulfillment pipeline
- University verification
- Admin dashboard
- Analytics / tracking implementation
