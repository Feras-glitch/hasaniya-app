/* اختبار v75: صوت الوالد — فتح المركز، رفع ملف، الرفض لغير الصوت، الحذف، وقائمة الأبيات والقصص */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto((process.env.HASANIYA_URL || 'file:///home/claude/hasaniya-desktop/standalone/hasaniya.html'));
  await p.waitForTimeout(800);
  const R = {};
  await p.evaluate(() => openParentVoice());
  await p.waitForTimeout(400);
  R.verseRows = await p.evaluate(() => document.querySelectorAll('#pvBody .rec-row').length);
  R.totals = await p.evaluate(() => ({
    verses: content.journeyData.reduce((s, st) => s + st.verses.length, 0),
    stories: content.journeyData.reduce((s, st) => s + st.verses.filter(v => v.story).length, 0)
  }));
  await p.evaluate(() => { document.getElementById('pvStation').value = '3'; renderParentVoice(); });
  await p.waitForTimeout(300);
  R.station3Verses = await p.evaluate(() => document.querySelectorAll('#pvBody .rec-row').length);
  R.station3Expected = await p.evaluate(() => content.journeyData[3].verses.length);
  await p.evaluate(() => { document.getElementById('pvKind').value = 'story'; renderParentVoice(); });
  await p.waitForTimeout(400);
  R.storyRows = await p.evaluate(() => { document.getElementById('pvStation').value = '3'; return 0; });
  await p.waitForTimeout(200);
  R.storyRows = await p.evaluate(() => document.querySelectorAll('#pvBody .rec-row').length);
  await p.evaluate(() => { document.getElementById('pvKind').value = 'verse'; renderParentVoice(); });
  await p.waitForTimeout(300);
  // رفض ملف غير صوتي
  R.rejectsText = await p.evaluate(async () => {
    await pvUpload('verse', 's1v1', new File(['hello'], 'note.txt', { type: 'text/plain' }));
    return (await recGet(pvKey('verse', 's1v1'))) === null;
  });
  // قبول ملف صوتي ثم عرضه وحذفه
  R.acceptsAudio = await p.evaluate(async () => {
    await pvUpload('verse', 's1v1', new File([new Uint8Array(5000)], 'voice.mp3', { type: 'audio/mpeg' }));
    const rec = await recGet(pvKey('verse', 's1v1'));
    return !!rec && rec.source === 'upload';
  });
  await p.waitForTimeout(300);
  R.countAfterUpload = await p.evaluate(() => document.getElementById('pvCount').textContent);
  // الأولوية: صوت الوالد للبيت يُستعمل قبل القراءة الآلية (نتحقق من أن playVerseAndStory يقرأ المفتاح)
  R.priorityKeyUsed = await p.evaluate(() => playVerseAndStory.toString().includes('authorRecFor'));
  await p.evaluate(async () => { const orig = window.confirm; window.confirm = () => true; await pvDelete('verse', 's1v1'); window.confirm = orig; });
  R.deleted = await p.evaluate(async () => (await recGet(pvKey('verse', 's1v1'))) === null);
  R.pageErrors = errs;
  await b.close();
  console.log(JSON.stringify(R, null, 2));
  const ok = R.totals.verses === 161 && R.totals.stories === 150 && R.station3Verses === R.station3Expected && R.rejectsText && R.acceptsAudio
    && R.priorityKeyUsed && R.deleted && errs.length === 0;
  if (!ok) { console.error('FAIL'); process.exit(1); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
