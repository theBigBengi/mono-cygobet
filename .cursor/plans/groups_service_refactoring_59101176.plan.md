---
name: Groups Service Refactoring
overview: ריפקטורינג מקיף של groups service לפיצול ל-4 שכבות (service, repository, builders, permissions), אופטימיזציה של N+1 queries ב-getMyGroups, שיפור permissions, וטיפול בבעיות naming ו-consistency.
todos: []
---

# תוכנית ריפקטורינג Groups Service

## מטרה

לפצל את ה-God Service ל-4 שכבות ברורות, לפתור בעיות ביצועים (N+1 queries), ולשפר את התחזוקה והבדיקות.

## מבנה חדש

```
apps/server/src/services/api/groups/
├── service.ts          // Orchestration בלבד - קורא ל-repository/builders
├── repository.ts       // כל ה-Prisma queries - אין לוגיקה עסקית
├── builders.ts         // DTO builders - buildGroupItem, buildDraftGroupItem, etc.
├── permissions.ts      // assertGroupExists, assertGroupMember, assertGroupCreator
├── helpers.ts          // פונקציות עזר כלליות (נשאר)
├── types.ts            // טיפוסים (נשאר)
└── fixtures-filter.ts  // (קיים)
```

## שלב 1: יצירת Repository Layer

**קובץ חדש: `repository.ts`**

- העברת כל ה-Prisma queries מ-`service.ts` ל-`repository.ts`
- פונקציות:
  - `findGroupsByUserId(userId)` - קבוצות של משתמש
  - `findGroupById(id)` - קבוצה לפי ID
  - `createGroup(data)` - יצירת קבוצה
  - `updateGroup(id, data)` - עדכון קבוצה
  - `deleteGroup(id)` - מחיקת קבוצה
  - `findGroupMembersStats(groupIds)` - סטטיסטיקות members ב-batch
  - `findGroupFixturesStats(groupIds)` - סטטיסטיקות fixtures ב-batch
  - `findGroupPredictionsStats(groupIds, userId)` - סטטיסטיקות predictions ב-batch
  - `findNextGamesForGroups(groupIds, now)` - משחקים הבאים ב-batch
  - `findFirstFixturesForDraftGroups(groupIds)` - משחק ראשון ל-draft groups ב-batch
  - `findUnpredictedGamesForGroups(groupIds, userId, now)` - משחקים לא מנובאים ב-batch
  - `findGroupFixturesWithPredictions(groupId, userId)` - (קיים, להעביר)
  - `createGroupRules(groupId, data)` - יצירת rules
  - `findGroupRules(groupId)` - חיפוש rules
  - `attachFixturesToGroup(groupId, fixtureIds)` - הוספת fixtures
  - `findGroupFixturesByFixtureIds(groupId, fixtureIds)` - חיפוש groupFixtures
  - `upsertGroupPrediction(data)` - upsert prediction
  - `findGroupPredictionsForOverview(groupId, userId, fixtures)` - predictions ל-overview

**שינוי עיקרי**: כל הפונקציות מחזירות raw Prisma data, ללא עיבוד.

## שלב 2: אופטימיזציה של getMyGroups

**בעיה נוכחית**: N+1 queries - לכל קבוצה 5 queries נפרדים.

**פתרון**: Batch queries מרוכזים.

**בקובץ `repository.ts`**:

```typescript
// במקום 5 queries לכל קבוצה, 6 queries מרוכזים לכל הקבוצות:
async function findGroupsStatsBatch(
  groupIds: number[],
  userId: number,
  now: number
) {
  const [memberCountsRaw, fixtureCountsRaw, predictionCountsRaw, unpredictedGamesRaw, nextGamesRaw, firstGamesRaw] = 
    await Promise.all([
      // Query 1: memberCount per group
      prisma.groupMembers.groupBy({
        by: ['groupId'],
        where: { groupId: { in: groupIds }, status: MEMBER_STATUS.JOINED },
        _count: { groupId: true }
      }),
      // Query 2: totalFixtures per group
      prisma.groupFixtures.groupBy({
        by: ['groupId'],
        where: { groupId: { in: groupIds } },
        _count: { groupId: true }
      }),
      // Query 3: predictionsCount per group
      prisma.groupPredictions.groupBy({
        by: ['groupId'],
        where: { groupId: { in: groupIds }, userId },
        _count: { groupId: true }
      }),
      // Query 4: unpredicted games per group
      prisma.groupFixtures.findMany({
        where: {
          groupId: { in: groupIds },
          fixtures: { startTs: { gt: now } },
          NOT: { groupPredictions: { some: { userId } } }
        },
        select: { groupId: true }
      }),
      // Query 5: next games per group
      prisma.groupFixtures.findMany({
        where: {
          groupId: { in: groupIds },
          fixtures: { startTs: { gt: now } }
        },
        orderBy: { fixtures: { startTs: 'asc' } },
        select: { groupId: true, fixtures: { select: buildFixtureSelect() } }
      }),
      // Query 6: first games for draft groups
      prisma.groupFixtures.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: { fixtures: { startTs: 'asc' } },
        select: { groupId: true, fixtures: { select: buildFixtureSelect() } }
      })
    ]);
  
  // Build Maps: groupId -> data (cleaner - service לא יעשה transform)
  const memberCountByGroupId = new Map<number, number>();
  memberCountsRaw.forEach(item => memberCountByGroupId.set(item.groupId, item._count.groupId));
  
  const fixtureCountByGroupId = new Map<number, number>();
  fixtureCountsRaw.forEach(item => fixtureCountByGroupId.set(item.groupId, item._count.groupId));
  
  const predictionCountByGroupId = new Map<number, number>();
  predictionCountsRaw.forEach(item => predictionCountByGroupId.set(item.groupId, item._count.groupId));
  
  const hasUnpredictedGamesByGroupId = new Set<number>();
  unpredictedGamesRaw.forEach(item => hasUnpredictedGamesByGroupId.add(item.groupId));
  
  const nextGameByGroupId = new Map<number, FixtureWithRelations | null>();
  // Group by groupId and take first (earliest) for each
  const nextGamesByGroup = new Map<number, typeof nextGamesRaw[0]>();
  nextGamesRaw.forEach(item => {
    if (!nextGamesByGroup.has(item.groupId)) {
      nextGamesByGroup.set(item.groupId, item);
    }
  });
  nextGamesByGroup.forEach((item, groupId) => {
    nextGameByGroupId.set(groupId, formatFixtureFromDb(item.fixtures));
  });
  
  const firstGameByGroupId = new Map<number, FixtureWithRelations | null>();
  // Group by groupId and take first (earliest) for each
  const firstGamesByGroup = new Map<number, typeof firstGamesRaw[0]>();
  firstGamesRaw.forEach(item => {
    if (!firstGamesByGroup.has(item.groupId)) {
      firstGamesByGroup.set(item.groupId, item);
    }
  });
  firstGamesByGroup.forEach((item, groupId) => {
    firstGameByGroupId.set(groupId, formatFixtureFromDb(item.fixtures));
  });
  
  return {
    memberCountByGroupId,
    fixtureCountByGroupId,
    predictionCountByGroupId,
    hasUnpredictedGamesByGroupId,
    nextGameByGroupId,
    firstGameByGroupId
  };
}
```

**בקובץ `service.ts`**:

- `getMyGroups` יקרא ל-`findGroupsByUserId` + `findGroupsStatsBatch`
- ירכיב את התוצאות ישירות מה-Maps (ללא transform נוסף)

## שלב 3: יצירת Permissions Layer

**קובץ חדש: `permissions.ts`**

**החלפת `verifyGroupAccess` ב-3 פונקציות מפורשות**:

```typescript
// 1. רק בודק קיום
export async function assertGroupExists(groupId: number) {
  const group = await prisma.groups.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError(`Group with id ${groupId} not found`);
  return group;
}

// 2. בודק שהמשתמש הוא member (creator או joined)
export async function assertGroupMember(groupId: number, userId: number) {
  const group = await assertGroupExists(groupId);
  const isCreator = group.creatorId === userId;
  if (isCreator) return { group, isCreator: true, isMember: true };
  
  const member = await prisma.groupMembers.findFirst({
    where: { groupId, userId, status: MEMBER_STATUS.JOINED }
  });
  if (!member) {
    throw new NotFoundError(`Group with id ${groupId} not found`);
  }
  return { group, isCreator: false, isMember: true };
}

// 3. בודק שהמשתמש הוא creator
export async function assertGroupCreator(groupId: number, userId: number) {
  const group = await assertGroupExists(groupId);
  if (group.creatorId !== userId) {
    throw new NotFoundError(`Group with id ${groupId} not found`);
  }
  return group;
}
```

**שימוש**:

- `getGroupById`, `getGroupFixtures`, `saveGroupPrediction` → `assertGroupMember`
- `updateGroup`, `publishGroup`, `deleteGroup` → `assertGroupCreator`

## שלב 4: הפרדת Builders

**קובץ חדש: `builders.ts`**

- העברת כל ה-builders מ-`helpers.ts` ל-`builders.ts`:
  - `buildGroupItem(group)` - (קיים)
  - `buildDraftGroupItem(group, firstGame)` - (קיים)
  - `buildActiveGroupItem(group, stats, nextGame)` - (קיים)

**שינוי ב-`buildDraftGroupItemForMyGroups`**:

- להסיר את ה-DB query מתוך הפונקציה
- הפונקציה תקבל `firstGame` כפרמטר
- ה-query יעשה ב-`repository.ts` (batch)

## שלב 5: ריפקטורינג createGroup

**⚠️ חשוב**: לעשות את זה **אחרי** שלב 2 (getMyGroups) - זה הקוד הכי מסוכן לשבירה.

**פיצול ל-helpers**:

```typescript
// בקובץ helpers.ts או create-group.helpers.ts
async function resolveGroupName(name: string | undefined, creatorId: number): Promise<string>
async function createGroupRules(tx, groupId, selectionMode, teamIds, leagueIds): Promise<void>
async function resolveInitialFixtures(tx, selectionMode, fixtureIds, teamIds, leagueIds, now): Promise<number[]>
async function attachFixturesToGroup(tx, groupId, fixtureIds): Promise<void>
```

**ב-`service.ts`**:

- `createGroup` יקרא ל-helpers הללו
- יהפוך לקריא יותר (30 שורות במקום 130)

## שלב 6: אופטימיזציה של saveGroupPredictionsBatch

**שיפור**:

- להשאיר `upsert` (Prisma limitation - `updateMany` מוגבל)
- לעטוף את כל ה-upserts ב-transaction אחד (כבר קיים, אבל לוודא)
- להוריד validations כפולים לפני ה-transaction

**שינויים**:

- להסיר את ה-validation הכפול של group membership (כבר נעשה ב-`assertGroupMember`)
- לוודא שכל ה-upserts בתוך transaction אחד
- לא להילחם בפריזמה כאן - `upsert` הוא הפתרון הנכון

## שלב 7: תיקון Enums Consistency

**בעיה**: שימוש במחרוזות `"draft"`, `"active"`, `"joined"` במקום enums.

**פתרון**:

- להחליף כל `status: "draft"` ב-`status: GROUP_STATUS.DRAFT`
- להחליף כל `status: "active"` ב-`status: GROUP_STATUS.ACTIVE`
- להחליף כל `status: "joined"` ב-`status: MEMBER_STATUS.JOINED`
- להסיר השוואות `status === "draft"` → `status === GROUP_STATUS.DRAFT`

**קבצים לשינוי**:

- `service.ts` - שורות 219, 552, 704
- כל מקום שמשווה status למחרוזת

## שלב 8: שיפורי Naming

**שינויים**:

- `now()` → `getCurrentTimestamp()` או `getUnixTimestamp()` (למנוע בלבול עם `Date.now()`)
- להסיר `as any` ב-`firstGameRow?.fixtures as any` → type guard או type assertion נכון
- להסיר הנחות על מערכים (`groupPredictions[0]`) → בדיקות explicit

## סדר ביצוע

1. **שלב 1**: יצירת `repository.ts` והעברת queries
2. **שלב 2**: אופטימיזציה של `getMyGroups` עם batch queries (קריטי - ביצועים)
3. **שלב 3**: יצירת `permissions.ts` והחלפת `verifyGroupAccess`
4. **שלב 4**: יצירת `builders.ts` והפרדת אחריות
5. **שלב 5**: ריפקטורינג `createGroup` ⚠️ **רק אחרי ש-getMyGroups יציב**
6. **שלב 6**: אופטימיזציה של `saveGroupPredictionsBatch` (transaction + הסרת validations כפולים)
7. **שלב 7**: תיקון enums consistency
8. **שלב 8**: שיפורי naming

## קבצים שישתנו

- `apps/server/src/services/api/groups/service.ts` - יהפוך ל-orchestration בלבד
- `apps/server/src/services/api/groups/helpers.ts` - יישאר עם helpers כלליים
- `apps/server/src/services/api/groups/repository.ts` - **חדש**
- `apps/server/src/services/api/groups/builders.ts` - **חדש**
- `apps/server/src/services/api/groups/permissions.ts` - **חדש**

## הערות חשובות

- כל שלב צריך לעבוד באופן עצמאי (incremental refactoring)
- לשמור על backward compatibility - ה-API לא משתנה
- לבדוק כל שלב לפני מעבר לשלב הבא
- `getMyGroups` הוא השיפור הקריטי ביותר (ביצועים)