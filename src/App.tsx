import { FormEvent, createContext, useContext, useEffect, useReducer, useState } from "react";
import { HashRouter, Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  Accessibility,
  Activity,
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Cross,
  HeartPulse,
  Languages,
  LayoutDashboard,
  MapPinned,
  Menu,
  QrCode,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type QueueState = "BOOKED" | "WAITING" | "CALLED" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED";
type Booking = { id: string; name: string; department: string; token: number; slot: string; payment: "SUCCESS" | "COUNTER" | "FAILED"; state: QueueState; source: "Online" | "Counter" };
type Emergency = { id: string; category: string; eta: string; assistance: string; note: string; state: string; assigned: string; checks: string[]; created: number; transport?: string; location?: string; callback?: string; opsNote?: string; updated?: number };
type Assist = { id: string; type: string; name: string; state: string; assigned: string };
type Department = { name: string; floor: string; room: string; status: string; doctor: string; landmark: string; lift: string; directions: string };
type AppState = { bookings: Booking[]; emergencies: Emergency[]; assistance: Assist[]; departments: Department[]; notifications: string[] };
type Action = { type: string; payload?: any };

const departments: Department[] = [
  { name: "General OPD", floor: "Ground Floor", room: "G-12", status: "Consulting", doctor: "On duty", landmark: "Beside registration counter", lift: "Available", directions: "Enter through the main entrance and continue past reception. General OPD is on the left." },
  { name: "Emergency Department", floor: "Ground Floor", room: "E-01", status: "Consulting", doctor: "Emergency team on duty", landmark: "Red emergency entrance", lift: "Not required", directions: "Use the clearly marked emergency entrance beside the ambulance bay." },
  { name: "Laboratory", floor: "First Floor", room: "108", status: "Consulting", doctor: "Services active", landmark: "Opposite pharmacy", lift: "Available", directions: "Take the main lift to Floor 1, turn right and follow Laboratory signs." },
  { name: "Orthopaedics", floor: "Second Floor", room: "207", status: "Temporarily delayed", doctor: "Delayed by 15 min", landmark: "Near X-ray", lift: "Available", directions: "Take Lift A to Floor 2, turn left at X-ray and continue to Room 207." },
  { name: "Dental OPD", floor: "Third Floor", room: "305", status: "Consulting", doctor: "On duty", landmark: "Near waiting lounge", lift: "Available", directions: "Take Lift A to Floor 3 and follow the blue Dental OPD signs." },
  { name: "Dermatology", floor: "Fourth Floor", room: "412", status: "Consulting", doctor: "On duty", landmark: "Near the laboratory collection point", lift: "Available", directions: "From the main entrance, take Lift A to Floor 4, then follow Dermatology signs near the laboratory." },
];
const checklist = ["Receiving team notified", "Transfer assistance prepared", "Receiving area checked", "Equipment and supplies checked", "Clinical personnel notified", "Arrival confirmed"];
const departmentImages: Record<string, string> = {
  "General OPD": "https://images.unsplash.com/photo-1777269749032-d8d458ae594d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
  "Emergency Department": "https://images.unsplash.com/photo-1778151270886-f227700b0eba?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
  Laboratory: "https://images.unsplash.com/photo-1778151270886-f227700b0eba?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
  Orthopaedics: "https://images.unsplash.com/photo-1777269749032-d8d458ae594d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
  "Dental OPD": "https://images.unsplash.com/photo-1551601651-bc60f254d532?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
  Dermatology: "https://images.unsplash.com/photo-1778151270886-f227700b0eba?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=1200",
};
const routeImages = {
  entrance: "https://images.unsplash.com/photo-1565262353342-6e919eab5b58?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=900",
  corridor: "https://images.unsplash.com/photo-1777269749032-d8d458ae594d?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=900",
  waiting: "https://images.unsplash.com/photo-1581982231900-6a1a46b744c9?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=82&w=900",
};
const seed: AppState = {
  bookings: [
    { id: "AF-24031", name: "Demo Patient A", department: "General OPD", token: 14, slot: "09:30–10:00", payment: "SUCCESS", state: "WAITING", source: "Online" },
    { id: "AF-24029", name: "Demo Patient B", department: "General OPD", token: 12, slot: "09:00–09:30", payment: "COUNTER", state: "IN_CONSULTATION", source: "Counter" },
    { id: "AF-24030", name: "Demo Patient C", department: "General OPD", token: 13, slot: "09:00–09:30", payment: "SUCCESS", state: "CALLED", source: "Online" },
    { id: "AF-18018", name: "Demo Patient D", department: "Dermatology", token: 8, slot: "10:30–11:00", payment: "SUCCESS", state: "COMPLETED", source: "Online" },
  ],
  emergencies: [{ id: "ER-1064", category: "Road accident or serious injury", eta: "12 min", assistance: "Stretcher", note: "Synthetic training alert", state: "ACKNOWLEDGED", assigned: "Emergency desk", checks: ["Receiving team notified"], created: Date.now() - 480000, transport: "Private vehicle", location: "Approx. 4 km away", callback: "98••• ••210", updated: Date.now() - 120000 }],
  assistance: [{ id: "AS-302", type: "Wheelchair assistance", name: "Demo Visitor", state: "REQUESTED", assigned: "" }],
  departments,
  notifications: ["General OPD booking AF-24031 is confirmed.", "Token G-14 has 1 eligible patient ahead."],
};
const Store = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

function reducer(state: AppState, action: Action): AppState {
  const notify = (message: string, next: AppState) => ({ ...next, notifications: [message, ...next.notifications].slice(0, 20) });
  switch (action.type) {
    case "ADD_BOOKING": return notify(`Booking ${action.payload.id} confirmed.`, { ...state, bookings: [...state.bookings, action.payload] });
    case "BOOKING_STATE": return notify(`${action.payload.id} updated to ${action.payload.state.replaceAll("_", " ").toLowerCase()}.`, { ...state, bookings: state.bookings.map((b) => b.id === action.payload.id ? { ...b, state: action.payload.state } : b) });
    case "ADD_EMERGENCY": return notify(`Emergency demo alert ${action.payload.id} created. It has not yet been acknowledged.`, { ...state, emergencies: [action.payload, ...state.emergencies] });
    case "UPDATE_EMERGENCY": return notify(`Emergency alert ${action.payload.id} was updated by demo operations.`, { ...state, emergencies: state.emergencies.map((e) => e.id === action.payload.id ? { ...e, ...action.payload.patch, updated: Date.now() } : e) });
    case "TOGGLE_CHECK": return { ...state, emergencies: state.emergencies.map((e) => e.id === action.payload.id ? { ...e, checks: e.checks.includes(action.payload.item) ? e.checks.filter((x) => x !== action.payload.item) : [...e.checks, action.payload.item] } : e) };
    case "ADD_ASSIST": return { ...state, assistance: [action.payload, ...state.assistance] };
    case "UPDATE_ASSIST": return { ...state, assistance: state.assistance.map((a) => a.id === action.payload.id ? { ...a, ...action.payload.patch } : a) };
    case "UPDATE_DEPARTMENT": return { ...state, departments: state.departments.map((d) => d.name === action.payload.name ? { ...d, ...action.payload.patch } : d) };
    case "RESET": return seed;
    default: return state;
  }
}

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, seed, (initial) => {
    try { return JSON.parse(localStorage.getItem("arogyaflow-demo") || "") || initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem("arogyaflow-demo", JSON.stringify(state)), [state]);
  useEffect(() => {
    const sync = (event: StorageEvent) => event.key === "arogyaflow-demo" && location.reload();
    addEventListener("storage", sync); return () => removeEventListener("storage", sync);
  }, []);
  return <Store.Provider value={{ state, dispatch }}>{children}</Store.Provider>;
}
function useStore() { const value = useContext(Store); if (!value) throw new Error("Store missing"); return value; }

const statusClass = (s: string) => s.includes("COMPLETE") || s === "Consulting" || s === "Available" || s === "PREPARED" ? "status green" : s.includes("UNAVAILABLE") || s === "FAILED" || s === "CANCELLED" ? "status red" : s.includes("ACKNOWLEDGED") || s === "CALLED" || s === "IN_CONSULTATION" ? "status blue" : "status amber";
const label = (s: string) => s.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Logo() {
  return <Link to="/" className="logo"><span className="logo-mark"><Cross size={18} strokeWidth={3} /></span><span>Arogya<span>Flow</span><small>Better Flow. Better Care.</small></span></Link>;
}
function Shell({ role, children }: { role?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { state, dispatch } = useStore();
  return <div className="shell">
    <header><Logo /><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Menu /></button>
      <nav className={open ? "open" : ""}>
        <NavLink to="/patient">Patient portal</NavLink><NavLink to="/operations">Hospital ops</NavLink><NavLink to="/facilities">Facilities</NavLink>
      </nav>
      <div className="header-actions"><Link to="/patient/notifications" className="icon-button" aria-label="Notifications"><Bell size={20} /><b>{state.notifications.length}</b></Link><button className="ghost" onClick={() => dispatch({ type: "RESET" })}><RotateCcw size={16} /> Reset demo</button></div>
    </header>
    <div className="demo-banner"><ShieldCheck size={16} /> Demonstration only — synthetic data, simulated payments and alerts. No real hospital is contacted.</div>
    {role && <div className="rolebar"><span>{role}</span><Link to="/">Switch demo role</Link></div>}
    <main>{children}</main>
    <footer>ArogyaFlow prototype · Local browser storage only · Not a deployed or approved hospital system</footer>
  </div>;
}

function Home() {
  return <Shell><section className="welcome">
    <div className="welcome-copy"><span className="eyebrow">SMART HOSPITAL COORDINATION</span><h1>Care journeys without the confusion.</h1><p>Book OPD visits, follow live queues, prepare teams before emergency arrival, and find your way through the hospital.</p>
      <div className="safety"><CircleAlert /><span><b>Life-threatening emergency?</b> Call emergency services at <b>112</b> or go directly to emergency care. Never wait for an app response.</span></div>
    </div>
    <div className="role-grid">
      <RoleCard to="/patient" icon={<UserRound />} title="Patient & family" text="Bookings, live queue, emergency alerts and directions" />
      <RoleCard to="/operations" icon={<Stethoscope />} title="Hospital operations" text="Reception, OPD queues and emergency preparation" />
      <RoleCard to="/facilities" icon={<Building2 />} title="Facilities & assistance" text="Accessibility requests, lifts and department locations" />
    </div>
  </section></Shell>;
}
function RoleCard({ to, icon, title, text }: { to: string; icon: React.ReactNode; title: string; text: string }) {
  return <Link to={to} className="role-card"><span className="role-icon">{icon}</span><div><h2>{title}</h2><p>{text}</p><span className="text-link">Open dashboard <ArrowRight size={16} /></span></div></Link>;
}

function PatientHome() {
  const { state } = useStore(); const active = state.bookings.filter((b) => !["COMPLETED", "CANCELLED"].includes(b.state));
  const lastEmergency = state.emergencies[0];
  const [language, setLanguage] = useState<"en" | "ml" | "hi" | "ta">("en");
  const copy = {
    en: { hello: "NAMASKARAM", heading: "How can we help today?", book: "Book an OPD visit", bookSub: "Choose a department and time slot", emergency: "Emergency pre-arrival", emergencySub: "Alert the demo receiving team", find: "Find a department", findSub: "Floor-wise directions and landmarks", assist: "Request assistance", assistSub: "Wheelchair, escort or route support", visits: "Your active visits", another: "Book another department", latest: "Latest emergency alert" },
    ml: { hello: "നമസ്കാരം", heading: "ഇന്ന് ഞങ്ങൾ എങ്ങനെ സഹായിക്കും?", book: "ഒ.പി.ഡി സന്ദർശനം ബുക്ക് ചെയ്യുക", bookSub: "വിഭാഗവും സമയവും തിരഞ്ഞെടുക്കുക", emergency: "അടിയന്തര മുൻകൂർ അറിയിപ്പ്", emergencySub: "ഡെമോ സ്വീകരണ ടീമിനെ അറിയിക്കുക", find: "വിഭാഗം കണ്ടെത്തുക", findSub: "നില തിരിച്ചുള്ള വഴികളും അടയാളങ്ങളും", assist: "സഹായം അഭ്യർത്ഥിക്കുക", assistSub: "വീൽചെയർ, എസ്കോർട്ട് അല്ലെങ്കിൽ വഴി സഹായം", visits: "നിങ്ങളുടെ സജീവ സന്ദർശനങ്ങൾ", another: "മറ്റൊരു വിഭാഗം ബുക്ക് ചെയ്യുക", latest: "ഏറ്റവും പുതിയ അടിയന്തര അറിയിപ്പ്" },
    hi: { hello: "नमस्कार", heading: "आज हम आपकी कैसे सहायता कर सकते हैं?", book: "ओपीडी विज़िट बुक करें", bookSub: "विभाग और समय चुनें", emergency: "आपातकालीन पूर्व-सूचना", emergencySub: "डेमो रिसीविंग टीम को सूचित करें", find: "विभाग खोजें", findSub: "मंज़िल के अनुसार दिशा और पहचान-चिह्न", assist: "सहायता का अनुरोध करें", assistSub: "व्हीलचेयर, एस्कॉर्ट या मार्ग सहायता", visits: "आपकी सक्रिय विज़िट", another: "दूसरा विभाग बुक करें", latest: "नवीनतम आपातकालीन अलर्ट" },
    ta: { hello: "வணக்கம்", heading: "இன்று நாங்கள் உங்களுக்கு எப்படி உதவலாம்?", book: "புறநோயாளர் வருகையை முன்பதிவு செய்யுங்கள்", bookSub: "துறை மற்றும் நேரத்தைத் தேர்ந்தெடுக்கவும்", emergency: "அவசர முன்வருகை அறிவிப்பு", emergencySub: "டெமோ வரவேற்புக் குழுவிற்கு அறிவிக்கவும்", find: "துறையைக் கண்டறியுங்கள்", findSub: "தளம் வாரியான வழிகள் மற்றும் அடையாளங்கள்", assist: "உதவி கோருங்கள்", assistSub: "சக்கர நாற்காலி, வழிகாட்டி அல்லது பாதை உதவி", visits: "உங்கள் செயலில் உள்ள வருகைகள்", another: "மற்றொரு துறையை முன்பதிவு செய்யுங்கள்", latest: "சமீபத்திய அவசர எச்சரிக்கை" },
  }[language];
  return <Shell role="Patient portal"><section className="page-head"><div><span className="eyebrow">{copy.hello}</span><h1>{copy.heading}</h1><p>ArogyaFlow Demo Government Hospital</p></div><label className="language"><Languages size={18} /><span className="sr-only">Patient portal language</span><select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "ml" | "hi" | "ta")}><option value="en">English</option><option value="ml">മലയാളം</option><option value="hi">हिन्दी</option><option value="ta">தமிழ்</option></select></label></section>
    <section className="action-grid"><Link className="action primary" to="/patient/book"><CalendarDays /><b>{copy.book}</b><span>{copy.bookSub}</span><ChevronRight /></Link><Link className="action emergency" to="/patient/emergency"><HeartPulse /><b>{copy.emergency}</b><span>{copy.emergencySub}</span><ChevronRight /></Link><Link className="action" to="/patient/directory"><MapPinned /><b>{copy.find}</b><span>{copy.findSub}</span><ChevronRight /></Link><Link className="action" to="/patient/assistance"><Accessibility /><b>{copy.assist}</b><span>{copy.assistSub}</span><ChevronRight /></Link></section>
    {active.length > 0 && <section><SectionTitle title={copy.visits} action={<Link to="/patient/book">{copy.another}</Link>} /><div className="cards">{active.map((b) => <BookingCard key={b.id} booking={b} />)}</div></section>}
    {lastEmergency && <section><SectionTitle title={copy.latest} /><EmergencyCard emergency={lastEmergency} patient /></section>}
  </Shell>;
}
function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) { return <div className="section-title"><h2>{title}</h2>{action}</div>; }
function BookingCard({ booking }: { booking: Booking }) {
  const { state } = useStore(); const dept = state.departments.find((d) => d.name === booking.department)!;
  const eligible = state.bookings.filter((b) => b.department === booking.department && ["WAITING", "CALLED"].includes(b.state) && b.token < booking.token).length;
  return <article className="card booking-card"><div className="card-top"><span className="token">{booking.department.charAt(0)}-{booking.token}</span><span className={statusClass(booking.state)}>{label(booking.state)}</span></div><h3>{booking.department}</h3><p>{dept.floor} · Room {dept.room} · {booking.slot}</p><div className="queue-strip"><div><small>PATIENTS AHEAD</small><b>{eligible}</b></div><div><small>ESTIMATED WAIT</small><b>{eligible * 8}–{eligible * 8 + 10} min</b></div><div><small>DOCTOR</small><b>{dept.doctor}</b></div></div><div className="card-actions"><Link className="button" to={`/patient/booking/${booking.id}`}>View live status</Link><Link className="secondary button" to={`/patient/directory?department=${encodeURIComponent(booking.department)}`}>Directions</Link></div></article>;
}

function Book() {
  const { state, dispatch } = useStore(); const nav = useNavigate(); const [step, setStep] = useState(1); const [name, setName] = useState(""); const [department, setDepartment] = useState("General OPD"); const [slot, setSlot] = useState("10:00–10:30"); const [payment, setPayment] = useState<Booking["payment"]>("SUCCESS"); const [error, setError] = useState("");
  const submit = () => { if (!name.trim()) return setError("Enter a synthetic demo patient name."); const token = Math.max(0, ...state.bookings.filter((b) => b.department === department).map((b) => b.token)) + 1; const id = `AF-${Math.floor(10000 + Math.random() * 89999)}`; dispatch({ type: "ADD_BOOKING", payload: { id, name, department, token, slot, payment, state: payment === "FAILED" ? "BOOKED" : "WAITING", source: "Online" } }); nav(`/patient/booking/${id}`); };
  return <Shell role="Patient portal"><div className="narrow"><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow">STEP {step} OF 3</span><h1>Book an OPD visit</h1><div className="stepper"><i className="done" /><i className={step >= 2 ? "done" : ""} /><i className={step >= 3 ? "done" : ""} /></div>
    {step === 1 && <div className="panel form"><label>Hospital<select><option>ArogyaFlow Demo Government Hospital</option></select></label><label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}>{state.departments.filter((d) => !d.name.includes("Emergency")).map((d) => <option key={d.name}>{d.name}</option>)}</select></label><div className="info"><Clock3 /> Average service time is configured as 8 minutes. Wait times are estimates.</div><button className="button wide" onClick={() => setStep(2)}>Continue to patient details</button></div>}
    {step === 2 && <div className="panel form"><label>Demo patient name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Use a synthetic name" /></label><label>Available slot<select value={slot} onChange={(e) => setSlot(e.target.value)}><option>10:00–10:30</option><option>10:30–11:00</option><option>11:00–11:30</option></select></label>{error && <p className="error">{error}</p>}<button className="button wide" onClick={() => name.trim() ? setStep(3) : setError("Enter a synthetic demo patient name.")}>Review payment</button></div>}
    {step === 3 && <div className="panel"><div className="summary"><span>{department}</span><b>{slot}</b><span>Configured OPD fee</span><b>₹0</b></div><div className="form"><label>Demo payment status<select value={payment} onChange={(e) => setPayment(e.target.value as Booking["payment"])}><option value="SUCCESS">Simulate successful payment</option><option value="COUNTER">Pay at hospital counter</option><option value="FAILED">Simulate failed payment</option></select></label><p className="muted">No real transaction occurs. Government hospital fees vary by policy.</p>{payment === "FAILED" && <p className="error">Demo payment failed. You may choose payment at counter to continue with a valid queue entry.</p>}<button className="button wide" onClick={submit}>Confirm demo booking</button></div></div>}
  </div></Shell>;
}

function BookingDetail() {
  const { state } = useStore(); const id = location.hash.split("/").pop(); const b = state.bookings.find((x) => x.id === id);
  if (!b) return <Shell role="Patient portal"><Empty title="Booking not found" text="Check the reference or return to patient home." /></Shell>;
  const dept = state.departments.find((d) => d.name === b.department)!;
  return <Shell role="Patient portal"><div className="detail-grid"><section><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow">LIVE APPOINTMENT</span><h1>{b.department}</h1><div className="big-token"><small>YOUR TOKEN</small><b>{b.department[0]}-{b.token}</b><span className={statusClass(b.state)}>{label(b.state)}</span></div><BookingCard booking={b} /><div className="info"><Activity /><span>Status last updated just now. Queue time is an estimate, not a guarantee.</span></div></section><aside className="qr-card"><QRCodeSVG value={b.id} size={180} /><h2>{b.id}</h2><p>QR contains only this booking reference.</p><dl><dt>Payment</dt><dd>{label(b.payment)}</dd><dt>Check-in</dt><dd>{b.state === "BOOKED" ? "Not checked in" : "Confirmed"}</dd><dt>Location</dt><dd>{dept.floor}, {dept.room}</dd></dl></aside></div></Shell>;
}

function EmergencyForm() {
  const { dispatch } = useStore(); const nav = useNavigate(); const [category, setCategory] = useState("Snakebite or suspected venomous bite"); const [eta, setEta] = useState("15 min"); const [assistance, setAssistance] = useState("Stretcher"); const [note, setNote] = useState(""); const [transport, setTransport] = useState("Private vehicle"); const [location, setLocation] = useState(""); const [callback, setCallback] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const id = `ER-${Math.floor(1000 + Math.random() * 8999)}`; dispatch({ type: "ADD_EMERGENCY", payload: { id, category, eta, assistance, note, transport, location: location || "Location not provided", callback: callback ? `${callback.slice(0, 2)}••• ••${callback.slice(-3)}` : "Not provided", state: "UNACKNOWLEDGED", assigned: "", checks: [], created: Date.now(), updated: Date.now() } }); nav(`/patient/emergency/${id}`); };
  return <Shell role="Patient portal"><div className="narrow"><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow red-text">EMERGENCY PRE-ARRIVAL</span><h1>Help the receiving team prepare</h1><div className="safety"><CircleAlert /><span><b>Do not wait for this alert.</b> For life-threatening emergencies, call <b>112</b> or go directly to emergency care.</span></div><div className="emergency-notice"><ShieldCheck /><span><b>This is not diagnosis or triage.</b> Report only what you know. Authorized hospital staff must verify needs and resources.</span></div><form className="panel form" onSubmit={submit}><label>Destination hospital<select><option>ArogyaFlow Demo Government Hospital</option></select></label><label>Reported emergency category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Snakebite or suspected venomous bite</option><option>Road accident or serious injury</option><option>Severe breathing difficulty</option><option>Suspected stroke or cardiac emergency</option><option>Other emergency</option></select></label><div className="two"><label>Estimated arrival<select value={eta} onChange={(e) => setEta(e.target.value)}><option>5 min</option><option>10 min</option><option>15 min</option><option>30 min</option><option>Unknown</option></select></label><label>Arrival mode<select value={transport} onChange={(e) => setTransport(e.target.value)}><option>Private vehicle</option><option>Ambulance already arranged</option><option>Auto / taxi</option><option>Walking in</option><option>Unknown</option></select></label></div><div className="two"><label>Approximate current location<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Example: Near Central Junction" /></label><label>Callback number (optional)<input inputMode="tel" value={callback} onChange={(e) => setCallback(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit demo number" /></label></div><label>Assistance needed<select value={assistance} onChange={(e) => setAssistance(e.target.value)}><option>Stretcher</option><option>Wheelchair</option><option>Transfer team guidance</option><option>None requested</option></select></label><label>Short relevant note (optional)<textarea maxLength={180} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Example: patient arriving with family. Do not enter identity documents or detailed medical history." /><small>{note.length}/180 characters</small></label><label className="consent-check"><input required type="checkbox" /><span>I understand this demo alert does not contact emergency services or guarantee resources.</span></label><button className="button danger wide">Send demo pre-arrival alert</button></form></div></Shell>;
}
function EmergencyTrack() {
  const { state } = useStore(); const id = location.hash.split("/").pop(); const e = state.emergencies.find((x) => x.id === id);
  if (!e) return <Shell role="Patient portal"><Empty title="Alert not found" text="Return to patient home and try again." /></Shell>;
  return <Shell role="Patient portal"><div className="narrow"><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow red-text">EMERGENCY ALERT {e.id}</span><h1>{e.category}</h1><EmergencyCard emergency={e} patient /><div className="alert-timeline"><h2>Alert timeline</h2><div className="timeline-item complete"><Check /><span><b>Alert created</b><small>Demo record created {new Date(e.created).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></span></div><div className={`timeline-item ${e.state !== "UNACKNOWLEDGED" ? "complete" : ""}`}>{e.state !== "UNACKNOWLEDGED" ? <Check /> : <Clock3 />}<span><b>Hospital acknowledgement</b><small>{e.state === "UNACKNOWLEDGED" ? "Waiting for demo operations staff" : `Recorded · assigned to ${e.assigned || "operations team"}`}</small></span></div><div className={`timeline-item ${["ARRIVED", "HANDOVER_COMPLETE"].includes(e.state) ? "complete" : ""}`}>{["ARRIVED", "HANDOVER_COMPLETE"].includes(e.state) ? <Check /> : <Clock3 />}<span><b>Arrival and handover</b><small>{e.state === "HANDOVER_COMPLETE" ? "Demo handover complete" : "Not yet recorded"}</small></span></div></div><div className="safety"><CircleAlert /><span><b>{e.state === "UNACKNOWLEDGED" ? "Not yet acknowledged by hospital." : "Continue directly to emergency care."}</b> This demo alert does not contact real staff. Call 112 or the hospital directly when needed.</span></div></div></Shell>;
}
function EmergencyCard({ emergency: e, patient = false }: { emergency: Emergency; patient?: boolean }) {
  return <article className="card emergency-card"><div className="card-top"><b>{e.id}</b><span className={statusClass(e.state)}>{label(e.state)}</span></div><h3>{e.category}</h3><div className="emergency-facts"><span><small>ETA</small><b>{e.eta}</b></span><span><small>ARRIVAL</small><b>{e.transport || "Unknown"}</b></span><span><small>ASSISTANCE</small><b>{e.assistance}</b></span><span><small>LOCATION</small><b>{e.location || "Not provided"}</b></span></div><div className="progress"><i style={{ width: `${(e.checks.length / checklist.length) * 100}%` }} /></div><small>{e.checks.length} of {checklist.length} preparation checks confirmed by demo staff</small>{e.assigned && <p><b>Assigned:</b> {e.assigned}</p>}{e.opsNote && <p className="ops-note"><b>Operations update:</b> {e.opsNote}</p>}{patient && e.state === "UNACKNOWLEDGED" && <p className="error">No hospital acknowledgement has been recorded. Call 112 or the hospital directly; do not wait.</p>}</article>;
}

function AssistanceForm() {
  const { dispatch } = useStore(); const [done, setDone] = useState(false); const [type, setType] = useState("Wheelchair assistance");
  return <Shell role="Patient portal"><div className="narrow"><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow">ACCESSIBILITY</span><h1>Request assistance</h1>{done ? <div className="success panel"><Check /><h2>Request submitted</h2><p>Facilities staff can now assign available support. Assistance is not guaranteed until confirmed.</p><Link className="button" to="/patient">Return home</Link></div> : <form className="panel form" onSubmit={(e) => { e.preventDefault(); dispatch({ type: "ADD_ASSIST", payload: { id: `AS-${Math.floor(100 + Math.random() * 899)}`, type, name: "Current demo patient", state: "REQUESTED", assigned: "" } }); setDone(true); }}><label>Assistance type<select value={type} onChange={(e) => setType(e.target.value)}><option>Wheelchair assistance</option><option>Escort to a department</option><option>Accessible route or lift support</option><option>Communication support</option><option>Other assistance</option></select></label><button className="button wide">Submit request</button></form>}</div></Shell>;
}
function Directory() {
  const { state } = useStore(); const params = new URLSearchParams(location.hash.split("?")[1]); const [selected, setSelected] = useState(params.get("department") || state.departments[0].name); const dept = state.departments.find((d) => d.name === selected)!;
  return <Shell role="Patient portal"><div className="directory-layout"><aside><span className="eyebrow">HOSPITAL DIRECTORY</span><h1>Find your way</h1><div className="directory-list">{state.departments.map((d) => <button className={selected === d.name ? "selected" : ""} onClick={() => setSelected(d.name)} key={d.name}><span>{d.name}<small>{d.floor} · {d.room}</small></span><ChevronRight /></button>)}</div></aside><section className="map-card"><span className="eyebrow">DESTINATION</span><h2>{dept.name}</h2><p className="location">{dept.floor} · Room {dept.room}</p>
    <div className="photo-journey" aria-label="Illustrative visual route">
      <figure><img src={routeImages.entrance} alt="Illustrative hospital entrance and reception area" /><figcaption><b>1</b><span><strong>Main entrance</strong>Start near reception</span></figcaption></figure>
      <figure><img src={routeImages.corridor} alt="Illustrative hospital corridor with room doors" /><figcaption><b>2</b><span><strong>Floor corridor</strong>Follow department signs</span></figcaption></figure>
      <figure><img src={departmentImages[dept.name] || routeImages.waiting} alt={`Illustrative area outside ${dept.name}`} /><figcaption><b>3</b><span><strong>Room area</strong>Confirm {dept.room}</span></figcaption></figure>
    </div>
    <div className="simple-map"><div className="map-heading"><span><MapPinned /><b>Simple route map</b></span><small>Not to scale · illustrative layout</small></div><div className="floor-plan"><div className="map-path path-one" /><div className="map-path path-two" /><div className="map-room entrance-room"><b>1</b><span>Main<br />entrance</span></div><div className="map-room reception-room">Reception</div><div className="map-room lift-room"><b>2</b><span>{dept.floor === "Ground Floor" ? "Main corridor" : "Lift A"}</span></div><div className="map-room destination-room"><b>3</b><span>{dept.name}<small>{dept.room}</small></span></div></div><div className="map-legend"><span><i className="start-dot" />Start</span><span><i className="route-line" />Suggested route</span><span><i className="end-dot" />Destination</span></div></div>
    <div className="visual-cue"><Building2 /><span><small>WHAT TO LOOK FOR</small><b>{dept.landmark}</b></span></div><div className="route-step"><b>1</b><span><strong>Start at main entrance</strong>Follow the reception and lift signs.</span></div><div className="route-step"><b>2</b><span><strong>Continue to {dept.floor}</strong>{dept.directions}</span></div><div className="route-step"><b>3</b><span><strong>Confirm the room before entering</strong>Look for the {dept.name} sign and room number <b>{dept.room}</b>. Ask reception if the displayed room differs.</span></div><div className="access-row"><Accessibility /><span><small>LIFT / ACCESSIBLE ROUTE</small><b>{dept.lift || "Status not verified"}</b></span><span className={statusClass(dept.lift)}>{dept.lift || "Unverified"}</span></div><p className="muted">Photos are real healthcare interiors used only as visual examples. They are not verified images of this fictional demo hospital. Confirm the room number and signs on arrival.</p></section></div></Shell>;
}

function Operations() {
  const { state, dispatch } = useStore(); const [tab, setTab] = useState("queue"); const [query, setQuery] = useState(""); const [found, setFound] = useState<Booking | null | undefined>(); const waiting = state.bookings.filter((b) => ["WAITING", "CALLED", "IN_CONSULTATION"].includes(b.state));
  const callNext = (dept: string) => { const next = state.bookings.filter((b) => b.department === dept && b.state === "WAITING").sort((a, b) => a.token - b.token)[0]; if (next) dispatch({ type: "BOOKING_STATE", payload: { id: next.id, state: "CALLED" } }); };
  return <Shell role="Hospital operations"><section className="page-head"><div><span className="eyebrow">OPERATIONS OVERVIEW</span><h1>Good morning, demo team</h1><p>Shared queue and emergency coordination workspace</p></div><span className="status green">System demo active</span></section><div className="stats"><Stat icon={<UsersRound />} value={waiting.length} label="Active queue" /><Stat icon={<HeartPulse />} value={state.emergencies.filter((e) => e.state !== "HANDOVER_COMPLETE").length} label="Emergency alerts" /><Stat icon={<Clock3 />} value="8 min" label="Avg. service time" /></div><div className="tabs"><button onClick={() => setTab("queue")} className={tab === "queue" ? "active" : ""}>OPD queues</button><button onClick={() => setTab("lookup")} className={tab === "lookup" ? "active" : ""}>QR / booking lookup</button><button onClick={() => setTab("walkin")} className={tab === "walkin" ? "active" : ""}>Walk-in registration</button><button onClick={() => setTab("emergency")} className={tab === "emergency" ? "active" : ""}>Emergency alerts</button></div>
    {tab === "queue" && <div className="panel"><div className="panel-head"><div><h2>General OPD queue</h2><p>Online and counter registrations in one queue</p></div><button className="button" onClick={() => callNext("General OPD")}>Call next patient</button></div><div className="table">{state.bookings.filter((b) => b.department === "General OPD").sort((a,b) => a.token-b.token).map((b) => <div className="tr" key={b.id}><b>G-{b.token}</b><span>{b.name}<small>{b.id} · {b.source}</small></span><span className={statusClass(b.state)}>{label(b.state)}</span><select value={b.state} onChange={(e) => dispatch({ type: "BOOKING_STATE", payload: { id: b.id, state: e.target.value } })}><option>BOOKED</option><option>WAITING</option><option>CALLED</option><option>IN_CONSULTATION</option><option>COMPLETED</option><option>CANCELLED</option></select></div>)}</div></div>}
    {tab === "lookup" && <div className="panel lookup"><QrCode size={48} /><h2>Scan or enter booking reference</h2><p>Camera scanning can be added in production. Manual fallback works in this prototype.</p><div className="search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. AF-24031" /><button className="button" onClick={() => setFound(state.bookings.find((b) => b.id.toLowerCase() === query.trim().toLowerCase()))}><Search size={18} /> Look up</button></div>{found === null || found === undefined && query && <p className="error">No booking found. Check the reference and try again.</p>}{found && <div className="result"><BookingCard booking={found} /><button className="button" disabled={found.state !== "BOOKED"} onClick={() => dispatch({ type: "BOOKING_STATE", payload: { id: found.id, state: "WAITING" } })}>{found.state === "BOOKED" ? "Confirm check-in" : `Already ${label(found.state)}`}</button></div>}</div>}
    {tab === "walkin" && <WalkIn />}
    {tab === "emergency" && <div className="cards">{state.emergencies.map((e) => <EmergencyManage key={e.id} emergency={e} />)}</div>}
  </Shell>;
}
function Stat({ icon, value, label: text }: { icon: React.ReactNode; value: React.ReactNode; label: string }) { return <div className="stat"><span>{icon}</span><div><b>{value}</b><small>{text}</small></div></div>; }
function WalkIn() {
  const { state, dispatch } = useStore(); const [name, setName] = useState(""); const [department, setDepartment] = useState("General OPD"); const [created, setCreated] = useState<Booking | null>(null);
  return <form className="panel form" onSubmit={(e) => { e.preventDefault(); if (!name) return; const token = Math.max(0, ...state.bookings.filter((b) => b.department === department).map((b) => b.token)) + 1; const b: Booking = { id: `CT-${Math.floor(10000 + Math.random() * 89999)}`, name, department, token, slot: "Walk-in", payment: "COUNTER", state: "WAITING", source: "Counter" }; dispatch({ type: "ADD_BOOKING", payload: b }); setCreated(b); }}><h2>Register walk-in patient</h2><p>Minimum synthetic information only. Smartphone or online payment is not required.</p><div className="two"><label>Demo patient name<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}>{state.departments.filter((d) => !d.name.includes("Emergency")).map((d) => <option key={d.name}>{d.name}</option>)}</select></label></div><button className="button">Issue counter token</button>{created && <div className="success"><Check /><b>Token {created.department[0]}-{created.token} issued</b><span>{created.id} joined the shared queue.</span></div>}</form>;
}
function EmergencyManage({ emergency: e }: { emergency: Emergency }) {
  const { dispatch } = useStore(); const [opsNote, setOpsNote] = useState(e.opsNote || "");
  const patch = (p: Partial<Emergency>) => dispatch({ type: "UPDATE_EMERGENCY", payload: { id: e.id, patch: p } });
  return <article className="panel emergency-manage"><div className="card-top"><div><span className="eyebrow">{e.id} · ETA {e.eta}</span><h2>{e.category}</h2></div><span className={statusClass(e.state)}>{label(e.state)}</span></div><div className="emergency-facts staff-facts"><span><small>ARRIVAL MODE</small><b>{e.transport || "Unknown"}</b></span><span><small>LOCATION</small><b>{e.location || "Not provided"}</b></span><span><small>CALLBACK</small><b>{e.callback || "Not provided"}</b></span><span><small>REQUESTED</small><b>{e.assistance}</b></span></div>{e.note && <p className="reported-note"><b>Reported note:</b> {e.note}</p>}<p>Created {Math.max(1, Math.round((Date.now() - e.created) / 60000))} min ago · Last operational update {e.updated ? new Date(e.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "not recorded"}</p><div className="button-row"><button className="button" disabled={e.state !== "UNACKNOWLEDGED"} onClick={() => patch({ state: "ACKNOWLEDGED" })}>Acknowledge receipt</button><button className="secondary button" onClick={() => patch({ state: "ESCALATION_REQUIRED" })}>Flag escalation required</button><select value={e.assigned} onChange={(x) => patch({ assigned: x.target.value, state: "PREPARATION_IN_PROGRESS" })}><option value="">Assign responsible role</option><option>Emergency desk</option><option>Duty nursing lead</option><option>Transfer team</option></select><select value={e.eta} onChange={(x) => patch({ eta: x.target.value })}><option>5 min</option><option>10 min</option><option>15 min</option><option>30 min</option><option>Unknown</option></select></div><label className="ops-update">Operational update<textarea value={opsNote} onChange={(x) => setOpsNote(x.target.value)} placeholder="Example: receiving bay being checked; no resource promise made." /><button type="button" className="secondary button" onClick={() => patch({ opsNote })}>Share update with patient</button></label><h3>Preparation checklist</h3><div className="checklist">{checklist.map((item) => <label key={item}><input type="checkbox" checked={e.checks.includes(item)} onChange={() => dispatch({ type: "TOGGLE_CHECK", payload: { id: e.id, item } })} /><span>{item}<small>{e.checks.includes(item) ? "Confirmed by Demo Operations · just now" : "Not confirmed"}</small></span></label>)}</div><div className="button-row"><button className="secondary button" onClick={() => patch({ state: "RESOURCE_UNAVAILABLE" })}>Record resource unavailable</button><button className="button" onClick={() => patch({ state: "ARRIVED" })}>Mark arrived</button><button className="button" disabled={e.state !== "ARRIVED"} onClick={() => patch({ state: "HANDOVER_COMPLETE" })}>Complete handover</button></div></article>;
}

function Facilities() {
  const { state, dispatch } = useStore(); const [tab, setTab] = useState("assistance");
  return <Shell role="Facilities & assistance"><section className="page-head"><div><span className="eyebrow">FACILITIES CONTROL</span><h1>Routes and assistance</h1><p>Updates appear immediately in the patient portal.</p></div></section><div className="tabs"><button className={tab === "assistance" ? "active" : ""} onClick={() => setTab("assistance")}>Assistance requests</button><button className={tab === "directory" ? "active" : ""} onClick={() => setTab("directory")}>Department directory</button></div>
    {tab === "assistance" ? <div className="panel table">{state.assistance.map((a) => <div className="tr" key={a.id}><b>{a.id}</b><span>{a.type}<small>{a.name}</small></span><span className={statusClass(a.state)}>{label(a.state)}</span><select value={a.assigned} onChange={(e) => dispatch({ type: "UPDATE_ASSIST", payload: { id: a.id, patch: { assigned: e.target.value, state: e.target.value ? "ASSIGNED" : "REQUESTED" } } })}><option value="">Unassigned</option><option>Attendant A</option><option>Mobility support desk</option></select><select value={a.state} onChange={(e) => dispatch({ type: "UPDATE_ASSIST", payload: { id: a.id, patch: { state: e.target.value } } })}><option>REQUESTED</option><option>ASSIGNED</option><option>IN_PROGRESS</option><option>COMPLETED</option><option>UNAVAILABLE</option></select></div>)}</div> :
    <div className="cards">{state.departments.map((d) => <article className="panel facility-card" key={d.name}><div className="card-top"><h2>{d.name}</h2><span className={statusClass(d.lift)}>{d.lift || "Status not verified"}</span></div><div className="two"><label>Floor<input value={d.floor} onChange={(e) => dispatch({ type: "UPDATE_DEPARTMENT", payload: { name: d.name, patch: { floor: e.target.value } } })} /></label><label>Room<input value={d.room} onChange={(e) => dispatch({ type: "UPDATE_DEPARTMENT", payload: { name: d.name, patch: { room: e.target.value } } })} /></label></div><label>Landmark<input value={d.landmark} onChange={(e) => dispatch({ type: "UPDATE_DEPARTMENT", payload: { name: d.name, patch: { landmark: e.target.value } } })} /></label><label>Lift / route status<select value={d.lift} onChange={(e) => dispatch({ type: "UPDATE_DEPARTMENT", payload: { name: d.name, patch: { lift: e.target.value } } })}><option>Available</option><option>Unavailable</option><option>Status not verified</option><option>Temporary obstruction</option></select></label></article>)}</div>}
  </Shell>;
}
function Notifications() { const { state } = useStore(); return <Shell role="Patient portal"><div className="narrow"><Link className="back" to="/patient">← Patient home</Link><span className="eyebrow">IN-APP UPDATES</span><h1>Notifications</h1><div className="panel notification-list">{state.notifications.map((n, i) => <div key={i}><span><Bell size={18} /></span><p>{n}<small>{i ? "Earlier in this demo" : "Just now"} · In-app only</small></p></div>)}</div><div className="info"><Bell /><span><b>WhatsApp not configured.</b> In production, connect an approved provider and obtain consent. No message delivery is simulated here.</span></div></div></Shell>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><CircleAlert /><h1>{title}</h1><p>{text}</p><Link className="button" to="/">Return home</Link></div>; }

export default function App() {
  return <StoreProvider><HashRouter><Routes>
    <Route path="/" element={<Home />} /><Route path="/patient" element={<PatientHome />} /><Route path="/patient/book" element={<Book />} /><Route path="/patient/booking/:id" element={<BookingDetail />} /><Route path="/patient/emergency" element={<EmergencyForm />} /><Route path="/patient/emergency/:id" element={<EmergencyTrack />} /><Route path="/patient/assistance" element={<AssistanceForm />} /><Route path="/patient/directory" element={<Directory />} /><Route path="/patient/notifications" element={<Notifications />} /><Route path="/operations" element={<Operations />} /><Route path="/facilities" element={<Facilities />} /><Route path="*" element={<Home />} />
  </Routes></HashRouter></StoreProvider>;
}
