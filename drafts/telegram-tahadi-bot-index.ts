// Tahadi Telegram registration + subscription bot
// Compatible with the existing Supabase tables: bot_conversations, students,
// family_payment_batches, family_payment_items, payment_receipts.
// Required secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TEACHER_CHAT_ID.
// Supabase service-role access is read from SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const TG_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const TEACHER_CHAT_ID = Deno.env.get("TEACHER_CHAT_ID") ?? "";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL") ?? "").replace(/\/$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE") ?? "";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
const tg = async (method: string, payload: Record<string, unknown>) => {
  const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !(d as any).ok) console.error(`Telegram ${method} failed`, JSON.stringify(d).slice(0, 700));
  return d as any;
};
const send = (chat_id: number | string, text: string, reply_markup?: unknown) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...(reply_markup ? { reply_markup } : {}) });
const api = async (path: string, init: RequestInit = {}) => {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase service configuration is missing");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const t = await r.text();
  let d: any = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!r.ok) throw new Error(`Supabase REST ${r.status}: ${JSON.stringify(d).slice(0, 600)}`);
  return d;
};
const rpc = (name: string, body: Record<string, unknown>) => api(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
const esc = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const keyboard = (rows: unknown[][]) => ({ inline_keyboard: rows });
const mainMenu = keyboard([[{ text: "📝 التسجيل", callback_data: "new" }], [{ text: "💳 التجديد", callback_data: "renew" }], [{ text: "📚 نتائج التلاميذ", callback_data: "results" }]]);
const serviceMenu = keyboard([[{text:"👥 اشتراك جماعي (بالشهر)",callback_data:"service:group"}],[{text:"👤 حصة فردية (بالحصة)",callback_data:"service:individual"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]);
const dateCalendar = (year:number, month:number) => { const first=new Date(Date.UTC(year,month-1,1)); const days=new Date(Date.UTC(year,month,0)).getUTCDate(); const names=["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]; const rows:any[][]=[[{text:"◀️",callback_data:`cal:${month===1?year-1:year}-${String(month===1?12:month-1).padStart(2,"0")}`},{text:`${names[month-1]} ${year}`,callback_data:"cal:noop"},{text:"▶️",callback_data:`cal:${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,"0")}`}],[{text:"إث",callback_data:"cal:noop"},{text:"ث",callback_data:"cal:noop"},{text:"أر",callback_data:"cal:noop"},{text:"خ",callback_data:"cal:noop"},{text:"ج",callback_data:"cal:noop"},{text:"س",callback_data:"cal:noop"},{text:"أح",callback_data:"cal:noop"}]]; const offset=(first.getUTCDay()+6)%7; let week:any[]=[]; for(let i=0;i<offset;i++)week.push({text:"·",callback_data:"cal:noop"}); for(let day=1;day<=days;day++){week.push({text:String(day),callback_data:`date:${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`});if(week.length===7){rows.push(week);week=[];}} if(week.length){while(week.length<7)week.push({text:"·",callback_data:"cal:noop"});rows.push(week);} rows.push([{text:"❌ إلغاء العملية",callback_data:"cancel"}]); return keyboard(rows); };
const MONTHS=[["أكتوبر 2026","نوفمبر 2026"],["ديسمبر 2026","جانفي 2027"],["فيفري 2027","مارس 2027"],["أفريل 2027","ماي 2027"],["جوان 2027","جويلية 2027"],["أوت 2027","سبتمبر 2027"]].flat();
const monthMenu = (selected:string[] = []) => { const rows:any[][]=[]; for(let i=0;i<MONTHS.length;i+=2) rows.push(MONTHS.slice(i,i+2).map(m=>({text:`${selected.includes(m)?"☑️":"⬜"} ${m}`,callback_data:`month:${m}`}))); rows.push([{text:`✅ تأكيد الأشهر (${selected.length})`,callback_data:"months_done"},{text:"❌ إلغاء",callback_data:"cancel"}]); return keyboard(rows); };
const levelPrice = (level: string, type: string) => { const l=level.replaceAll("أ","ا").replaceAll("إ","ا").replaceAll("آ","ا"); if(type==="جماعية"){if(l.includes("الاولى")||l.includes("الثانيه")||l.includes("الثانية"))return 1000;if(l.includes("الثالثة")||l.includes("الثالثه"))return 1600;if(l.includes("الرابعة")||l.includes("الرابعه"))return 2600;}else{if(l.includes("الرابعة")||l.includes("الرابعه"))return 2000;if(l.includes("الاولى")||l.includes("الثانيه")||l.includes("الثانية")||l.includes("الثالثة")||l.includes("الثالثه"))return 1500;}return 0;};

type Item = { student_id: string | null; full_name: string; phone: string; level: string; service_type: string; service_name: string; subscription_month: string | null; amount_due: number };
type State = { mode?: string; full_name?: string; phone?: string; level?: string; student_id?: string | null; items?: Item[]; pending_item?: Partial<Item>; payment_method?: string; payment_date?: string; receipt_file_id?: string; receipt_kind?: string; receipt_message_id?: number; receipt_file_ids?: string[]; receipt_message_ids?: number[]; receipt_kinds?: string[]; selected_months?: string[]; calendar_message_id?: number; matches?: any[] };
async function getState(uid: number, chat: number) {
  const rows = await api(`bot_conversations?telegram_user_id=eq.${uid}&select=*`);
  if (rows?.length) return rows[0] as any;
  await api("bot_conversations", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ telegram_user_id: uid, telegram_chat_id: chat, current_step: "start", conversation_data: {} }) });
  return { telegram_user_id: uid, telegram_chat_id: chat, current_step: "start", conversation_data: {} };
}
async function setState(uid: number, chat: number, step: string, data: State) {
  await api("bot_conversations?on_conflict=telegram_user_id", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ telegram_user_id: uid, telegram_chat_id: chat, current_step: step, conversation_data: data, updated_at: new Date().toISOString() }) });
}
async function reset(uid: number, chat: number) { await setState(uid, chat, "start", {}); }
async function beginNew(uid: number, chat: number, mode: "new" | "new_family" = "new") {
  await setState(uid, chat, "new_name", { mode, items: [] });
  await send(chat, `📝 <b>${mode === "new_family" ? "تسجيل عدة تلاميذ" : "تسجيل تلميذ جديد"}</b>\nابعثي الاسم واللقب الكامل للتلميذ:`);
}
async function beginRenew(uid: number, chat: number) {
  await setState(uid, chat, "renew_find", { mode: "renew", items: [] });
  await send(chat, "💳 <b>الاشتراك أو التجديد</b>\nابعثي اسم التلميذ أو رقم هاتفه للبحث في التلاميذ المسجلين:");
}
async function beginFamily(uid: number, chat: number) {
  await setState(uid, chat, "family_find", { mode: "family", items: [] });
  await send(chat, "👨‍👧‍👧 <b>التسجيل العائلي</b>\nاختاري التلاميذ المسجلين من قبل، واحدًا بعد الآخر. ما نحتاجوش بيانات الولي.\n\nابعثي اسم التلميذ الأول أو رقم هاتفه للبحث:");
}
async function createBatch(state: State, uid: number, chat: number, username?: string) {
  const items = state.items ?? [];
  if (!items.length || !state.receipt_file_id || !state.payment_method || !state.payment_date) throw new Error("Incomplete payment information");
  const total = items.reduce((n, x) => n + x.amount_due, 0);
  const requestType = state.mode === "new" ? "تسجيل جديد" : state.mode === "new_family" ? "تسجيل عدة تلاميذ" : state.mode === "family" ? "تجديد عائلي" : "تجديد اشتراك شهري";
  const itemRows = (batchId: string) => items.map(x => ({
    batch_id: batchId, student_id: x.student_id, full_name: x.full_name, phone: x.phone,
    level: x.level, service_type: x.service_type, service_name: x.service_name,
    subscription_month: x.subscription_month, amount_due: x.amount_due,
    amount_paid: x.amount_due, remaining_balance: 0
  }));

  // Telegram re-deliveries or a repeated confirmation must not create a second batch.
  // The receipt message's file_id is stable for this submission.
  const existing = await api(
    `family_payment_batches?select=id,amount,status,request_type&telegram_user_id=eq.${uid}&telegram_chat_id=eq.${chat}&receipt_file_id=eq.${encodeURIComponent(state.receipt_file_id)}&order=created_at.desc&limit=1`
  );
  let batch = existing?.[0];
  let createdHere = false;
  if (batch) {
    if (Number(batch.amount) !== total || batch.request_type !== requestType) {
      throw new Error("Receipt is already associated with a different payment request; manual review required");
    }
    const savedItems = await api(`family_payment_items?select=id&batch_id=eq.${batch.id}`);
    if (!savedItems?.length) {
      await api("family_payment_items", { method: "POST", body: JSON.stringify(itemRows(batch.id)), headers: { prefer: "return=minimal" } });
    } else if (savedItems.length !== items.length) {
      throw new Error("Existing request has an inconsistent number of service rows; manual review required");
    }
    // Receipt image stays in Telegram. Keep only the Telegram file_id on the batch as a technical reference.
  } else {
    const batchRows = await api("family_payment_batches?select=id,amount,status,request_type", {
      method: "POST", headers: { prefer: "return=representation" },
      body: JSON.stringify({
        telegram_user_id: uid, telegram_chat_id: chat, request_type: requestType,
        amount: total, amount_paid: total, remaining_balance: 0,
        payment_method: state.payment_method, receipt_file_id: state.receipt_file_id,
        status: "pending", payment_date: `${state.payment_date}T12:00:00+01:00`
      })
    });
    batch = batchRows?.[0];
    if (!batch?.id) throw new Error("Batch was not created");
    createdHere = true;
    try {
      await api("family_payment_items", { method: "POST", body: JSON.stringify(itemRows(batch.id)), headers: { prefer: "return=minimal" } });
    } catch (e) {
      // Best-effort compensation: do not leave a newly-created partial request.
      try { await api(`payment_receipts?batch_id=eq.${batch.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } }); } catch (cleanupError) { console.error("Receipt rollback failed", cleanupError); }
      try { await api(`family_payment_items?batch_id=eq.${batch.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } }); } catch (cleanupError) { console.error("Service-row rollback failed", cleanupError); }
      try { await api(`family_payment_batches?id=eq.${batch.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } }); } catch (cleanupError) { console.error("Batch rollback failed", cleanupError); }
      throw e;
    }
  }

  const lines = items.map((x, i) => `${i + 1}. ${esc(x.full_name)} — ${esc(x.service_name)}${x.subscription_month ? ` (${esc(x.subscription_month)})` : ""}: ${x.amount_due} دج`).join("\n");
  const note = `📥 <b>طلب دفع جديد — يحتاج موافقتك</b>\nالنوع: ${requestType}\nالمجموع: <b>${total} دج</b>\nطريقة الدفع: ${esc(state.payment_method)}\nتاريخ الدفع: ${esc(state.payment_date)}\n\n${lines}\n\nرقم الطلب: <code>${batch.id}</code>`;
  // Persist the completed request before sending Telegram notifications. A failed notification
  // must never make the user believe the database save failed or cause a duplicate payment.
  await reset(uid, chat);
  let teacherNotified = false;
  try {
    const sent = await send(TEACHER_CHAT_ID, note, keyboard([[{ text: "✅ قبول الطلب", callback_data: `review:${batch.id}:yes` }, { text: "❌ رفض الطلب", callback_data: `review:${batch.id}:no` }]]));
    teacherNotified = !!sent?.ok;
    if (!teacherNotified) console.error("Teacher notification failed after payment request saved", JSON.stringify(sent).slice(0, 500));
  } catch (e) { console.error("Teacher notification threw after payment request saved", e); }
  const receiptMessages = state.receipt_message_ids?.length ? state.receipt_message_ids : [Number(state.receipt_message_id)];
  for (let i=0;i<receiptMessages.length;i++) {
    try {
      const copied = await tg("copyMessage", { chat_id:TEACHER_CHAT_ID, from_chat_id:chat, message_id:Number(receiptMessages[i]), caption:`وصل الدفع ${i+1}/${receiptMessages.length} — ${total} دج\\nالطلب: ${batch.id}` });
      if (!copied?.ok) console.error("Receipt forwarding failed", JSON.stringify(copied).slice(0,500));
    } catch (e) { console.error("Receipt forwarding threw",e); }
  }

  const confirmation = teacherNotified
    ? "✅ تم حفظ طلبك والوصل والخدمات بنجاح، ووصل إشعار للأستاذة.\nراح توصلك رسالة بعد مراجعة الطلب."
    : "✅ تم حفظ طلبك والوصل والخدمات بنجاح. تعذر إرسال إشعار للأستاذة آليًا، لكن الطلب محفوظ؛ تواصلي معها للتأكد من المراجعة.";
  try { await send(chat, confirmation + "\n\nاختاري من القائمة إذا حبيتي عملية أخرى:", mainMenu); }
  catch (e) { console.error("User confirmation failed after request saved", e); }
  return { batch, createdHere, teacherNotified };
}
async function handleCallback(q: any) {
  const data = String(q.data ?? ""); const chat = q.message?.chat?.id; const uid = q.from?.id;
  if (q.id) await tg("answerCallbackQuery", { callback_query_id: q.id }).catch(() => null);
  if (!chat || !uid) return;
  if (data === "cancel") { await reset(uid, chat); await tg("sendMessage", {chat_id:chat,text:"تم إلغاء العملية.",reply_markup:{remove_keyboard:true}}); await send(chat, "القائمة الرئيسية — اختاري عملية واحدة:", mainMenu); return; }
  if (data === "receipt:add") { const row=await getState(uid,chat); const s=row.conversation_data as State; if (!s.receipt_file_ids?.length) return send(chat,"أرسلي أول وصل قبل إضافة وصول آخر."); await setState(uid,chat,"receipt_more",s); return send(chat,"أرسلي صورة أو ملف الوصل التالي:"); }
  if (data === "receipt:finish") {
    const row=await getState(uid,chat); const s=row.conversation_data as State;
    if (!s.receipt_file_ids?.length) return send(chat,"لازم ترسلي وصلًا واحدًا على الأقل.");
    const total=(s.items??[]).reduce((n,x)=>n+x.amount_due,0);
    const lines=(s.items??[]).map((x,i)=>`${i+1}. ${esc(x.full_name)} — ${esc(x.level)} — ${esc(x.service_name)}${x.subscription_month?` (${esc(x.subscription_month)})`:""}: ${x.amount_due} دج`).join("\n");
    await setState(uid,chat,"confirm",s);
    return send(chat,`📋 <b>مراجعة الطلب قبل الإرسال</b>\n\n${lines}\n\n<b>المجموع:</b> ${total} دج\n<b>طريقة الدفع:</b> ${esc(s.payment_method??"غير محددة")}\n<b>تاريخ الدفع:</b> ${esc(s.payment_date??"غير محدد")}\n<b>عدد الوصولات:</b> ${s.receipt_file_ids.length}\n\nإذا كان كاين خطأ، اختاري التعديل المناسب. الطلب ما يتبعتش حتى تضغطي تأكيد الإرسال.`,keyboard([[{text:"📅 تعديل تاريخ الدفع",callback_data:"edit:date"}],[{text:"💳 تعديل طريقة الدفع",callback_data:"edit:method"}],[{text:"📚 تعديل الخدمات والأشهر",callback_data:"edit:services"}],[{text:"👤 تعديل بيانات التلميذ",callback_data:"edit:student"}],[{text:"🧾 إضافة/مراجعة الوصولات",callback_data:"confirm:receipts"}],[{text:"✅ تأكيد وإرسال الطلب",callback_data:"confirm:send"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]));
  }
  if (data === "edit:date") { const row=await getState(uid,chat); const s=row.conversation_data as State; await setState(uid,chat,"payment_date",s); const current=s.payment_date?new Date(s.payment_date+"T12:00:00Z"):new Date(); return send(chat,"اختاري تاريخ الدفع الصحيح من التقويم:",dateCalendar(current.getUTCFullYear(),current.getUTCMonth()+1)); }
  if (data === "edit:method") { const row=await getState(uid,chat); const s=row.conversation_data as State; await setState(uid,chat,"payment_method",s); return send(chat,"اختاري طريقة الدفع الصحيحة:",keyboard([[{text:"BaridiMob",callback_data:"method:baridi"},{text:"CCP",callback_data:"method:ccp"}],[{text:"⬅️ رجوع للمراجعة",callback_data:"receipt:finish"}]])); }
  if (data === "edit:services") { const row=await getState(uid,chat); const s=row.conversation_data as State; s.items=[]; s.selected_months=[]; s.pending_item={}; await setState(uid,chat,"service_type",s); return send(chat,"رجعناك لاختيار الخدمات من جديد. اختاري نوع الخدمة، الأشهر وعدد الحصص، ثم راجعي الطلب قبل الإرسال:",serviceMenu); }
  if (data === "edit:student") { const row=await getState(uid,chat); const s=row.conversation_data as State; if(s.mode==="new"){ s.full_name=""; s.phone=""; s.level=""; s.items=[]; await setState(uid,chat,"new_name",s); return send(chat,"اكتبي الاسم الكامل الصحيح للتلميذ:"); } s.items=[]; if(s.mode==="family"){ s.student_id=null; s.full_name=""; s.phone=""; s.level=""; await setState(uid,chat,"family_find",s); return send(chat,"تم مسح اختيارات التلاميذ والخدمات من مسودة الطلب فقط. ابعثي اسم أول تلميذ من جديد:"); } await setState(uid,chat,"renew_find",s); return send(chat,"اكتبي اسم التلميذ أو رقم هاتفه لاختياره من جديد:"); }
  if (data === "confirm:receipts") { const row=await getState(uid,chat); const s=row.conversation_data as State; await setState(uid,chat,"receipt_more",s); return send(chat,"تقدري تزيدي وصلًا آخر أو ترجعي للمراجعة:",keyboard([[{text:"➕ إضافة وصل آخر",callback_data:"receipt:add"}],[{text:"➡️ إنهاء ومراجعة الطلب",callback_data:"receipt:finish"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]])); }
  if (data === "confirm:send") { const row=await getState(uid,chat); const s=row.conversation_data as State; if(row.current_step!=="confirm") return send(chat,"راجعي الطلب أولًا قبل الإرسال."); try { await createBatch(s,uid,chat); } catch(e) { console.error(e); return send(chat,"⚠️ تعذر حفظ الطلب. معلوماتك ما زالت محفوظة؛ حاولي لاحقًا."); } return; }
  if (data === "new") return send(chat, "📝 <b>التسجيل</b>\nاختاري نوع التسجيل:", keyboard([[{text:"👤 تسجيل تلميذ واحد",callback_data:"new:one"}],[{text:"👨‍👧‍👧 تسجيل عدة تلاميذ",callback_data:"new:multiple"}],[{text:"⬅️ القائمة الرئيسية",callback_data:"menu:main"}]]));
  if (data === "new:one") return beginNew(uid, chat, "new");
  if (data === "new:multiple") return beginNew(uid, chat, "new_family");
  if (data === "renew") return send(chat, "💳 <b>التجديد</b>\nاختاري نوع التجديد:", keyboard([[{text:"👤 تجديد تلميذ واحد",callback_data:"renew:one"}],[{text:"👨‍👧‍👧 تجديد عائلي لعدة تلاميذ مسجلين",callback_data:"renew:family"}],[{text:"⬅️ القائمة الرئيسية",callback_data:"menu:main"}]]));
  if (data === "renew:one") return beginRenew(uid, chat);
  if (data === "renew:family") return beginFamily(uid, chat);
  if (data === "menu:main") { await reset(uid, chat); return send(chat, "القائمة الرئيسية:", mainMenu); }
  if (data === "results") { await setState(uid, chat, "results_find", {}); return send(chat, "📚 <b>نتائج التلاميذ</b>\nللحفاظ على خصوصية النتائج، نعرض فقط التلاميذ المرتبطين بحساب تيليغرام هذا. اكتبي اسم التلميذ للبحث:"); }
  if (data === "family:addstudent") { const row=await getState(uid,chat); const s=row.conversation_data as State; if(s.mode!=="family" || !(s.items?.length)) return send(chat,"ابدئي التجديد العائلي من القائمة.",mainMenu); s.student_id=null; s.full_name=""; s.phone=""; s.level=""; await setState(uid,chat,"family_find",s); return send(chat,"ابعثي اسم التلميذ التالي أو رقم هاتفه للبحث في التلاميذ المسجلين:"); }
  if (data === "family:addnewstudent") { const row=await getState(uid,chat); const s=row.conversation_data as State; if(s.mode!=="new_family" || !(s.items?.length)) return send(chat,"ابدئي تسجيل عدة تلاميذ من قائمة التسجيل.",mainMenu); s.student_id=null; s.full_name=""; s.phone=""; s.level=""; s.pending_item={}; s.selected_months=[]; await setState(uid,chat,"new_name",s); return send(chat,"ابعثي الاسم واللقب الكامل للتلميذ الجديد التالي:"); }
  if (data === "results:student" || data.startsWith("results:student:")) {
    const row=await getState(uid,chat); const s=row.conversation_data as State; const index=Number(data.split(":")[2]); const student=s.matches?.[index];
    if(!student) return send(chat,"انتهى الاختيار. ابدئي البحث من جديد.",mainMenu);
    const [assessments, attendance, notes]=await Promise.all([
      api(`student_assessments?select=assessment_name,assessment_type,score,max_score,assessment_date,teacher_note&student_id=eq.${student.id}&order=assessment_date.desc&limit=20`),
      api(`student_attendance?select=attendance_date,status,note&student_id=eq.${student.id}&order=attendance_date.desc&limit=10`),
      api(`student_teacher_notes?select=note,note_date&student_id=eq.${student.id}&order=note_date.desc&limit=10`)
    ]);
    const marks=(assessments??[]).map((x:any)=>`• ${esc(x.assessment_name??"تقييم")} — ${x.score??"—"}/${x.max_score??"—"}${x.assessment_date?` (${esc(String(x.assessment_date))})`:""}${x.teacher_note?`\n  ملاحظة: ${esc(x.teacher_note)}`:""}`).join("\n")||"لا توجد نتائج مسجلة حاليًا.";
    const att=(attendance??[]).map((x:any)=>`• ${esc(String(x.attendance_date))}: ${esc(x.status)}${x.note?` — ${esc(x.note)}`:""}`).join("\n")||"لا توجد بيانات حضور مسجلة.";
    const nts=(notes??[]).map((x:any)=>`• ${x.note_date?esc(String(x.note_date))+" — ":""}${esc(x.note)}`).join("\n")||"لا توجد ملاحظات مسجلة.";
    await reset(uid,chat);
    return send(chat,`📚 <b>ملف النتائج</b>\nالتلميذ: <b>${esc(student.full_name)}</b>\nالمستوى: ${esc(student.level??"غير محدد")}\n\n<b>العلامات والنتائج</b>\n${marks}\n\n<b>الحضور والغياب</b>\n${att}\n\n<b>ملاحظات الأستاذة</b>\n${nts}`,keyboard([[{text:"📚 بحث عن تلميذ آخر",callback_data:"results"}],[{text:"🏠 القائمة الرئيسية",callback_data:"menu:main"}]]));
  }
  if(data.startsWith("level:")){const row=await getState(uid,chat);const s=row.conversation_data as State;if(row.current_step!=="new_level")return send(chat,"ابدئي تسجيل تلميذ جديد من القائمة.",mainMenu);s.level=data.slice(6);s.student_id=null;await setState(uid,chat,"service_type",s);return send(chat,`المستوى المختار: <b>${esc(s.level)}</b>\nاختاري نوع الخدمة:`,serviceMenu);}
  if(data==="service:group"||data==="service:individual"){const row=await getState(uid,chat);const s=row.conversation_data as State;const type=data==="service:group"?"جماعية":"فردية";const price=levelPrice(s.level??"",type);if(!price)return send(chat,"ما قدرتش نحدد السعر. تأكدي من المستوى الدراسي.",mainMenu);s.pending_item={service_type:type,service_name:type==="جماعية"?"اشتراك شهري":(price===2000?"حصة فردية (ساعتان)":"حصة فردية")};if(type==="جماعية"){await setState(uid,chat,"service_month",s);return send(chat,"اختاري شهر الاشتراك، وتقدري تزيدي أشهر أخرى:",monthMenu());}await setState(uid,chat,"individual_count",s);return send(chat,`سعر الحصة: <b>${price} دج</b>${price===2000?" للحصة ذات الساعتين":""}. ابعثي عدد الحصص الفردية:`);}
  if(data.startsWith("month:")){const row=await getState(uid,chat);const s=row.conversation_data as State;if(row.current_step!=="service_month")return send(chat,"ابدئي اختيار الأشهر من قائمة الاشتراك.",mainMenu);const month=data.slice(6);s.selected_months=s.selected_months??[];s.selected_months=s.selected_months.includes(month)?s.selected_months.filter(x=>x!==month):[...s.selected_months,month];await setState(uid,chat,"service_month",s);return tg("editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"حددي كل أشهر الاشتراك المطلوبة، ويمكنك تغيير اختيارك قبل التأكيد:",reply_markup:monthMenu(s.selected_months)});}
  if(data==="addmonth"){const row=await getState(uid,chat);const s=row.conversation_data as State;s.selected_months=[];await setState(uid,chat,"service_month",s);return send(chat,"حددي أشهر الاشتراك المطلوبة:",monthMenu(s.selected_months));}
  if(data==="months_done"){const row=await getState(uid,chat);const s=row.conversation_data as State;const months=s.selected_months??[];if(!months.length)return send(chat,"اختاري شهرًا واحدًا على الأقل:",monthMenu(months));const price=levelPrice(s.level??"","جماعية");if(!price)return send(chat,"تعذر تحديد السعر.",mainMenu);s.items=(s.items??[]).filter(x=>!(x.service_type==="جماعية"&&x.student_id===(s.student_id??null)&&x.full_name===(s.full_name??"")));for(const month of months)s.items.push({student_id:s.student_id??null,full_name:s.full_name??"",phone:s.phone??"",level:s.level??"",service_type:"جماعية",service_name:"اشتراك شهري",subscription_month:month,amount_due:price});s.selected_months=[];await setState(uid,chat,"more_services",s);return send(chat,`تم اختيار ${months.length} أشهر للتلميذ ${esc(s.full_name??"")}. مجموع الخدمات الحالية: <b>${s.items.reduce((n,x)=>n+x.amount_due,0)} دج</b>.`,s.mode==="family"?keyboard([[{text:"➕ خدمة أخرى لنفس التلميذ",callback_data:"addservice"}],[{text:"👧 إضافة تلميذ آخر",callback_data:"family:addstudent"}],[{text:"➡️ إنهاء واختيار الدفع",callback_data:"finishservices"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]):s.mode==="new_family"?keyboard([[{text:"➕ خدمة أخرى لنفس التلميذ",callback_data:"addservice"}],[{text:"👧 إضافة تلميذ جديد",callback_data:"family:addnewstudent"}],[{text:"➡️ إنهاء واختيار الدفع",callback_data:"finishservices"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]):keyboard([[{text:"➕ خدمة أخرى",callback_data:"addservice"}],[{text:"➡️ مراجعة الطلب",callback_data:"finishservices"}]]));}

  if (data.startsWith("student:")) {
    const index = Number(data.split(":")[1]); const row = await getState(uid, chat); const s = (row.conversation_data ?? {}) as State; const student = s.matches?.[index];
    if (!student) return send(chat, "انتهت صلاحية الاختيار. ابدئي من جديد.", mainMenu);
    const familyMode = s.mode === "family";
    s.student_id = student.id; s.full_name = student.full_name; s.phone = student.phone ?? "غير متوفر"; s.level = student.level ?? "غير محدد";
    if (!familyMode) { s.mode = "renew"; s.items = []; }
    await setState(uid, chat, "service_type", s);
    return send(chat, `${familyMode ? "👨‍👧‍👧 التلميذ المختار" : "تم اختيار"}: <b>${esc(s.full_name)}</b>\nالمستوى: ${esc(s.level)}\nاختاري نوع الخدمة:`, serviceMenu);
  }
  if (data.startsWith("method:")) {
    const row = await getState(uid, chat); const s = row.conversation_data as State; s.payment_method = data.slice(7) === "ccp" ? "CCP" : "BaridiMob";
    await setState(uid, chat, "payment_date", s); const now=new Date(); return send(chat, "اختاري تاريخ الدفع من التقويم:", dateCalendar(now.getFullYear(),now.getMonth()+1));
  }
  if(data==="cal:noop")return;
  if(data.startsWith("cal:")){const [yy,mm]=data.slice(4).split("-").map(Number);if(yy<2020||yy>2100||mm<1||mm>12)return;return tg("editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"اختاري تاريخ الدفع من التقويم. تنقلي بين الأشهر والسنوات قبل اختيار اليوم:",reply_markup:dateCalendar(yy,mm)});}
  if(data.startsWith("date:")){const date=data.slice(5);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+"T12:00:00Z")))return send(chat,"التاريخ غير صحيح. اختاريه من التقويم.");const row=await getState(uid,chat);const s=row.conversation_data as State;if(row.current_step!=="payment_date")return send(chat,"اختاري طريقة الدفع أولًا.",mainMenu);s.payment_date=date;if(s.receipt_file_ids?.length){await setState(uid,chat,"confirm",s);await tg("editMessageText",{chat_id:chat,message_id:q.message.message_id,text:`تم تعديل تاريخ الدفع إلى ${date}.`});return send(chat,"تم تعديل التاريخ. راجعي ملخص الطلب من جديد:",keyboard([[{text:"📋 مراجعة الطلب",callback_data:"receipt:finish"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]));}await setState(uid,chat,"receipt",s);await tg("editMessageText",{chat_id:chat,message_id:q.message.message_id,text:`تم اختيار تاريخ الدفع: ${date}. الآن أرسلي أول وصل، وبعدها يمكنك إضافة وصولات أخرى أو إنهاء الإضافة.`});return send(chat,"أرسلي صورة الوصل أو ملفه:");}
  if (data.startsWith("review:")) {
    const parts = data.split(":"); const id = parts[1]; const approve = parts[2] === "yes";
    if (String(chat) !== String(TEACHER_CHAT_ID)) return send(chat, "هذا الزر مخصص للأستاذة فقط.");
    const result = await rpc("review_telegram_family_batch", { p_batch_id: id, p_approve: approve, p_reviewer: "teacher" });
    const out = Array.isArray(result) ? result[0] : result;
    if (!out?.ok) return send(chat, `⚠️ تعذرت معالجة الطلب: ${esc(out?.message ?? "خطأ غير معروف")}`);
    await tg("editMessageReplyMarkup", { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    if (out.chat_id) await send(out.chat_id, approve ? "✅ تمت الموافقة على طلب الدفع والتسجيل." : "❌ تم رفض الطلب. تواصلي مع الأستاذة إذا تحتاجي توضيحًا.");
    return send(chat, approve ? `✅ تمت الموافقة على الطلب. المبلغ: ${out.total_paid ?? "—"} دج.` : "تم رفض الطلب.");
  }
}
async function handleMessage(m: any) {
  const chat = m.chat?.id; const uid = m.from?.id; if (!chat || !uid) return;
  const username = m.from?.username; const text = String(m.text ?? "").trim();
  if (text === "/resendislam" && String(uid) === "5053021872") {
    const batchId = "10c1545c-9514-4a41-bd58-de82be2be663";
    const batches = await api(`family_payment_batches?select=id,amount,status,request_type,payment_method,payment_date,receipt_file_id& id=eq.${batchId}`.replace("& id=", "&id="));
    const batch = batches?.[0];
    if (!batch) return send(chat, "❌ ما لقيتش الطلب المحفوظ. ما أنشأت حتى طلب جديد.");
    if (batch.status !== "pending") return send(chat, "ℹ️ الطلب ما عادش قيد المراجعة؛ ما بعثتش أزرار جديدة.");
    const items = await api(`family_payment_items?select=full_name,level,service_name,subscription_month,amount_due&batch_id=eq.${batchId}`);
    const lines = (items ?? []).map((x: any, i: number) => `${i+1}. ${esc(x.full_name)} — ${esc(x.level)} — ${esc(x.service_name)}${x.subscription_month ? ` (${esc(x.subscription_month)})` : ""}: ${x.amount_due} دج`).join("\\n");
    const note = `📥 <b>إعادة إرسال طلب محفوظ — يحتاج موافقتك</b>\\nالمجموع: <b>${batch.amount} دج</b>\\nطريقة الدفع: ${esc(batch.payment_method ?? "غير محددة")}\\n\\n${lines}\\n\\nرقم الطلب: <code>${batch.id}</code>\\n<i>هذا طلب موجود مسبقًا؛ لم يتم إنشاء تسجيل جديد.</i>`;
    const sent = await send(TEACHER_CHAT_ID, note, keyboard([[{text:"✅ قبول الطلب",callback_data:`review:${batch.id}:yes`},{text:"❌ رفض الطلب",callback_data:`review:${batch.id}:no`}]]));
    if (!sent?.ok) return send(chat, "❌ تعذر إرسال تفاصيل الطلب للمجموعة. راجعي Logs.");
    const receipt = await tg("sendPhoto", {chat_id: TEACHER_CHAT_ID, photo: batch.receipt_file_id, caption: `وصل الدفع — ${batch.amount} دج\\nالطلب: ${batch.id}`});
    if (!receipt?.ok) {
      console.error("Resent request but receipt photo failed", JSON.stringify(receipt).slice(0,500));
      return send(chat, "⚠️ أُعيد إرسال الطلب وأزرار المراجعة، لكن تعذر إرسال صورة الوصل. راجعي المجموعة وLogs.");
    }
    return send(chat, "✅ أُعيد إرسال الطلب المحفوظ والوصل وأزرار القبول والرفض للمجموعة. لم يتغير وضع الطلب ولم يُنشأ طلب جديد.");
  }
  if (text === "/testnotify" && String(uid) === "5053021872") {
    const test = await send(TEACHER_CHAT_ID, "🧪 <b>اختبار إشعارات منصة التحدي</b>\\nإذا وصلتك هذه الرسالة في مجموعة إدارة منصة التحدي، فوجهة الإشعار صحيحة.");
    if (test?.ok) return send(chat, "✅ تيليغرام قبل إرسال رسالة الاختبار للمجموعة. تحققي من مجموعة إدارة منصة التحدي.");
    console.error("Manual notification test failed", JSON.stringify(test).slice(0, 500));
    return send(chat, "❌ فشل إرسال الاختبار. راجعي Logs لمعرفة سبب تيليغرام.");
  }
  if (text === "/start" || text === "/menu") { await reset(uid, chat); await send(chat, "أهلًا بك في بوت منصة التحدي 20/20 🌿\nاختاري الخدمة المطلوبة:", { remove_keyboard: true }); return send(chat, "القائمة الرئيسية:", mainMenu); }
  // Normalize old persistent keyboard taps; Telegram may retain these buttons across bot deployments.
  const buttonText = text.replace(/[\\uFE0F\\u200D]/g, "").trim();
  if (buttonText.includes("التسجيل") && buttonText.includes("📝")) { await tg("sendMessage", {chat_id:chat,text:"تم تحديث القائمة. استعملي أزرار القائمة الجديدة داخل المحادثة.",reply_markup:{remove_keyboard:true}}); return beginNew(uid, chat); }
  if (buttonText.includes("الاشتراك") && !buttonText.includes("ربط")) { await tg("sendMessage", {chat_id:chat,text:"تم تحديث القائمة. استعملي أزرار القائمة الجديدة داخل المحادثة.",reply_markup:{remove_keyboard:true}}); return beginRenew(uid, chat); }
  if (buttonText.includes("نتائج التلميذ")) { await setState(uid,chat,"results_find",{}); return send(chat,"📚 <b>نتائج التلاميذ</b>\nاكتبي اسم التلميذ المرتبط بحسابك للبحث:",mainMenu); }
  if (buttonText.includes("ربط حساب ولي الأمر")) { await tg("sendMessage", {chat_id:chat,text:"تم إيقاف لوحة الأزرار القديمة. ربط حساب ولي الأمر خدمة منفصلة وتحتاج مسار الربط الصحيح؛ ما راحش نبحث عن التلميذ من هذا الزر.",reply_markup:{remove_keyboard:true}}); return send(chat, "اختاري من القائمة الرئيسية:", mainMenu); }
  if (buttonText.includes("تسجيل عائلي")) { await tg("sendMessage", {chat_id:chat,text:"تم تحديث القائمة القديمة.",reply_markup:{remove_keyboard:true}}); return beginFamily(uid, chat); }
  const row = await getState(uid, chat); const step = row.current_step; const s = (row.conversation_data ?? {}) as State;
  if (m.photo?.length || m.document?.file_id) {
    if (step !== "receipt" && step !== "receipt_more") return send(chat, "استلمت الوصل، لكن لازم نكملوا معلومات الطلب أولًا.");
    const isPhoto = !!m.photo?.length;
    const fileId = isPhoto ? m.photo[m.photo.length - 1].file_id : m.document.file_id;
    s.receipt_file_ids = s.receipt_file_ids ?? [];
    s.receipt_message_ids = s.receipt_message_ids ?? [];
    s.receipt_kinds = s.receipt_kinds ?? [];
    s.receipt_file_ids.push(fileId);
    s.receipt_message_ids.push(Number(m.message_id));
    s.receipt_kinds.push(isPhoto ? "photo" : "document");
    if (!s.receipt_file_id) { s.receipt_file_id = fileId; s.receipt_kind = isPhoto ? "photo" : "document"; s.receipt_message_id = Number(m.message_id); }
    await setState(uid, chat, "receipt_more", s);
    return send(chat, `✅ استلمت الوصل رقم ${s.receipt_file_ids.length}. تقدري تزيدي وصل آخر أو تكملي لمراجعة الطلب.`, keyboard([[{text:"➕ إضافة وصل آخر",callback_data:"receipt:add"}],[{text:"➡️ إنهاء ومراجعة الطلب",callback_data:"receipt:finish"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]));
  }
  if (step === "start") return send(chat, "اختاري من القائمة:", mainMenu);
  if (step === "results_find") {
    const term=text.trim(); if(term.length<2) return send(chat,"اكتبي اسمًا أو جزءًا من الاسم يتكوّن من حرفين على الأقل.");
    const links=await api(`guardian_student_links?select=student_id&telegram_user_id=eq.${uid}`);
    const allowed=new Set((links??[]).map((x:any)=>String(x.student_id)));
    if(!allowed.size) { await reset(uid,chat); return send(chat,"ما كاين حتى تلميذ مربوط بهذا الحساب حاليًا. تواصلي مع الأستاذة لربط الحساب قبل عرض النتائج.",mainMenu); }
    const all=await Promise.all([...allowed].map(id=>api(`students?select=id,full_name,phone,level,status&id=eq.${id}&status=eq.active`)));
    const matches=all.flat().filter((x:any)=>`${x.full_name??""} ${x.phone??""}`.toLowerCase().includes(term.toLowerCase()));
    if(!matches.length) return send(chat,"ما لقيتش تلميذًا مرتبطًا بهذا الحساب بهذا الاسم. جربي جزءًا آخر من الاسم.");
    s.matches=matches; await setState(uid,chat,"results_choose",s);
    return send(chat,"اختاري التلميذ لعرض نتائجه:",keyboard(matches.map((x:any,i:number)=>[{text:`${x.full_name} — ${x.level??"المستوى غير محدد"}`,callback_data:`results:student:${i}`}]).concat([[{text:"🏠 القائمة الرئيسية",callback_data:"menu:main"}]]));
  }
  if (step === "new_name") { s.full_name = text; await setState(uid, chat, "new_phone", s); return send(chat, "ابعثي رقم هاتف وليّ التلميذ أو رقم التواصل:"); }
  if (step === "new_phone") { s.phone = text; await setState(uid, chat, "new_level", s); return send(chat, "اختاري المستوى الدراسي للتلميذ:", keyboard([[{text:"السنة الأولى متوسط",callback_data:"level:السنة الأولى متوسط"}],[{text:"السنة الثانية متوسط",callback_data:"level:السنة الثانية متوسط"}],[{text:"السنة الثالثة متوسط",callback_data:"level:السنة الثالثة متوسط"}],[{text:"السنة الرابعة متوسط",callback_data:"level:السنة الرابعة متوسط"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]])); }
  if (step === "new_level") return send(chat, "اختاري المستوى الدراسي من الأزرار:", keyboard([[{text:"السنة الأولى متوسط",callback_data:"level:السنة الأولى متوسط"}],[{text:"السنة الثانية متوسط",callback_data:"level:السنة الثانية متوسط"}],[{text:"السنة الثالثة متوسط",callback_data:"level:السنة الثالثة متوسط"}],[{text:"السنة الرابعة متوسط",callback_data:"level:السنة الرابعة متوسط"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]));
  if (step === "renew_find" || step === "family_find") {
    const familyMode = step === "family_find" || s.mode === "family";
    const term = text.replaceAll("%", "").replaceAll(",", " ");
    const rows = await api(`students?select=id,full_name,phone,level&status=eq.active&or=(full_name.ilike.*${encodeURIComponent(term)}*,phone.ilike.*${encodeURIComponent(term)}*)&order=full_name.asc&limit=8`);
    if (!rows?.length) return send(chat, "ما لقيتش تلميذ بهذا الاسم أو الهاتف. جربي جزءًا آخر من الاسم أو رقم الهاتف.", mainMenu);
    s.matches = rows; await setState(uid, chat, familyMode ? "family_choose" : "renew_choose", s);
    return send(chat, `${familyMode ? "اختاري التلميذ الصحيح. بعد إضافة خدماته تقدري تزيدي تلميذًا آخر:" : "اختاري التلميذ الصحيح:"}`, keyboard(rows.map((x: any, i: number) => [{ text: `${x.full_name} — ${x.level ?? "المستوى غير محدد"}`, callback_data: `student:${i}` }]).concat([[{text:"❌ إلغاء العملية",callback_data:"cancel"}]])));
  }
  if (step === "service_type") return send(chat, "اختاري نوع الخدمة:", serviceMenu);
  if(step==="individual_count"){const count=Number(text),price=levelPrice(s.level??"","فردية");if(!Number.isInteger(count)||count<1||count>50||!price)return send(chat,"ابعثي عدد حصص صحيح من 1 إلى 50.");s.items=[...(s.items??[]),{student_id:s.student_id??null,full_name:s.full_name??"",phone:s.phone??"",level:s.level??"",service_type:"فردية",service_name:(price===2000?"حصة فردية (ساعتان)":"حصة فردية")+" — عدد الحصص: "+count,subscription_month:null,amount_due:count*price}];await setState(uid,chat,"more_services",s);return send(chat,`أضفت ${count} حصة للتلميذ ${esc(s.full_name??"")} بمبلغ <b>${count*price} دج</b>. المجموع الحالي: <b>${s.items.reduce((n,x)=>n+x.amount_due,0)} دج</b>.`,s.mode==="family"?keyboard([[{text:"➕ خدمة أخرى لنفس التلميذ",callback_data:"addservice"}],[{text:"👧 إضافة تلميذ آخر",callback_data:"family:addstudent"}],[{text:"➡️ إنهاء واختيار الدفع",callback_data:"finishservices"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]):s.mode==="new_family"?keyboard([[{text:"➕ خدمة أخرى لنفس التلميذ",callback_data:"addservice"}],[{text:"👧 إضافة تلميذ جديد",callback_data:"family:addnewstudent"}],[{text:"➡️ إنهاء واختيار الدفع",callback_data:"finishservices"}],[{text:"❌ إلغاء العملية",callback_data:"cancel"}]]):keyboard([[{text:"➕ خدمة أخرى",callback_data:"addservice"}],[{text:"➡️ إنهاء واختيار الدفع",callback_data:"finishservices"}]]));}
  if (step === "payment_date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T12:00:00Z`)) || new Date(`${text}T12:00:00Z`).toISOString().slice(0, 10) !== text) return send(chat, "صيغة التاريخ غير صحيحة. استعملي YYYY-MM-DD، مثال 2026-10-22:");
    s.payment_date = text; await setState(uid, chat, "receipt", s); return send(chat, "ابعثي صورة وصل الدفع أو ملف الوصل الآن:");
  }
  if (step === "confirm") {
    return send(chat, "راجعي ملخص الطلب واضغطي زر «✅ تأكيد وإرسال الطلب» إذا كانت المعلومات صحيحة. لن يُرسل الطلب بمجرد كتابة رسالة.");
  }
  return send(chat, "ما فهمتش الرسالة. استعملي الأزرار أو اكتبي /start للعودة للقائمة.", mainMenu);
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") return json({ ok: true, service: "telegram-tahadi-bot", message: "Webhook endpoint is active" });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!TG_TOKEN || !TG_SECRET || !TEACHER_CHAT_ID || !SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing one or more required secrets/config values"); return json({ ok: false, error: "Bot configuration incomplete" }, 500);
  }
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== TG_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  let update: any; try { update = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  try {
    if (update.callback_query) {
      const data = String(update.callback_query.data ?? "");
      if (data === "addservice" || data === "finishservices") {
        const q = update.callback_query; const chat = q.message?.chat?.id; const uid = q.from?.id;
        await tg("answerCallbackQuery", { callback_query_id: q.id });
        if (data === "addservice") { const row = await getState(uid, chat); const s = row.conversation_data as State; await setState(uid, chat, "service_type", s); await send(chat, `اختاري نوع الخدمة الإضافية ${s.mode==="family" ? "للتلميذ "+esc(s.full_name??"") : ""}:`, serviceMenu); }
        else { const row = await getState(uid, chat); const s = row.conversation_data as State; await setState(uid, chat, "payment_method", s); await send(chat, "اختاري طريقة الدفع:", keyboard([[{ text: "CCP", callback_data: "method:ccp" }, { text: "BaridiMob", callback_data: "method:baridi" }]])); }
      } else await handleCallback(update.callback_query);
    } else if (update.message) await handleMessage(update.message);
    return json({ ok: true });
  } catch (e) { console.error("Webhook processing error", e); return json({ ok: true }); }
});