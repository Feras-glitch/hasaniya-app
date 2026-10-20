/* اختبار v78 (يشمل v77): حزمة الصوت — المراجعة، تقرير ما قبل التصدير، تصدير الفروق، معاينة الاستيراد قبل التأكيد، الملف التالف، الإعداد الأول، الترحيل، ولوحة الصف */
const { chromium } = require('playwright');
const path = require('path');
const os = require('os');
const fs = require('fs');
(async () => {
  const dir = path.join(os.tmpdir(), 'hasaniya-v78'); fs.mkdirSync(dir, { recursive: true });
  const zipPath = path.join(dir, 'pack.zip');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto((process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html'));
  await p.waitForTimeout(800);
  await p.evaluate(() => { const u = getCurrentUser(); if (u && !u.gender) { u.gender = 'boy'; saveState(); } closePopup('userEditorPopup'); });
  const R = {};
  R.ids = await p.evaluate(() => ({
    verse: content.journeyData[0].verses[0].id,
    storyVerse: content.journeyData.flatMap(s => s.verses).find(x => x.story).id
  }));
  await p.evaluate(async (ids) => {
    vpSetAuthor('الأستاذ أحمد');
    await pvUpload('verse', ids.verse, new File([new Uint8Array(3000).fill(9)], 'v.mp3', { type: 'audio/mpeg' }));
    await pvUpload('story', ids.storyVerse, new File([new Uint8Array(2000).fill(4)], 's.m4a', { type: 'audio/mp4' }));
    await vpToggleReviewed('verse', ids.verse);
  }, R.ids);
  // تقرير ما قبل التصدير: مراجَع فقط افتراضياً، فالقصة غير المراجعة تُستثنى
  R.planReviewed = await p.evaluate(async () => (await vpPlanExport({ onlyReviewed: true, deltaOnly: false })).selected.length);
  R.planAll = await p.evaluate(async () => (await vpPlanExport({ onlyReviewed: false, deltaOnly: false })).selected.length);
  await p.evaluate(() => exportVoicePack());
  R.reportOpen = await p.evaluate(() => document.getElementById('vpExportPopup').classList.contains('active'));
  R.reportText = await p.evaluate(() => document.getElementById('vpReportBody').textContent);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => vpDoExport())]);
  await dl.saveAs(zipPath);
  R.zipHeader = fs.readFileSync(zipPath).subarray(0, 2).toString();
  R.exportClosed = await p.evaluate(() => !document.getElementById('vpExportPopup').classList.contains('active'));
  // الفروق فقط: بعد تصدير المراجَع يبقى غير المراجَع جديداً (القصة) فيظهر تسجيل واحد
  R.deltaSelected = await p.evaluate(async () => (await vpPlanExport({ onlyReviewed: false, deltaOnly: true })).selected.length);
  // المسح ثم الاستيراد عبر معاينة ثم تأكيد
  await p.evaluate(async () => { for (const r of await vpAllAuthorRecs()) await recDelete(r.key); });
  R.afterClear = await p.evaluate(async () => (await vpAllAuthorRecs()).length);
  await p.evaluate(() => openVoiceImport());
  await p.setInputFiles('#vpImportFile', zipPath);
  await p.waitForTimeout(500);
  R.beforeCommitCount = await p.evaluate(async () => (await vpAllAuthorRecs()).length);
  R.previewText = await p.evaluate(() => document.getElementById('vpPreview').textContent);
  R.commitVisible = await p.evaluate(() => getComputedStyle(document.getElementById('vpCommitBtn')).display !== 'none');
  await p.evaluate(() => vpCommitVoicePacks());
  await p.waitForTimeout(300);
  R.afterCommit = await p.evaluate(async (ids) => ({
    verse: !!(await recGet(authorKey('verse', ids.verse))),
    story: !!(await recGet(authorKey('story', ids.storyVerse)))
  }), R.ids);
  R.reviewedKept = await p.evaluate(async (ids) => !!(await recGet(authorKey('verse', ids.verse))).reviewed, R.ids);
  R.importedAuthor = await p.evaluate(() => vpPref('importedAuthor'));
  // نص تغيّر: البصمة لا تطابق، فيُرفض التشغيل
  R.staleRejected = await p.evaluate(async (ids) => {
    const rec = await recGet(authorKey('verse', ids.verse));
    await recPut(Object.assign({}, rec, { fp: '00000000' }));
    const v = vpFindVerse(ids.verse);
    const ok = (await authorRecFor('verse', v)) === null && vpIsStale(await recGet(authorKey('verse', ids.verse)), 'verse', v);
    await recPut(rec);
    return ok;
  }, R.ids);
  // ملف تالف يظهر في المعاينة ولا يُستورد
  await p.evaluate(() => openVoiceImport());
  fs.writeFileSync(path.join(dir, 'bad.zip'), 'not a zip at all');
  await p.setInputFiles('#vpImportFile', path.join(dir, 'bad.zip'));
  await p.waitForTimeout(300);
  R.badPreview = await p.evaluate(() => document.getElementById('vpPreview').textContent);
  R.badCommitHidden = await p.evaluate(() => getComputedStyle(document.getElementById('vpCommitBtn')).display === 'none');
  // الإعداد الأول
  R.onboard = await p.evaluate(() => {
    const u = getCurrentUser(); u.gender = null; saveState();
    const pr = getPrefs(); delete pr.onboarded; localStorage.setItem(PREFS_KEY, JSON.stringify(pr));
    maybeOnboard();
    return { open: document.getElementById('userEditorPopup').classList.contains('active'),
      title: document.getElementById('userEditorTitle').textContent, nameEmpty: document.getElementById('userNameInput').value === '' };
  });
  // ترحيل المفاتيح القديمة
  R.migrated = await p.evaluate(async () => {
    const uid = activeUserId;
    await recPut({ key: uid + '|pverse|s1v2', verseId: 's1v2', kind: 'upload', uid, mime: 'audio/mpeg', blob: new Blob([new Uint8Array(900)]), at: 5 });
    const pr = getPrefs(); delete pr.voiceKeysV2; localStorage.setItem(PREFS_KEY, JSON.stringify(pr));
    await migrateVoiceKeys();
    return !!(await recGet(authorKey('verse', 's1v2'))) && (await recGet(uid + '|pverse|s1v2')) === null;
  });
  // لوحة الصف: تقرير صالح يُقبل، وملف غير تقرير يُتجاهل
  fs.writeFileSync(path.join(dir, 'rep1.json'), JSON.stringify({ exportedAt: new Date().toISOString(), user: { name: 'ليلى', avatar: '🌸' },
    mastery: { percent: 72, stars: 3, level: 'x' }, points: 50, streak: 2, totalTimeMinutes: 30, completedStations: 4, totalStations: 10, achievements: [], mistakes: [] }));
  fs.writeFileSync(path.join(dir, 'other.json'), '{"hello":1}');
  // نسخة احتياطية بطفلين: فيها صورة وتوقيع يجب ألا يظهرا في اللوحة، وأبيات متعثرة يجب أن تظهر
  const verseId = await p.evaluate(() => content.journeyData[0].verses[0].id);
  fs.writeFileSync(path.join(dir, 'backup.json'), JSON.stringify({ app: 'hasaniya', format: 1, exportedAt: new Date().toISOString(),
    users: [
      { id: 'a1', name: 'نور', avatar: '🌟', gender: 'girl', photo: 'data:image/png;base64,AAAA', parentSig: 'data:image/png;base64,AAAA',
        state: { stationStatus: { x: 'completed' }, mistakes: { [verseId + '|w']: { word: 'w', verseId, level: 0 } }, verseStats: {}, points: 40, streak: 2, totalTimeSeconds: 900, achievements: {} } },
      { id: 'a2', name: 'يوسف', avatar: '🦁', gender: 'boy', photo: null, parentSig: null, state: { stationStatus: {}, mistakes: {}, verseStats: {}, points: 0 } }
    ] }));
  await p.evaluate(() => openClassDashboard());
  await p.setInputFiles('#dashFiles', [path.join(dir, 'rep1.json'), path.join(dir, 'other.json'), path.join(dir, 'backup.json')]);
  await p.waitForFunction(() => typeof dashRows !== 'undefined' && dashRows.length >= 3, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(200);
  R.dash = await p.evaluate(() => ({ rows: dashRows.length, summary: document.getElementById('dashSummary').textContent,
    hasName: document.getElementById('dashBody').textContent.includes('ليلى'),
    noPhoto: dashRows.every(r => !('photo' in r) && !('parentSig' in r)),
    noorHasWeak: dashRows.find(r => r.name === 'نور').weak.length === 1 }));
  await p.evaluate(() => { document.getElementById('dashSort').value = 'name'; renderDashboard(); });
  await p.evaluate(() => dashShow(dashSorted.findIndex(r => r.name === 'نور')));
  R.detailText = await p.evaluate(() => document.getElementById('dashDetail').textContent);
  R.pageErrors = errs;
  await b.close();
  console.log(JSON.stringify(R, null, 2));
  const ok = R.reportOpen && R.planReviewed === 1 && R.planAll === 2 && /مراجَع|جديد|سيُرسل|سيُرسل الآن/.test(R.reportText)
    && R.zipHeader === 'PK' && R.exportClosed && R.deltaSelected === 1
    && R.afterClear === 0 && R.beforeCommitCount === 0 && R.commitVisible && /جديد: 1/.test(R.previewText)
    && R.afterCommit.verse && !R.afterCommit.story && R.reviewedKept && R.importedAuthor === 'الأستاذ أحمد'
    && R.staleRejected && /ليس ملف zip/.test(R.badPreview) && R.badCommitHidden
    && R.onboard.open && R.onboard.title.includes('أهلاً') && R.onboard.nameEmpty && R.migrated
    && R.dash.rows === 3 && R.dash.hasName && R.dash.noPhoto && R.dash.noorHasWeak && /تعثّر 1/.test(R.detailText) && errs.length === 0;
  if (!ok) { console.error('FAIL'); process.exit(1); }
  console.log('v78: ok');
})().catch(e => { console.error(e); process.exit(1); });
