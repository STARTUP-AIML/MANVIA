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
        <button className="outline" type="button">
          Learn More <span>→</span>
        </button>
      </div>
      <div className="orbit">
        <div className="orbit-ring ring1"></div>
        <div className="orbit-ring ring2"></div>
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
      <div className="assistant-card">
        <div className="assistant-title">
          <div className="mini-logo">✦</div>
          <div>
            <b>MANVIA AI</b>
            <small>
              <i /> Online
            </small>
          </div>
          <span>×</span>
        </div>
        <div className="bubble bot">Hello! How are you feeling today?</div>
        <div className="bubble user">I've been feeling tired lately.</div>
        <div className="bubble bot">
          I can help you understand what you're experiencing and guide you toward the next step.
        </div>
        <div className="chat-input">
          Type a message... <b>↗</b>
        </div>
        <div className="assistant-side">
          <span>
            ▣<small>Text Chat</small>
          </span>
          <span>
            ◉<small>Voice</small>
          </span>
          <span>
            ◷<small>Always On</small>
          </span>
          <span>
            ♢<small>Safe & Supportive</small>
          </span>
        </div>
      </div>
    </section>
  );
}

function Modes() {
  const modes = [
    ['Guest Mode', 'Explore MANVIA and learn more about our services.', 'mode-user.jpg', '♙'],
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
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(255,255,255,.96),rgba(255,255,255,.12)),url('/${m[2]}')`,
            }}
          ></div>
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
        <h2>Every Need</h2>
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
          <h2>Trusted. Secure. Human.</h2>
          <p>Because your health, safety and privacy matter to us.</p>
          <button className="primary" onClick={() => navigate('/login')} type="button">
            Get Started <span>→</span>
          </button>
        </div>
        <div className="banner-person"></div>
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
        <section className="hero">
          <div className="hero-inner wrap">
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
                <button className="primary" onClick={() => navigate('/wellness')} type="button">
                  Open Wellness Hub <span>→</span>
                </button>
                <button
                  className="outline"
                  onClick={() => navigate('/health-timeline')}
                  type="button"
                >
                  Health Timeline <span>▶</span>
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
                    Secure &<br />
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
            <div className="hero-visual">
              <div className="hero-photo"></div>
              <div className="hero-glow"></div>
              <div className="hero-orbit">
                <div className="hero-center">
                  <div className="mini-logo big">✦</div>
                </div>
                <span className="hero-node hn1">
                  ♙<small>Patient</small>
                </span>
                <span className="hero-node hn2">
                  ♧<small>Doctor</small>
                </span>
                <span className="hero-node hn3">
                  ▥<small>Hospital</small>
                </span>
                <span className="hero-node hn4">
                  ⚗<small>Diagnostics</small>
                </span>
                <span className="hero-node hn5">
                  ◉<small>Pharmacy</small>
                </span>
              </div>
              <div className="hero-bubble">
                Healthier
                <br />
                <b>Happier</b>
                <br />
                Together <span>♥</span>
              </div>
            </div>
          </div>
        </section>
        <Ecosystem />
        <Modes />
        <Services />
      </main>
      <footer id="contact">
        <div className="wrap footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', color: '#ffbe28' }}>☀</span>
            <span style={{ fontWeight: 800, fontSize: '15px' }}>MANVIA</span>
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
