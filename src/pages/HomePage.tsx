import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader.js';

const services = [
  ['✦', 'AI Health Assistant', 'Get instant guidance'],
  ['▣', 'Appointments', 'Book with trusted doctors'],
  ['⌬', 'Diagnostics', 'Check your health'],
  ['▤', 'Medicines', 'Order & get delivered'],
  ['▥', 'Health Records', 'Access your reports'],
  ['◌', 'Wellness', 'Track your well-being'],
  ['♙', 'Doctors', 'Find the right specialist'],
  ['♧', 'Emergency Support', 'Help when you need it most'],
];

function Ecosystem() {
  return (
    <section className="ecosystem wrap" id="about">
      {/* Column 1 — Intelligence Layer copy */}
      <div className="eco-copy">
        <div className="eyebrow">THE INTELLIGENCE LAYER</div>
        <h2>
          A Connected Healthcare
          <br />
          Ecosystem
        </h2>
        <p>
          Bringing together patients, doctors, hospitals, diagnostics and more — powered by AI, for
          better decisions and healthier lives.
        </p>
        <button className="outline eco-btn" type="button">
          Learn More <span>→</span>
        </button>
      </div>

      {/* Column 2 — Orbit diagram */}
      <div className="orbit">
        <div className="orbit-ring ring1" />
        <div className="orbit-ring ring2" />
        <div className="orbit-core">
          <div className="mini-logo">✦</div>
        </div>
        <div className="orbit-node n1">
          <b>♙</b>
          <span>Patients</span>
        </div>
        <div className="orbit-node n2">
          <b>♧</b>
          <span>Doctors</span>
        </div>
        <div className="orbit-node n3">
          <b>▥</b>
          <span>Hospitals</span>
        </div>
        <div className="orbit-node n4">
          <b>⚗</b>
          <span>Diagnostics</span>
        </div>
        <div className="orbit-node n5">
          <b>◉</b>
          <span>Pharmacies</span>
        </div>
      </div>

      {/* Column 3 — AI Companion text (matches reference's "YOUR AI COMPANION" section) */}
      <div className="ai-companion-copy">
        <div className="eyebrow">YOUR AI COMPANION</div>
        <h2>
          A little intelligence,
          <br />
          whenever you need it.
        </h2>
        <p>
          Talk, type or speak — MANVIA AI is here 24/7 to listen, guide and support you.
        </p>
        <button className="primary small" type="button">
          Try AI Assistant <span>→</span>
        </button>
      </div>

      {/* Column 4 — AI Chat card */}
      <div className="assistant-card">
        <div className="assistant-main">
          <div className="assistant-title">
            <img src="/manvia-ai-avatar.png" alt="MANVIA AI" className="assistant-logo" />
            <div className="assistant-info">
              <b>MANVIA AI</b>
              <small>
                <i /> Online
              </small>
            </div>
            <button className="assistant-close" type="button" aria-label="Close">×</button>
          </div>

          <div className="chat-messages">
            <div className="chat-row bot">
              <img src="/manvia-ai-avatar.png" alt="" className="chat-avatar" />
              <div className="bubble bot">Hello! How are you feeling today?</div>
            </div>

            <div className="chat-row user">
              <div className="bubble user">I've been feeling tired lately.</div>
            </div>

            <div className="chat-row bot">
              <img src="/manvia-ai-avatar.png" alt="" className="chat-avatar" />
              <div className="bubble bot">
                I can help you understand what you're experiencing and guide you toward the next step.
              </div>
            </div>
          </div>

          <div className="chat-input-wrap">
            <button className="chat-mic-btn" type="button" aria-label="Voice input">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </button>
            <div className="chat-input">
              <span>Type a message...</span>
              <span className="chat-send-icon">↗</span>
            </div>
          </div>
        </div>

        <div className="assistant-side">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <small>Text Chat</small>
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <small>Voice</small>
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <small>Always On</small>
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <small>Safe &amp; Supportive</small>
          </span>
        </div>
      </div>
    </section>
  );
}

function Modes() {
  const modes = [
    ['Guest Mode', 'Explore MANVIA and learn more about our services.', 'mode-guest.jpg', '♙'],
    ['User Mode', 'Your personal health and wellness journey.', 'mode-user.jpg', '♧'],
    ['EMP Mode', 'Healthcare operations and patient management.', 'mode-emp.jpg', '♙'],
    ['Admin Mode', 'Platform management, users, security and more.', 'mode-admin.jpg', '♢'],
  ];
  return (
    <section className="modes wrap" id="everyone">
      <div className="modes-intro">
        <div className="eyebrow">ONE PLATFORM. FOUR WAYS TO CONNECT.</div>
        <h2>Choose Your Mode</h2>
        <p>
          Whether you're a patient, healthcare staff, organization admin or just exploring — MANVIA
          is here for you.
        </p>
        <a href="#features">Learn More →</a>
      </div>
      {modes.map((m, i) => (
        <div className="mode-card" key={m[0]}>
          <div
            className="mode-image"
            style={{ backgroundImage: `url('/${m[2]}')` }}
          />
          <div className="mode-content">
            <div className={`mode-icon i${i}`}>{m[3]}</div>
            <h3>{m[0]}</h3>
            <p>{m[1]}</p>
            <button aria-label={m[0]} type="button">
              →
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}

function Services() {
  const navigate = useNavigate();
  return (
    <section className="services wrap" id="features">
      <div className="service-heading">
        <div className="eyebrow">HEALTHCARE SERVICES FOR</div>
        <h2>
          Healthcare Services for
          <br />
          Every Need
        </h2>
        <p>From everyday wellness to urgent care, MANVIA AI supports you at every step.</p>
        <a href="#features">View All Services →</a>
      </div>
      <div className="service-grid">
        {services.map(([ico, title, sub]) => (
          <div className="service-item" key={title}>
            <div className="service-icon">{ico}</div>
            <div>
              <b>{title}</b>
              <span>{sub}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="trust-banner">
        <div>
          <div className="eyebrow">FOR A HEALTHIER TOMORROW</div>
          <h2>
            Trusted. Secure.
            <br />
            Human.
          </h2>
          <p>Because your health, safety and privacy matter to us.</p>
          <button className="primary" onClick={() => navigate('/login')} type="button">
            Get Started <span>→</span>
          </button>
        </div>
        <div className="banner-person" />
      </div>
    </section>
  );
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <AppHeader />
      <main id="home">
        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="hero">
          <div className="hero-inner">
            {/* LEFT: text content */}
            <div className="hero-copy">
              <div className="eyebrow pill">INTELLIGENCE FOR BETTER HEALTH</div>
              <h1>
                Your health journey,
                <br />
                with <em>intelligence that cares.</em>
              </h1>
              <p>
                MANVIA connects people, healthcare professionals and intelligent healthcare services
                in one trusted experience.
              </p>
              <div className="hero-actions">
                <button className="primary" onClick={() => navigate('/login')} type="button">
                  Get Started <span>→</span>
                </button>
                <button
                  className="outline"
                  onClick={() => navigate('/wellness')}
                  type="button"
                  aria-label="Open Wellness Hub"
                >
                  Explore MANVIA AI <span>→</span>
                </button>
              </div>
              <div className="trust-points">
                <span>
                  ⚙{' '}
                  <b>
                    AI-Powered
                    <br />
                    Support
                  </b>
                </span>
                <i />
                <span>
                  ♢{' '}
                  <b>
                    Trusted
                    <br />
                    Healthcare
                  </b>
                </span>
                <i />
                <span>
                  ♙{' '}
                  <b>
                    Secure &amp;
                    <br />
                    Private
                  </b>
                </span>
                <i />
                <span>
                  ♧{' '}
                  <b>
                    For All
                    <br />
                    Age Groups
                  </b>
                </span>
              </div>
            </div>

            {/* RIGHT: hero image + floating orbit overlay */}
            <div className="hero-visual">
              <div className="hero-photo" />
            </div>
          </div>
        </section>

        <Ecosystem />
        <Modes />
        <Services />
      </main>

      <footer id="contact">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <div className="footer-logo-badge">
              <img src="/manvia-logo-mark.png" alt="MANVIA" className="footer-logo-img" />
            </div>
            <div>
              <span className="footer-name">MANVIA</span>
              <span className="footer-tag">Care made simpler.</span>
            </div>
          </div>
          <div className="footer-nav">
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#everyone">For Everyone</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="social">in&nbsp;&nbsp;𝕏&nbsp;&nbsp;▶&nbsp;&nbsp;◎</div>
          <small>© 2026 MANVIA. All rights reserved.</small>
          <span>Better Care&nbsp;&nbsp;|&nbsp;&nbsp;Brighter Tomorrows</span>
        </div>
      </footer>
    </>
  );
}
