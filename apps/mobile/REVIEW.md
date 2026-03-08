# Mobile App Code Review

## סיכום

ביצעתי סקירה מקיפה של אפליקציית המובייל (Expo/React Native). להלן הממצאים מסודרים לפי חומרה.

---

## קריטי (Critical)

### 1. Logout על כל שגיאת retry, כולל שגיאות רשת
**קובץ:** `lib/http/apiClient.ts` (שורות 228-234)

אם בקשה מקבלת 401, הטוקן מתרענן בהצלחה, ובקשת ה-retry נכשלת בגלל שגיאת רשת (לא 401), הקוד עושה logout. זה מוציא את המשתמש מהאפליקציה על בעיית רשת זמנית.

**תיקון:** לבצע logout רק על שגיאות 401/403, לא על כל שגיאה.

### 2. אין timeout על בקשות HTTP
**קובץ:** `lib/http/apiClient.ts` (שורה 111)

אין `AbortController` / timeout על הבקשות. אם השרת תקוע, הבקשה תיתקע לנצח. במיוחד בעייתי בזמן bootstrap שחוסם את ה-splash screen.

**תיקון:** להוסיף timeout של 15-30 שניות דרך `AbortController`.

### 3. זיהוי שגיאות רשת מצומצם מדי
**קובץ:** `lib/http/apiClient.ts` (שורות 114-117)

הקוד בודק רק `TypeError` עם ההודעה המדויקת `"Network request failed"`. בפלטפורמות שונות (web, iOS, Android) הודעות השגיאה שונות.

**תיקון:** לתפוס כל `TypeError` שנזרק מ-fetch כשגיאת רשת.

### 4. צבעים hardcoded - אין תמיכה ב-Dark Mode
**קבצים:**
- `components/DegradedBanner.tsx` - צבעים hardcoded (`#fff3cd`, `#856404` וכו')
- `components/OfflineBanner.tsx` - צבעים hardcoded (`#842029`, `#f8d7da` וכו')

**תיקון:** להשתמש בטוקנים של מערכת ה-theme (`theme.colors.warning`, `theme.colors.danger`).

---

### 5. Rules of Hooks violation ב-GamesTimeline
**קובץ:** `components/ui/GamesTimeline.tsx` (שורה 91)

Early return `if (gamesCount === 0) return null` מתרחש אחרי `useState`/`useRef`/`useCallback` hooks אבל לפני `useEffect` hooks בשורות 115 ו-128. אם `games` עובר מלא-ריק לריק ובחזרה, React יראה מספר שונה של hooks ויקרוס.

**תיקון:** להעביר את ה-early return לפני כל ה-hooks, או לטפל במצב הריק בתוך ה-return של הקומפוננטה.

### 6. כפתור Retry כפול ב-AppStartGate
**קובץ:** `components/AppStart/AppStartGate.tsx` (שורות 84-89)

`QueryErrorView` כבר מציג כפתור retry דרך `onRetry` prop, ואז `extraActions` מוסיף עוד כפתור retry. התוצאה: **שני** כפתורי retry על מסך השגיאה.

**תיקון:** להסיר את כפתור ה-retry מ-`extraActions`.

---

## גבוה (High)

### 7. Race condition ב-`useUsernameAvailability`
**קובץ:** `lib/auth/useUsernameAvailability.ts` (שורות 35-42)

אם המשתמש מקליד "abc" ואז מהר "abcd", שתי קריאות API יוצאות. אם התשובה ל-"abcd" מגיעה לפני "abc", הסטטוס הסופי ישקף "abc" (לא עדכני).

**תיקון:** להוסיף `AbortController` או מונה בקשות להתעלם מתוצאות ישנות.

### 8. `applyAuthResult` מקודד `role` ו-`hasPassword` ב-hardcode
**קובץ:** `lib/auth/AuthProvider.tsx` (שורות 406-409)

הפונקציה מניחה שכל משתמש חדש הוא `role: "user"` ו-`hasPassword: true`. לא נכון עבור Google OAuth.

**תיקון:** לקחת את הערכים מתשובת השרת.

### 9. הפניה אוטומטית על שגיאה בלובי קבוצה
**קובץ:** `app/groups/[id]/index.tsx` (שורות 118-123)

אם הרשת נופלת זמנית, המשתמש מופנה החוצה בלי אפשרות retry.

**תיקון:** להציג מסך שגיאה עם כפתור retry במקום הפניה.

### 10. חסרים ErrorBoundary במסכים
**קבצים:**
- `app/groups/[id]/fixtures/[fixtureId].tsx`
- `app/groups/[id]/member/[userId].tsx`
- `app/profile/groups.tsx`

**תיקון:** להוסיף `<ErrorBoundary>` כמו בשאר המסכים.

### 11. variant לא קיים - `"ghost"` ב-Button
**קובץ:** `components/ErrorBoundary/FeatureErrorFallback.tsx` (שורה 73)

מעביר `variant="ghost"` ל-`Button`, אבל הטיפוס תומך רק ב-`"primary" | "secondary" | "danger"`. ה-variant "ghost" נופל ל-branch של danger ומציג כפתור אדום.

**תיקון:** להוסיף variant של `ghost` או להחליף לvariant קיים.

### 12. `GamesTimeline` שולח `undefined` כמשחק
**קובץ:** `components/ui/GamesTimeline.tsx` (שורה 141)

כשלוחצים על נקודת ה-trophy, `games[index]` הוא `undefined` כי ה-trophy לא קיים במערך ה-games. זה יגרום לשגיאות runtime.

**תיקון:** לבדוק אם `index === trophyIndex` ולטפל בנפרד.

### 13. `StickyHeaderScreen` - Header מתחת ל-status bar
**קובץ:** `components/ui/StickyHeaderScreen.tsx` (שורות 252-258)

ה-sticky header בגובה 52px עם `top: 0` לא מחשב את `insets.top`. כפתור החזרה והכותרת יהיו מתחת ל-notch.

**תיקון:** להוסיף `insets.top` ל-position של ה-sticky header.

### 14. SocketProvider - stale ref ב-useMemo (כל הפיצ'רים real-time נשברים)
**קובץ:** `lib/socket/SocketProvider.tsx` (שורות 108-111)

`useMemo` תלוי ב-`socketRef.current` שהוא ref ולא dependency תקין. כש-socket חדש נוצר (אחרי token refresh), `useMemo` לא מתעדכן. **כל הצרכנים של `useSocket()` יקבלו socket ישן ומנותק** - צ'אט, הזמנות, ועדכוני real-time יפסיקו לעבוד בשקט.

**תיקון:** להשתמש ב-`useState` במקום `useRef` עבור ה-socket, או לאלץ re-render כש-socket משתנה.

### 15. Preferences API - body מסודר פעמיים (JSON.stringify כפול)
**קובץ:** `domains/preferences/preferences.api.ts` (שורה 29)

`body: JSON.stringify({ leagueOrder })` - ה-`apiFetchWithAuthRetry` כבר מסדר את ה-body ל-JSON. השרת מקבל מחרוזת כפולה `"{\"leagueOrder\":[1,2,3]}"` במקום אובייקט JSON. **שמירת סדר ליגות כנראה שבורה**.

**תיקון:** להעביר `body: { leagueOrder }` ישירות.

### 16. `calculateLivePoints` - ניקוד hardcoded שמתעלם מהגדרות קבוצה
**קובץ:** `features/groups/predictions-overview/components/utils.ts` (שורות 3-25)

הפונקציה מחזירה ניקוד קשיח (3, 2, 1) במקום להשתמש בהגדרות הניקוד של הקבוצה (`onTheNosePoints`, `correctDifferencePoints`, `outcomePoints`). **מציג ניקוד שגוי** לקבוצות עם הגדרות ניקוד שונות.

**תיקון:** לקבל את הגדרות הניקוד כפרמטר מהקבוצה.

---

## בינוני (Medium)

### 17. `setTimeout` ללא cleanup במסך Journey
**קובץ:** `app/(tabs)/journey.tsx` (שורה 72)

טיימר של 350ms שלא מנוקה. אם הקומפוננטה מתפרקת לפני שהטיימר מסתיים, זה יקרא לstate setter על קומפוננטה לא מותקנת.

### 18. `Dimensions.get("window")` במקום `useWindowDimensions`
**קבצים:**
- `app/(tabs)/journey.tsx` (שורות 17, 26) - ברמת מודול, לא מתעדכן
- `app/groups/[id]/index.tsx` (שורה 150) - בתוך render, לא מגיב לשינויים

**תיקון:** להשתמש ב-`useWindowDimensions()` hook.

### 19. מידע mock ב-journey
**קובץ:** `app/(tabs)/journey.tsx` (שורות 29-34)

כל הנתונים של ה-journey הם mock data קשיח. אם זה נשלח לפרודקשן, כל המשתמשים יראו אותו תוכן סטטי.

### 20. `Content-Type: application/json` נשלח גם על בקשות GET
**קובץ:** `lib/http/apiClient.ts` (שורות 81-85)

**תיקון:** לשלוח את ה-header רק כשיש body.

### 21. AppState listener נהרס ונבנה מחדש על כל רענון טוקן
**קובץ:** `lib/auth/AuthProvider.tsx` (שורות 614-650)

ה-useEffect תלוי ב-`accessToken`, אז כל פעם שהטוקן מתרענן (כל ~15 דקות) ה-listener נהרס ונבנה מחדש.

**תיקון:** להשתמש ב-refs עבור `status` ו-`accessToken`.

### 22. `console.error` monkey-patch לא מתנקה
**קובץ:** `lib/errors/globalErrorHandlers.ts` (שורות 64-76)

ה-cleanup function מחזיר את `ErrorUtils.setGlobalHandler` אבל לא מחזיר את `console.error` המקורי.

### 23. `atob` לא זמין ב-Hermes engine
**קובץ:** `lib/auth/auth.utils.ts` (שורות 10-29)

הקוד מנסה `atob` קודם ונופל ל-`Buffer`. ב-Hermes (מנוע ה-JS ב-React Native) `atob` לא זמין, אז הנתיב הראשי תמיד נכשל.

**תיקון:** להשתמש ב-`Buffer` ישירות או בספריית base64 אוניברסלית.

### 24. TAB_BAR_HEIGHT inconsistency
**קובץ:** `components/ui/Screen.tsx`

קבוע `TAB_BAR_HEIGHT = 56` מוגדר בשורה 23 אבל לא בשימוש. שורה 87 משתמשת ב-60 hardcoded. ההערה אומרת "Tab bar height: 60px".

### 25. Query ל-user ID 0 כשאין משתמש
**קובץ:** `app/profile/groups.tsx` (שורה 27)

```js
const statsQuery = useUserStatsQuery(user?.id ?? 0);
```

**תיקון:** לנטרל את ה-query כש-`user?.id` הוא falsy.

### 26. `updateGroupMutation` עם groupId 0
**קובץ:** `app/groups/[id]/index.tsx` (שורה 135)

**תיקון:** לוודא ש-groupId תקין לפני אתחול ה-mutation.

### 27. חסר `KeyboardAvoidingView` ב-Screen component
**קובץ:** `components/ui/Screen.tsx`

הקומפוננטה לא כוללת `KeyboardAvoidingView`. טפסים חייבים להוסיף את זה בעצמם.

### 28. הודעות chat אופטימיסטיות לא מתנקות בכישלון
**קובץ:** `domains/groups/groups-chat.hooks.ts` (שורות 267-354)

`sendMessage` מוסיף הודעה אופטימיסטית עם ID שלילי. אם ה-socket emit נכשל (ניתוק, שגיאת שרת), ההודעה עם ה-ID השלילי נשארת בcache לנצח. אין error callback, timeout, או ניקוי.

**תיקון:** להוסיף timeout ו-rollback להודעות אופטימיסטיות שלא אושרו.

### 29. חסר `staleTime` על רוב ה-queries
**קבצים:** `groups-core.hooks.ts`, `groups-predictions.hooks.ts`, `groups-members.hooks.ts`, `profile.queries.ts`, `activity.hooks.ts`

ברירת המחדל של React Query היא `staleTime: 0`, מה שגורם לrefetch על כל mount/focus. זה יוצר תעבורת רשת מיותרת וloading spinners בכל כניסה למסך.

### 30. `markAsRead` לא נקרא על פעילות חדשה
**קובץ:** `features/groups/activity/screens/GroupActivityScreen.tsx` (שורות 39-44)

ה-dependency `items.length > 0` הוא ביטוי boolean. `markAsRead` נקרא רק כשעוברים מ-0 לnon-zero. פעילות חדשה (length 5→6) לא מסומנת כנקראה עד שהמשתמש יוצא ונכנס מחדש.

### 31. Race condition ב-DiscoverGroupsScreen
**קובץ:** `features/groups/discover/screens/DiscoverGroupsScreen.tsx` (שורות 37-60)

ניהול pagination ידני במקום `useInfiniteQuery`. כשהחיפוש משתנה, תוצאות מעמוד ישן יכולות להתערבב עם תוצאות חיפוש חדש.

### 32. חסר `meta: { scope: "user" }` ב-group activity query
**קובץ:** `domains/groups/groups-activity.hooks.ts` (שורה 41)

בניגוד לכל שאר ה-queries, זה חסר את ה-meta scope. נתוני פעילות קבוצתית עלולים להישאר ב-cache אחרי logout.

---

## נמוך (Low) - Accessibility ו-UX

### 33. חסרים accessibility labels רבים

| קומפוננטה | בעיה |
|-----------|------|
| `DegradedBanner.tsx` | חסר `accessibilityRole="alert"` |
| `OfflineBanner.tsx` | חסר `accessibilityRole="alert"` |
| `AppHeader.tsx` (שורות 64-80) | כפתור חזרה ללא `accessibilityLabel` |
| `PasswordInput.tsx` (שורה 60) | כפתור toggle ללא `accessibilityLabel` |
| `GamesTimeline.tsx` (שורות 291-317) | נקודות ללא `accessibilityLabel` |
| `TeamLogo.tsx` (שורות 57-69) | תמונה ללא `accessibilityLabel` |
| `GameCardBase.tsx` (שורות 99-104) | Pressable ללא `accessibilityRole` |

### 34. Accessibility labels בשפה hardcoded
**קובץ:** `app/(tabs)/groups.tsx`
- `"Search groups"`, `"Invitations"`, `"Create group"` - צריכים לעבור דרך `t()`.

### 35. חסר `returnKeyType` ו-`onSubmitEditing` בטפסים
**קבצים:** sign-in, sign-up, forgot-password, reset-password, change-password, username

המשתמש לא יכול ללחוץ "Next" במקלדת כדי לעבור בין שדות, או "Done" לשלוח.

### 36. חסר `textContentType` ל-autofill
**קבצים:** sign-in, sign-up, change-password

שדות email/password לא מגדירים `textContentType` (iOS) או `autoComplete` (Android).

### 37. מסך Username - אין אפשרות חזרה/logout
**קובץ:** `app/username.tsx`

משתמש מאומת שמגיע למסך username לא יכול לצאת או לחזור. הוא תקוע עד שיבחר username.

### 38. חסר `BackHandler` עבור chat מורחב באנדרואיד
**קובץ:** `app/groups/[id]/index.tsx`

כשה-chat מורחב למסך מלא, לחיצה על כפתור Back באנדרואיד תצא מהמסך במקום לסגור את ה-chat.

### 39. מחרוזות hardcoded במסך Journey
**קובץ:** `app/(tabs)/journey.tsx`
- `"Pair letters and sounds"`, `"Completed · X XP"`, `"Lesson 3 of 5"`, `"REVIEW"`, `"START +20 XP"`

### 40. `isTabsSticky` - לוגיקה מתה/לא שלמה
**קובץ:** `app/(tabs)/groups.tsx` (שורות 69, 78-89)

`isTabsSticky` מחושב אבל לא משמש לרינדור sticky row. נראה כמו פיצ'ר לא שלם.

---

## ביצועים (Performance)

### 41. `colorMap` נוצר מחדש בכל render
**קובץ:** `components/ui/AppText.tsx` (שורות 41-48)

**תיקון:** לעטוף ב-`useMemo`.

### 42. פונקציות style ב-Button נוצרות מחדש בכל render
**קובץ:** `components/ui/Button.tsx` (שורות 40-95)

`getBackgroundColor`, `getBorderColor` וכו' נוצרות מחדש בכל render.

### 43. `renderListItem` תלוי ב-`isTabsSticky` שלא בשימוש
**קובץ:** `app/(tabs)/groups.tsx` (שורה 294)

`isTabsSticky` בדפנדנסי array גורם לרינדור מחדש של כל הרשימה בזמן גלילה.

### 44. `renderItem` לא עטוף ב-`useCallback`
**קובץ:** `app/profile/groups.tsx` (שורה 77)

---

## סיכום לפי חומרה

| חומרה | כמות |
|--------|------|
| קריטי | 6 |
| גבוה | 10 |
| בינוני | 16 |
| נמוך | 12 |
| **סה"כ** | **44** |
